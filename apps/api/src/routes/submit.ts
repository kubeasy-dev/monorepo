import { queryKeys } from "@kubeasy/api-schemas/query-keys";
import {
  ChallengeSubmitFailureOutputSchema,
  ChallengeSubmitSuccessOutputSchema,
  SubmitBodySchema,
} from "@kubeasy/api-schemas/submissions";
import { createQueue, QUEUE_NAMES } from "@kubeasy/jobs";
import { and, eq, ne, sql } from "drizzle-orm";
import { type Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { describeRoute, resolver, validator } from "hono-openapi";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "../db/index";
import {
  userProgress,
  userSubmission,
  userXp,
  userXpTransaction,
} from "../db/schema/index";
import { trackChallengeSubmitted } from "../lib/analytics-server";
import { cacheDelPattern } from "../lib/cache";
import { sessionOrBearerSecurity } from "../lib/openapi-shared";
import { redis } from "../lib/redis";
import { getChallenge } from "../lib/registry";
import { slidingWindowRateLimit } from "../middleware/rate-limit";
import { type AppEnv, requireAuth } from "../middleware/session";

const challengeSubmissionQueue = createQueue(
  QUEUE_NAMES.CHALLENGE_SUBMISSION,
  redis.options,
);

const slugParam = z.object({ slug: z.string() });

const submitRateLimit = slidingWindowRateLimit(redis, {
  windowMs: 10_000,
  max: 10,
  keyFn: (c: Context<AppEnv>) => `submit:${c.get("user")?.id}`,
});

export const submit = new Hono<AppEnv>().post(
  "/:slug/submit",
  describeRoute({
    tags: ["CLI", "Submissions"],
    summary: "Submit challenge validation results",
    security: sessionOrBearerSecurity,
    responses: {
      200: {
        description: "All objectives passed",
        content: {
          "application/json": {
            schema: resolver(ChallengeSubmitSuccessOutputSchema),
          },
        },
      },
      409: { description: "Challenge already completed" },
      422: {
        description: "Some objectives failed or missing/unknown objectives",
        content: {
          "application/json": {
            schema: resolver(ChallengeSubmitFailureOutputSchema),
          },
        },
      },
      404: { description: "Challenge not found" },
    },
  }),
  requireAuth,
  submitRateLimit,
  bodyLimit({ maxSize: 1024 * 1024 }), // 1 MB
  validator("param", slugParam),
  validator("json", SubmitBodySchema),
  async (c) => {
    const user = c.get("user");
    const userId = user.id;
    const { slug: challengeSlug } = c.req.valid("param");
    const { results, auditEvents } = c.req.valid("json");

    const [detail, [existingProgress]] = await Promise.all([
      getChallenge(challengeSlug),
      db
        .select({
          id: userProgress.id,
          status: userProgress.status,
          completedAt: userProgress.completedAt,
        })
        .from(userProgress)
        .where(
          and(
            eq(userProgress.userId, userId),
            eq(userProgress.challengeSlug, challengeSlug),
          ),
        )
        .limit(1),
    ]);

    if (!detail) {
      return c.json({ error: "Challenge not found" }, 404);
    }

    if (existingProgress?.status === "completed") {
      return c.json({ error: "Challenge already completed" }, 409);
    }

    const objectiveMap = new Map(
      (detail.objectives ?? []).map((o) => [o.key, o]),
    );
    const objectives = results.map((r) => {
      const obj = objectiveMap.get(r.objectiveKey);
      return {
        key: r.objectiveKey,
        title: obj?.title ?? r.objectiveKey,
        description: obj?.description,
        passed: r.passed,
        category: obj?.type ?? "status",
        message: r.message ?? "",
      };
    });

    const validated = results.every((r) => r.passed);

    const txResult = await db.transaction(async (tx) => {
      const [{ nextAttempt }] = await tx
        .select({
          nextAttempt: sql<number>`COALESCE(MAX(${userSubmission.attemptNumber}), 0) + 1`,
        })
        .from(userSubmission)
        .where(
          and(
            eq(userSubmission.userId, userId),
            eq(userSubmission.challengeSlug, challengeSlug),
          ),
        );

      try {
        await tx.insert(userSubmission).values({
          id: nanoid(),
          userId,
          challengeSlug,
          validated,
          objectives,
          attemptNumber: nextAttempt,
          auditEvents: auditEvents ?? null,
        });
      } catch (err: unknown) {
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "23505"
        ) {
          return { conflict: true, progressUpdated: false, failed: false };
        }
        throw err;
      }

      if (!validated) {
        return { conflict: false, progressUpdated: false, failed: true };
      }

      let progressUpdated: boolean;
      if (existingProgress) {
        const updated = await tx
          .update(userProgress)
          .set({
            status: "completed",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userProgress.id, existingProgress.id),
              ne(userProgress.status, "completed"),
            ),
          )
          .returning({ id: userProgress.id });
        progressUpdated = updated.length > 0;
      } else {
        const inserted = await tx
          .insert(userProgress)
          .values({
            id: nanoid(),
            userId,
            challengeSlug,
            status: "completed",
            completedAt: new Date(),
          })
          .onConflictDoNothing()
          .returning({ id: userProgress.id });
        progressUpdated = inserted.length > 0;
      }

      const [existingXp] = await tx
        .select({ id: userXpTransaction.id })
        .from(userXpTransaction)
        .where(
          and(
            eq(userXpTransaction.userId, userId),
            eq(userXpTransaction.challengeSlug, challengeSlug),
            eq(userXpTransaction.action, "challenge_completed"),
          ),
        )
        .limit(1);

      return {
        conflict: false,
        progressUpdated,
        failed: false,
        hasXpAwarded: !!existingXp,
      };
    });

    if (txResult.conflict) {
      return c.json(
        { error: "Concurrent submission detected, please retry" },
        409,
      );
    }

    const failedObjectives = objectives.filter((obj) => !obj.passed);
    trackChallengeSubmitted(
      userId,
      challengeSlug,
      validated,
      failedObjectives.length > 0
        ? {
            count: failedObjectives.length,
            ids: failedObjectives.map((o) => o.key),
          }
        : undefined,
    ).catch((err) => {
      c.get("log").error("challenge_submitted tracking failed", {
        error: String(err),
      });
    });

    const sseChannel = `invalidate-cache:${userId}`;
    redis
      .publish(
        sseChannel,
        JSON.stringify({
          queryKey: queryKeys.submissions.latest(challengeSlug),
        }),
      )
      .catch((err) => {
        c.get("log").error("SSE publish failed", {
          channel: sseChannel,
          error: String(err),
        });
      });

    cacheDelPattern(`cache:u:${userId}:*`).catch((err) => {
      c.get("log").error("cache invalidation failed", { error: String(err) });
    });

    if (txResult.failed) {
      return c.json(
        {
          success: false as const,
          objectives,
          failedObjectives: failedObjectives.map((obj) => ({
            key: obj.key,
            title: obj.title,
            message: obj.message,
          })),
        },
        422,
      );
    }

    if (!txResult.progressUpdated) {
      return c.json({ success: true as const, objectives });
    }

    if (!txResult.hasXpAwarded) {
      const [xpRow] = await db
        .select({ totalXp: userXp.totalXp })
        .from(userXp)
        .where(eq(userXp.userId, userId))
        .limit(1);
      challengeSubmissionQueue
        .add(
          "challenge-completed",
          {
            userId,
            challengeSlug,
            difficulty: detail.difficulty,
            prevTotalXp: xpRow?.totalXp ?? 0,
          },
          { jobId: `challenge-completed:${userId}:${challengeSlug}` },
        )
        .catch((err) => {
          c.get("log").error("challenge-submission job dispatch failed", {
            error: String(err),
          });
        });
    }

    return c.json({ success: true as const, objectives });
  },
);
