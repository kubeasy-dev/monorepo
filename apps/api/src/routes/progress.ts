import { zValidator } from "@hono/zod-validator";
import { and, count, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  challenge,
  userProgress,
  userSubmission,
  userXp,
  userXpTransaction,
} from "../db/schema/index.js";
import { requireAuth } from "../middleware/session.js";

const progress = new Hono();

const completionQuerySchema = z.object({
  splitByTheme: z
    .string()
    .optional()
    .transform((v) => v === "true")
    .pipe(z.boolean()),
  themeSlug: z.string().optional(),
});

// GET /progress/completion -- get completion percentage (global or by theme)
progress.get(
  "/completion",
  requireAuth,
  zValidator("query", completionQuerySchema),
  async (c) => {
    const user = c.get("user");
    const userId = user.id;
    const { splitByTheme, themeSlug } = c.req.valid("query");

    if (splitByTheme) {
      // Single optimized query: get total and completed counts by theme
      const byTheme = await db
        .select({
          themeSlug: challenge.theme,
          totalCount: count(challenge.id),
          completedCount: sql<number>`CAST(COUNT(CASE WHEN ${userProgress.userId} = ${userId} AND ${userProgress.status} = 'completed' THEN 1 END) AS INTEGER)`,
        })
        .from(challenge)
        .leftJoin(userProgress, eq(challenge.id, userProgress.challengeId))
        .groupBy(challenge.theme)
        .then((results) =>
          results.map((theme) => ({
            themeSlug: theme.themeSlug,
            completedCount: theme.completedCount,
            totalCount: theme.totalCount,
            percentageCompleted:
              theme.totalCount > 0
                ? Math.round((theme.completedCount / theme.totalCount) * 100)
                : 0,
          })),
        );

      // Calculate global stats from theme stats
      const totalCount = byTheme.reduce(
        (sum, theme) => sum + theme.totalCount,
        0,
      );
      const completedCount = byTheme.reduce(
        (sum, theme) => sum + theme.completedCount,
        0,
      );
      const percentageCompleted =
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      return c.json({
        byTheme,
        completedCount,
        totalCount,
        percentageCompleted,
      });
    }

    // Standard mode: single theme or all themes
    const themeFilter = themeSlug ? eq(challenge.theme, themeSlug) : undefined;

    // Get total challenges (optionally filtered by theme)
    const [totalResult] = await db
      .select({ count: count() })
      .from(challenge)
      .where(themeFilter);

    // Get completed challenges (optionally filtered by theme)
    const [completedResult] = await db
      .select({ count: count() })
      .from(userProgress)
      .innerJoin(challenge, eq(userProgress.challengeId, challenge.id))
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.status, "completed"),
          themeFilter,
        ),
      );

    const totalCount = totalResult?.count ?? 0;
    const completedCount = completedResult?.count ?? 0;

    return c.json({
      completedCount,
      totalCount,
      percentageCompleted:
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    });
  },
);

// GET /progress/:slug -- get challenge status for authenticated user
progress.get("/:slug", requireAuth, async (c) => {
  const user = c.get("user");
  const userId = user.id;
  const slug = c.req.param("slug");

  // Find challenge by slug
  const [challengeData] = await db
    .select({ id: challenge.id })
    .from(challenge)
    .where(eq(challenge.slug, slug))
    .limit(1);

  if (!challengeData) {
    return c.json({ error: "Challenge not found" }, 404);
  }

  // Find user progress
  const [progressRecord] = await db
    .select({
      status: userProgress.status,
      startedAt: userProgress.startedAt,
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

  if (!progressRecord) {
    return c.json({ status: "not_started" as const });
  }

  return c.json({
    status: progressRecord.status,
    startedAt: progressRecord.startedAt,
    completedAt: progressRecord.completedAt,
  });
});

// POST /progress/:slug/start -- create or update user progress to in_progress
progress.post("/:slug/start", requireAuth, async (c) => {
  const user = c.get("user");
  const userId = user.id;
  const slug = c.req.param("slug");

  // Find challenge by slug
  const [challengeData] = await db
    .select({ id: challenge.id, title: challenge.title })
    .from(challenge)
    .where(eq(challenge.slug, slug))
    .limit(1);

  if (!challengeData) {
    return c.json({ error: "Challenge not found" }, 404);
  }

  // Check if user progress already exists
  const [existingProgress] = await db
    .select({
      id: userProgress.id,
      status: userProgress.status,
      startedAt: userProgress.startedAt,
    })
    .from(userProgress)
    .where(
      and(
        eq(userProgress.userId, userId),
        eq(userProgress.challengeId, challengeData.id),
      ),
    )
    .limit(1);

  const now = new Date();

  if (existingProgress) {
    // Already completed
    if (existingProgress.status === "completed") {
      return c.json({
        status: existingProgress.status,
        startedAt: existingProgress.startedAt,
        message: "Challenge already completed",
      });
    }

    // Update to in_progress if not_started
    if (existingProgress.status === "not_started") {
      await db
        .update(userProgress)
        .set({ status: "in_progress", startedAt: now })
        .where(eq(userProgress.id, existingProgress.id));
    }

    return c.json({
      status: "in_progress" as const,
      startedAt: existingProgress.startedAt,
    });
  }

  // Create new progress record
  await db.insert(userProgress).values({
    id: nanoid(),
    userId,
    challengeId: challengeData.id,
    status: "in_progress",
    startedAt: now,
  });

  return c.json({
    status: "in_progress" as const,
    startedAt: now,
  });
});

// DELETE /progress/:slug/reset -- delete progress, submissions, and XP transactions for a challenge
progress.delete("/:slug/reset", requireAuth, async (c) => {
  const user = c.get("user");
  const userId = user.id;
  const slug = c.req.param("slug");

  // Find challenge by slug
  const [challengeData] = await db
    .select({ id: challenge.id, title: challenge.title })
    .from(challenge)
    .where(eq(challenge.slug, slug))
    .limit(1);

  if (!challengeData) {
    return c.json({ error: "Challenge not found" }, 404);
  }

  // Delete user progress, submissions, and XP transactions in parallel
  await Promise.all([
    db
      .delete(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.challengeId, challengeData.id),
        ),
      ),
    db
      .delete(userSubmission)
      .where(
        and(
          eq(userSubmission.userId, userId),
          eq(userSubmission.challengeId, challengeData.id),
        ),
      ),
    db
      .delete(userXpTransaction)
      .where(
        and(
          eq(userXpTransaction.userId, userId),
          eq(userXpTransaction.challengeId, challengeData.id),
        ),
      ),
  ]);

  // Recalculate userXp.totalXp from remaining transactions
  const [xpResult] = await db
    .select({
      totalXp: sql<number>`COALESCE(SUM(${userXpTransaction.xpAmount}), 0)`,
    })
    .from(userXpTransaction)
    .where(eq(userXpTransaction.userId, userId));

  await db
    .update(userXp)
    .set({ totalXp: xpResult?.totalXp ?? 0 })
    .where(eq(userXp.userId, userId));

  return c.json({
    success: true,
    message: "Challenge progress reset successfully",
  });
});

export { progress };
