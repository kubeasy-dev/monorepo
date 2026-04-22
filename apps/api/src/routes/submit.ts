import { zValidator } from "@hono/zod-validator";
import { queryKeys } from "@kubeasy/api-schemas/query-keys";
import { createQueue, QUEUE_NAMES } from "@kubeasy/jobs";
import { logger } from "@kubeasy/logger";
import { and, eq, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { nanoid } from "nanoid";
import { db } from "../db/index";
import {
  challenge,
  challengeObjective,
  userProgress,
  userSubmission,
} from "../db/schema/index";
import { trackChallengeSubmitted } from "../lib/analytics-server";
import { cacheDelPattern } from "../lib/cache";
import { redis } from "../lib/redis";
import { slidingWindowRateLimit } from "../middleware/rate-limit";
import { requireAuth } from "../middleware/session";
import { submitBodySchema } from "../schemas/index";

const challengeSubmissionQueue = createQueue(
  QUEUE_NAMES.CHALLENGE_SUBMISSION,
  redis.options,
);

const submit = new Hono();

const submitRateLimit = slidingWindowRateLimit(redis, {
  windowMs: 10_000, // 10 seconds
  max: 10, // 10 requests per 10-second window
  keyFn: (c) => `submit:${c.get("user").id}`,
});

// POST /challenges/:slug/submit -- validate objectives, enrich results, store submission, dispatch BullMQ job
submit.post(
  "/:slug/submit",
  requireAuth,
  submitRateLimit,
  bodyLimit({ maxSize: 1024 * 1024 }), // 1 MB
  zValidator("json", submitBodySchema),
  async (c) => {
    const user = c.get("user");
    const userId = user.id;
    const challengeSlug = c.req.param("slug");
    const { results, auditEvents } = c.req.valid("json");

    // 1. Find challenge by slug
    const [challengeData] = await db
      .select({
        id: challenge.id,
        title: challenge.title,
        difficulty: challenge.difficulty,
      })
      .from(challenge)
      .where(eq(challenge.slug, challengeSlug))
      .limit(1);

    if (!challengeData) {
      return c.json({ error: "Challenge not found" }, 404);
    }

    // 2 & 3. Run independent queries in parallel: check if already completed + fetch objective metadata
    const [[existingProgress], objectiveMetadata] = await Promise.all([
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
            eq(userProgress.challengeId, challengeData.id),
          ),
        )
        .limit(1),
      db
        .select({
          objectiveKey: challengeObjective.objectiveKey,
          title: challengeObjective.title,
          description: challengeObjective.description,
          category: challengeObjective.category,
        })
        .from(challengeObjective)
        .where(eq(challengeObjective.challengeId, challengeData.id)),
    ]);

    if (existingProgress?.status === "completed") {
      return c.json({ error: "Challenge already completed" }, 409);
    }

    const metadataMap = new Map(
      objectiveMetadata.map((m) => [m.objectiveKey, m]),
    );

    // 4. Security validation: check for missing and unknown objectives
    const expectedKeys = new Set(objectiveMetadata.map((m) => m.objectiveKey));
    const submittedKeys = new Set(results.map((r) => r.objectiveKey));

    // Check for missing objectives (in DB but not in submission)
    if (expectedKeys.size > 0) {
      const missingKeys = [...expectedKeys].filter(
        (key) => !submittedKeys.has(key),
      );
      if (missingKeys.length > 0) {
        return c.json(
          { error: `Missing required objectives: ${missingKeys.join(", ")}` },
          422,
        );
      }
    }

    // Check for unknown objectives (in submission but not in DB)
    const unknownKeys = [...submittedKeys].filter(
      (key) => !expectedKeys.has(key),
    );
    if (unknownKeys.length > 0) {
      return c.json(
        { error: `Unknown objectives submitted: ${unknownKeys.join(", ")}` },
        422,
      );
    }

    // 5. Enrich results with metadata
    const objectives = results.map((result) => {
      const metadata = metadataMap.get(result.objectiveKey);
      return {
        id: result.objectiveKey,
        name: metadata?.title ?? result.objectiveKey,
        description: metadata?.description,
        passed: result.passed,
        category: metadata?.category ?? "status",
        message: result.message ?? "",
      };
    });

    // 6. Determine validation result
    const validated = results.every((r) => r.passed);

    // 7. Transaction: store submission + progress update atomically
    const txResult = await db.transaction(async (tx) => {
      // 7a. Compute next attempt_number for this (userId, challengeId).
      // The CLI is the only submit client and concurrent submits from one user are
      // practically impossible, so MAX+1 is safe. The UNIQUE index on
      // (user_id, challenge_id, attempt_number) is a hard guard if that assumption breaks.
      const [{ nextAttempt }] = await tx
        .select({
          nextAttempt: sql<number>`COALESCE(MAX(${userSubmission.attemptNumber}), 0) + 1`,
        })
        .from(userSubmission)
        .where(
          and(
            eq(userSubmission.userId, userId),
            eq(userSubmission.challengeId, challengeData.id),
          ),
        );

      // 7b. Always store submission (with attempt number and audit events).
      // The unique index on (user_id, challenge_id, attempt_number) guards against
      // concurrent submits racing on the same MAX — catch PG error 23505 and return
      // 409 so the caller retries rather than seeing an unhandled 500.
      try {
        await tx.insert(userSubmission).values({
          id: nanoid(),
          userId,
          challengeId: challengeData.id,
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

      // 7c. If validation failed, no progress update needed
      if (!validated) {
        return { conflict: false, progressUpdated: false, failed: true };
      }

      // 7d. Atomic progress update (race guard)
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
            challengeId: challengeData.id,
            status: "completed",
            completedAt: new Date(),
          })
          .onConflictDoNothing()
          .returning({ id: userProgress.id });
        progressUpdated = inserted.length > 0;
      }

      return { conflict: false, progressUpdated, failed: false };
    });

    // 7.5: Concurrent submit conflict — unique index on attempt_number fired
    if (txResult.conflict) {
      return c.json(
        { error: "Concurrent submission detected, please retry" },
        409,
      );
    }

    // 7.5 Track submission with outcome (fire-and-forget)
    const failedObjectives = objectives.filter((obj) => !obj.passed);
    trackChallengeSubmitted(
      userId,
      challengeData.id,
      challengeSlug,
      validated,
      failedObjectives.length > 0
        ? {
            count: failedObjectives.length,
            ids: failedObjectives.map((o) => o.id),
          }
        : undefined,
    ).catch((err) => {
      logger.error("[submit] challenge_submitted tracking failed", {
        error: String(err),
      });
    });

    // 7.6 Publish generic cache-invalidation SSE event (fire-and-forget — both validated and not-validated paths)
    const sseChannel = `invalidate-cache:${userId}`;
    const ssePayload = JSON.stringify({
      queryKey: queryKeys.submissions.latest(challengeSlug),
    });
    redis.publish(sseChannel, ssePayload).catch((err) => {
      logger.error("[submit] SSE publish failed", {
        channel: sseChannel,
        error: String(err),
      });
    });

    // Invalidate all server-side user caches (progress, xp, streak, challenge list)
    cacheDelPattern(`cache:u:${userId}:*`).catch((err) => {
      logger.error("[submit] cache invalidation failed", {
        error: String(err),
      });
    });

    // 8. If validation failed, return failure response
    if (txResult.failed) {
      return c.json({
        success: false,
        objectives,
        failedObjectives: failedObjectives.map((obj) => ({
          id: obj.id,
          name: obj.name,
          message: obj.message,
        })),
      });
    }

    // 9. If race was lost, return early
    if (!txResult.progressUpdated) {
      return c.json({ success: true, objectives });
    }

    // 10. Dispatch CHALLENGE_SUBMISSION BullMQ job (fire-and-forget)
    challengeSubmissionQueue
      .add("challenge-completed", {
        userId,
        challengeSlug,
        challengeId: challengeData.id,
        difficulty: challengeData.difficulty,
      })
      .catch((err) => {
        logger.error("[submit] challenge-submission job dispatch failed", {
          error: String(err),
        });
      });

    // 11. Return success response
    return c.json({ success: true, objectives });
  },
);

export { submit };
