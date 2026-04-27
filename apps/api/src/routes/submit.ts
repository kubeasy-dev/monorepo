import { zValidator } from "@hono/zod-validator";
import { queryKeys } from "@kubeasy/api-schemas/query-keys";
import { SubmitBodySchema } from "@kubeasy/api-schemas/submissions";
import { createQueue, QUEUE_NAMES } from "@kubeasy/jobs";
import { logger } from "@kubeasy/logger";
import { and, eq, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { nanoid } from "nanoid";
import { db } from "../db/index";
import { userProgress, userSubmission } from "../db/schema/index";
import { trackChallengeSubmitted } from "../lib/analytics-server";
import { cacheDelPattern } from "../lib/cache";
import { redis } from "../lib/redis";
import { getChallenge } from "../lib/registry";
import { slidingWindowRateLimit } from "../middleware/rate-limit";
import { requireAuth } from "../middleware/session";

const challengeSubmissionQueue = createQueue(
  QUEUE_NAMES.CHALLENGE_SUBMISSION,
  redis.options,
);

const submit = new Hono();

const submitRateLimit = slidingWindowRateLimit(redis, {
  windowMs: 10_000,
  max: 10,
  keyFn: (c: any) => `submit:${c.get("user").id}`,
});

// POST /challenges/:slug/submit -- trust CLI results, store submission, dispatch BullMQ job
submit.post(
  "/:slug/submit",
  requireAuth,
  submitRateLimit,
  bodyLimit({ maxSize: 1024 * 1024 }), // 1 MB
  zValidator("json", SubmitBodySchema),
  async (c) => {
    const user = c.get("user");
    const userId = user.id;
    const challengeSlug = c.req.param("slug");
    const { results, auditEvents } = c.req.valid("json");

    // 1. Resolve challenge from registry (gets difficulty + objectives for enrichment)
    const detail = await getChallenge(challengeSlug);
    if (!detail) {
      return c.json({ error: "Challenge not found" }, 404);
    }

    // 2. Check if already completed
    const [existingProgress] = await db
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
      .limit(1);

    if (existingProgress?.status === "completed") {
      return c.json({ error: "Challenge already completed" }, 409);
    }

    // 3. Enrich results with registry objective metadata
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

    // 4. Determine validation result (CLI is trusted)
    const validated = results.every((r) => r.passed);

    // 5. Transaction: store submission + progress update atomically
    const txResult = await db.transaction(async (tx) => {
      // 5a. Compute next attempt number
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

      // 5b. Insert submission (unique index on (user_id, challenge_slug, attempt_number) guards races)
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

      // 5c. Atomic progress update (race guard)
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

      return { conflict: false, progressUpdated, failed: false };
    });

    if (txResult.conflict) {
      return c.json(
        { error: "Concurrent submission detected, please retry" },
        409,
      );
    }

    // 6. Track submission (fire-and-forget)
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
      logger.error("[submit] challenge_submitted tracking failed", {
        error: String(err),
      });
    });

    // 7. SSE cache-invalidation (fire-and-forget)
    const sseChannel = `invalidate-cache:${userId}`;
    redis
      .publish(
        sseChannel,
        JSON.stringify({
          queryKey: queryKeys.challenges.submissions.all(challengeSlug),
        }),
      )
      .catch((err) => {
        logger.error("[submit] SSE publish failed", {
          channel: sseChannel,
          error: String(err),
        });
      });

    cacheDelPattern(`cache:u:${userId}:*`).catch((err) => {
      logger.error("[submit] cache invalidation failed", {
        error: String(err),
      });
    });

    if (txResult.failed) {
      return c.json(
        {
          success: false,
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
      return c.json({ success: true, objectives });
    }

    // 8. Dispatch CHALLENGE_SUBMISSION BullMQ job (fire-and-forget)
    challengeSubmissionQueue
      .add("challenge-completed", {
        userId,
        challengeSlug,
        difficulty: detail.difficulty,
      })
      .catch((err) => {
        logger.error("[submit] challenge-submission job dispatch failed", {
          error: String(err),
        });
      });

    return c.json({ success: true, objectives });
  },
);

export { submit };
