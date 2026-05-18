import { and, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "../../db/index";
import { userProgress } from "../../db/schema/index";
import { MAX_STREAK_WINDOW_DAYS } from "./constants";

function normalizeToUTCMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Calculate the current streak for a user (consecutive calendar days with
 * at least one challenge completion).
 *
 * Reads userProgress.completedAt — written synchronously by the submit route —
 * instead of daily_streak XP transactions, which are written asynchronously by
 * xp-award.worker and may not exist yet when this function is called.
 */
export async function calculateStreak(userId: string): Promise<number> {
  const today = normalizeToUTCMidnight(new Date());

  const windowStart = new Date(today);
  windowStart.setUTCDate(windowStart.getUTCDate() - MAX_STREAK_WINDOW_DAYS);

  const completions = await db
    .select({ completedAt: userProgress.completedAt })
    .from(userProgress)
    .where(
      and(
        eq(userProgress.userId, userId),
        eq(userProgress.status, "completed"),
        isNotNull(userProgress.completedAt),
        gte(userProgress.completedAt, windowStart),
      ),
    );

  if (completions.length === 0) return 0;

  const uniqueDays = new Set<string>();
  for (const { completedAt } of completions) {
    if (completedAt) {
      uniqueDays.add(normalizeToUTCMidnight(completedAt).toISOString());
    }
  }

  const sortedDays = Array.from(uniqueDays)
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  const mostRecentDay = sortedDays[0];
  const daysSinceLastActivity = Math.floor(
    (today.getTime() - mostRecentDay.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceLastActivity > 1) return 0;

  const expectedDate = new Date(today);
  if (daysSinceLastActivity === 1) {
    expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
  }

  let streak = 0;
  for (const day of sortedDays) {
    if (day.getTime() === expectedDate.getTime()) {
      streak++;
      expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
