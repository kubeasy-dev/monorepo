import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index";
import { userXpTransaction } from "../../db/schema/index";
import { RANK_THRESHOLDS } from "./constants";
import type { RankInfo } from "./types";

// Pure in-memory rank computation — no DB access.
export function getRankFromXp(totalXp: number): RankInfo {
  let currentRankIndex = 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= RANK_THRESHOLDS[i].minXp) {
      currentRankIndex = i;
      break;
    }
  }

  const currentRank = RANK_THRESHOLDS[currentRankIndex];
  const nextRank = RANK_THRESHOLDS[currentRankIndex + 1];

  let progress: number;
  let nextRankXp: number | null;

  if (nextRank) {
    const xpInCurrentRank = totalXp - currentRank.minXp;
    const xpNeededForNextRank = nextRank.minXp - currentRank.minXp;
    progress = Math.round((xpInCurrentRank / xpNeededForNextRank) * 100);
    nextRankXp = nextRank.minXp;
  } else {
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

export async function calculateLevel(userId: string): Promise<RankInfo> {
  const result = await db
    .select({
      totalXp: sql<number>`COALESCE(SUM(${userXpTransaction.xpAmount}), 0)`,
    })
    .from(userXpTransaction)
    .where(eq(userXpTransaction.userId, userId));

  return getRankFromXp(result[0]?.totalXp ?? 0);
}
