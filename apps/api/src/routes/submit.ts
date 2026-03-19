import { zValidator } from "@hono/zod-validator";
import { createQueue, QUEUE_NAMES } from "@kubeasy/jobs";
import { queryKeys } from "@kubeasy/api-schemas/query-keys";
import { and, eq, ne } from "drizzle-orm";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import {
  challenge,
  challengeObjective,
  userProgress,
  userSubmission,
} from "../db/schema/index.js";
import { redis } from "../lib/redis.js";
import { slidingWindowRateLimit } from "../middleware/rate-limit.js";
import { requireAuth } from "../middleware/session.js";
import { submitBodySchema } from "../schemas/index.js";

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
  zValidator("json", submitBodySchema),
  async (c) => {
    const user = c.get("user");
    const userId = user.id;
    const challengeSlug = c.req.param("slug");
    const { results } = c.req.valid("json");

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

    // 2. Check if already completed (fast-path)
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
          eq(userProgress.challengeId, challengeData.id),
        ),
      )
      .limit(1);

    if (existingProgress?.status === "completed") {
      return c.json({ error: "Challenge already completed" }, 409);
    }

    // 3. Fetch objective metadata
    const objectiveMetadata = await db
      .select({
        objectiveKey: challengeObjective.objectiveKey,
        title: challengeObjective.title,
        description: challengeObjective.description,
        category: challengeObjective.category,
      })
      .from(challengeObjective)
      .where(eq(challengeObjective.challengeId, challengeData.id));

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

    // 7. Always store submission
    await db.insert(userSubmission).values({
      id: nanoid(),
      userId,
      challengeId: challengeData.id,
      validated,
      objectives,
    });

    // 7.5 Publish generic cache-invalidation SSE event (fire-and-forget — both validated and not-validated paths)
    const sseChannel = `invalidate-cache:${userId}`;
    const ssePayload = JSON.stringify({
      queryKey: queryKeys.submissions.latest(challengeSlug),
    });
    redis.publish(sseChannel, ssePayload).catch((err) => {
      console.error("Failed to publish SSE event", {
        channel: sseChannel,
        error: String(err),
      });
    });

    // 8. If validation failed, return failure response
    if (!validated) {
      return c.json({
        success: false,
        objectives,
        failedObjectives: objectives.filter((obj) => !obj.passed).map((obj) => ({
          id: obj.id,
          name: obj.name,
          message: obj.message,
        })),
      });
    }

    // 9. Atomic progress update (race guard)
    let progressUpdated: boolean;
    if (existingProgress) {
      // Only update if not already completed — if RETURNING is empty, race was lost
      const updated = await db
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
      // onConflictDoNothing + unique index catches concurrent inserts
      const inserted = await db
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

    // 10. If race was lost, return early
    if (!progressUpdated) {
      return c.json({ success: true, objectives });
    }

    // 11. Dispatch CHALLENGE_SUBMISSION BullMQ job (fire-and-forget)
    challengeSubmissionQueue
      .add("challenge-completed", {
        userId,
        challengeSlug,
        challengeId: challengeData.id,
        difficulty: challengeData.difficulty,
      })
      .catch((err) => {
        console.error("[submit] challenge-submission job dispatch failed", err);
      });

    // 12. Return success response
    return c.json({ success: true, objectives });
  },
);

export { submit };
