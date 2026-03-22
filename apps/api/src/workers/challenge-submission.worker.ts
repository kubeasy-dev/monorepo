import type { XpAwardPayload } from "@kubeasy/jobs";
import {
  type ChallengeSubmissionPayload,
  createQueue,
  QUEUE_NAMES,
} from "@kubeasy/jobs";
import { Worker } from "bullmq";
import { and, count, eq } from "drizzle-orm";
import { db } from "../db/index";
import { userXpTransaction } from "../db/schema/index";
import { trackChallengeCompletedServer } from "../lib/analytics-server";
import { calculateStreak, calculateXPGain } from "../services/xp/index";
import type { ChallengeDifficulty } from "../services/xp/types";

export function createChallengeSubmissionWorker() {
  const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  const connection = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    maxRetriesPerRequest: null as null,
  };

  // Queue instance for dispatching XP_AWARD jobs
  const xpAwardQueue = createQueue(QUEUE_NAMES.XP_AWARD, connection);

  return new Worker<ChallengeSubmissionPayload>(
    QUEUE_NAMES.CHALLENGE_SUBMISSION,
    async (job) => {
      const { userId, challengeSlug, challengeId, difficulty } = job.data;

      // 1. Check if this is the user's first completed challenge
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

      // 2. Calculate streak
      const currentStreak = await calculateStreak(userId);

      // 3. Calculate XP amounts
      const xpGain = calculateXPGain({
        difficulty: difficulty as ChallengeDifficulty,
        isFirstChallenge,
        currentStreak,
      });

      // 4. Fire analytics (fire-and-forget style, errors logged internally)
      await trackChallengeCompletedServer(
        userId,
        challengeId,
        challengeSlug,
        difficulty,
        xpGain.total,
        isFirstChallenge,
      );

      // 5. Dispatch XP_AWARD jobs
      // Base XP always awarded
      await xpAwardQueue.add("xp-base", {
        userId,
        challengeId,
        challengeSlug,
        xpAmount: xpGain.baseXP,
        action: "challenge_completed",
        description: `Completed ${difficulty} challenge`,
      } satisfies XpAwardPayload);

      // First challenge bonus
      if (isFirstChallenge && xpGain.firstChallengeBonus > 0) {
        await xpAwardQueue.add("xp-first-challenge", {
          userId,
          challengeId,
          challengeSlug,
          xpAmount: xpGain.firstChallengeBonus,
          action: "first_challenge",
          description: "First challenge bonus",
        } satisfies XpAwardPayload);
      }

      // Streak bonus
      if (xpGain.streakBonus > 0) {
        await xpAwardQueue.add("xp-streak", {
          userId,
          challengeId,
          challengeSlug,
          xpAmount: xpGain.streakBonus,
          action: "daily_streak",
          description: `${currentStreak} day streak bonus`,
        } satisfies XpAwardPayload);
      }
    },
    { connection, concurrency: 5 },
  );
}
