/**
 * Calculate user's current level/rank based on total XP
 *
 * Determines which rank the user has achieved and their progress to the next rank
 */

import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { userXpTransaction } from "../../db/schema/index.js";
import { RANK_THRESHOLDS } from "./constants.js";
import type { RankInfo } from "./types.js";

/**
 * Calculate the current rank for a user based on their total XP
 *
 * @param userId - User ID to calculate rank for
 * @returns RankInfo object with current rank, progress, and next rank threshold
 */
export async function calculateLevel(userId: string): Promise<RankInfo> {
  // Get total XP from all transactions
  const result = await db
    .select({
      totalXp: sql<number>`COALESCE(SUM(${userXpTransaction.xpAmount}), 0)`,
    })
    .from(userXpTransaction)
    .where(eq(userXpTransaction.userId, userId));

  const totalXp = result[0]?.totalXp ?? 0;

  // Find the appropriate rank based on total XP
  // Iterate backwards through thresholds to find the highest qualifying rank
  let currentRankIndex = 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= RANK_THRESHOLDS[i].minXp) {
      currentRankIndex = i;
      break;
    }
  }

  const currentRank = RANK_THRESHOLDS[currentRankIndex];
  const nextRank = RANK_THRESHOLDS[currentRankIndex + 1];

  // Calculate progress to next rank
  let progress: number;
  let nextRankXp: number | null;

  if (nextRank) {
    // Not at max rank - calculate percentage progress
    const xpInCurrentRank = totalXp - currentRank.minXp;
    const xpNeededForNextRank = nextRank.minXp - currentRank.minXp;
    progress = Math.round((xpInCurrentRank / xpNeededForNextRank) * 100);
    nextRankXp = nextRank.minXp;
  } else {
    // At max rank (Legend)
    progress = 100;
    nextRankXp = null;
  }

  return {
    name: currentRank.name,
    minXp: currentRank.minXp,
    nextRankXp,
    progress,
  };
}
