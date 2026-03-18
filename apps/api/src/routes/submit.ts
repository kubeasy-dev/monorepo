import { and, count, eq, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import {
  challenge,
  challengeObjective,
  userProgress,
  userSubmission,
  userXp,
  userXpTransaction,
} from "../db/schema/index.js";
import { requireAuth } from "../middleware/session.js";
import {
  calculateLevel,
  calculateStreak,
  calculateXPGain,
} from "../services/xp/index.js";

const submit = new Hono();

// POST /challenges/:slug/submit -- validate objectives, enrich results, store submission, distribute XP on success
submit.post("/:slug/submit", requireAuth, async (c) => {
  const user = c.get("user");
  const userId = user.id;
  const challengeSlug = c.req.param("slug");

  // Parse body
  const body = await c.req.json();
  const results = body.results; // Array of { objectiveKey, passed, message? }

  if (!results || !Array.isArray(results) || results.length === 0) {
    return c.json(
      { error: "results array is required and must not be empty" },
      400,
    );
  }

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
  const submittedKeys = new Set(
    results.map((r: { objectiveKey: string }) => r.objectiveKey),
  );

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
  const objectives = results.map(
    (result: { objectiveKey: string; passed: boolean; message?: string }) => {
      const metadata = metadataMap.get(result.objectiveKey);
      return {
        id: result.objectiveKey,
        name: metadata?.title ?? result.objectiveKey,
        description: metadata?.description,
        passed: result.passed,
        category: metadata?.category ?? "status",
        message: result.message ?? "",
      };
    },
  );

  // 6. Determine validation result
  const validated = results.every((r: { passed: boolean }) => r.passed);

  // 7. Always store submission
  await db.insert(userSubmission).values({
    id: nanoid(),
    userId,
    challengeId: challengeData.id,
    validated,
    objectives,
  });

  // 8. If validation failed, return failure response
  if (!validated) {
    const failedObjectives = objectives.filter(
      (obj: { passed: boolean }) => !obj.passed,
    );
    return c.json({
      success: false,
      message: "Validation failed",
      failedObjectives: failedObjectives.map(
        (obj: { id: string; name: string; message: string }) => ({
          id: obj.id,
          name: obj.name,
          message: obj.message,
        }),
      ),
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

  // 10. If race was lost, return early (no XP, no double analytics)
  if (!progressUpdated) {
    return c.json({
      success: true,
      xpAwarded: 0,
      totalXp: 0,
      rank: null,
      rankUp: false,
      firstChallenge: false,
      streakBonus: 0,
      currentStreak: 0,
    });
  }

  // 11. isFirstChallenge from xpTransaction count (read AFTER atomic write)
  const [completedTransactions] = await db
    .select({ count: count() })
    .from(userXpTransaction)
    .where(
      and(
        eq(userXpTransaction.userId, userId),
        eq(userXpTransaction.action, "challenge_completed"),
      ),
    );
  const isFirstChallenge = (completedTransactions?.count ?? 0) === 0;

  // 12. Calculate streak and XP
  const currentStreak = await calculateStreak(userId);
  const xpGain = calculateXPGain({
    difficulty: challengeData.difficulty,
    isFirstChallenge,
    currentStreak,
  });

  // 13. Get old rank before XP update
  const oldRankInfo = await calculateLevel(userId);

  // 14. Atomic userXp UPSERT
  const [updatedXp] = await db
    .insert(userXp)
    .values({ userId, totalXp: xpGain.total })
    .onConflictDoUpdate({
      target: userXp.userId,
      set: {
        totalXp: sql`${userXp.totalXp} + ${xpGain.total}`,
        updatedAt: new Date(),
      },
    })
    .returning({ totalXp: userXp.totalXp });
  const newXp = updatedXp?.totalXp ?? xpGain.total;

  // 15. Record XP transactions (1-3 rows)
  await db.insert(userXpTransaction).values({
    userId,
    action: "challenge_completed",
    xpAmount: xpGain.baseXP,
    challengeId: challengeData.id,
    description: `Completed ${challengeData.difficulty} challenge`,
  });

  if (xpGain.firstChallengeBonus > 0) {
    await db.insert(userXpTransaction).values({
      userId,
      action: "first_challenge",
      xpAmount: xpGain.firstChallengeBonus,
      challengeId: challengeData.id,
      description: "First challenge bonus",
    });
  }

  if (xpGain.streakBonus > 0) {
    await db.insert(userXpTransaction).values({
      userId,
      action: "daily_streak",
      xpAmount: xpGain.streakBonus,
      challengeId: challengeData.id,
      description: `${currentStreak} day streak bonus`,
    });
  }

  // 16. Get new rank after XP update
  const newRankInfo = await calculateLevel(userId);

  // 17. Return success response
  return c.json({
    success: true,
    xpAwarded: xpGain.total,
    totalXp: newXp,
    rank: newRankInfo.name,
    rankUp: oldRankInfo.name !== newRankInfo.name,
    firstChallenge: isFirstChallenge,
    streakBonus: xpGain.streakBonus,
    currentStreak,
  });
});

export { submit };
