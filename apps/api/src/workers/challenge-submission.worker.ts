import type { XpAwardPayload } from "@kubeasy/jobs";
import {
  type ChallengeSubmissionPayload,
  createQueue,
  QUEUE_NAMES,
} from "@kubeasy/jobs";
import { all } from "better-all";
import { Worker } from "bullmq";
import { and, count, eq } from "drizzle-orm";
import { db } from "../db/index";
import { userXpTransaction } from "../db/schema/index";
import { trackChallengeCompleted } from "../lib/analytics-server";
import { redisConfig } from "../lib/redis";
import { calculateStreak, calculateXPGain } from "../services/xp/index";
import type { ChallengeDifficulty } from "../services/xp/types";

export function createChallengeSubmissionWorker() {
  const connection = { ...redisConfig, maxRetriesPerRequest: null as null };

  // Queue instance for dispatching XP_AWARD jobs
  const xpAwardQueue = createQueue(QUEUE_NAMES.XP_AWARD, connection);

  return new Worker<ChallengeSubmissionPayload>(
    QUEUE_NAMES.CHALLENGE_SUBMISSION,
    async (job) => {
      const { userId, challengeSlug, challengeId, difficulty } = job.data;

      // 1 & 2. Check first challenge + calculate streak in parallel (independent DB queries)
      const { completedTransactions, currentStreak } = await all({
        async completedTransactions() {
          const [row] = await db
            .select({ count: count() })
            .from(userXpTransaction)
            .where(
              and(
                eq(userXpTransaction.userId, userId),
                eq(userXpTransaction.action, "challenge_completed"),
              ),
            );
          return row;
        },
        async currentStreak() {
          return calculateStreak(userId);
        },
      });
      const isFirstChallenge = (completedTransactions?.count ?? 0) === 0;

      // 3. Calculate XP amounts
      const xpGain = calculateXPGain({
        difficulty: difficulty as ChallengeDifficulty,
        isFirstChallenge,
        currentStreak,
      });

      // 4. Fire analytics (fire-and-forget style, errors logged internally)
      await trackChallengeCompleted(
        userId,
        challengeId,
        challengeSlug,
        difficulty,
        xpGain.total,
        isFirstChallenge,
      );

      // 5. Dispatch XP_AWARD jobs in parallel
      await all({
        // Base XP always awarded
        async base() {
          return xpAwardQueue.add("xp-base", {
            userId,
            challengeId,
            challengeSlug,
            xpAmount: xpGain.baseXP,
            action: "challenge_completed",
            description: `Completed ${difficulty} challenge`,
          } satisfies XpAwardPayload);
        },
        // First challenge bonus
        async firstChallenge() {
          if (isFirstChallenge && xpGain.firstChallengeBonus > 0) {
            return xpAwardQueue.add("xp-first-challenge", {
              userId,
              challengeId,
              challengeSlug,
              xpAmount: xpGain.firstChallengeBonus,
              action: "first_challenge",
              description: "First challenge bonus",
            } satisfies XpAwardPayload);
          }
        },
        // Streak bonus
        async streak() {
          if (xpGain.streakBonus > 0) {
            return xpAwardQueue.add("xp-streak", {
              userId,
              challengeId,
              challengeSlug,
              xpAmount: xpGain.streakBonus,
              action: "daily_streak",
              description: `${currentStreak} day streak bonus`,
            } satisfies XpAwardPayload);
          }
        },
      });
    },
    { connection, concurrency: 5 },
  );
}
