import { zValidator } from "@hono/zod-validator";
import { count, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db";
import {
  challenge,
  challengeTheme,
  challengeType,
  userProgress,
  userSubmission,
} from "../../db/schema";

export const adminChallenges = new Hono();

// GET /api/admin/challenges — list all challenges with per-challenge metrics
adminChallenges.get("/", async (c) => {
  const rows = await db
    .select({
      id: challenge.id,
      slug: challenge.slug,
      title: challenge.title,
      difficulty: challenge.difficulty,
      theme: challengeTheme.name,
      type: challengeType.name,
      available: challenge.available,
      ofTheWeek: challenge.ofTheWeek,
      createdAt: challenge.createdAt,
      starts: sql<number>`COUNT(DISTINCT CASE WHEN ${userProgress.status} != 'not_started' THEN ${userProgress.userId} END)`,
      completions: sql<number>`COUNT(DISTINCT CASE WHEN ${userProgress.status} = 'completed' THEN ${userProgress.userId} END)`,
      totalSubmissions: sql<number>`(SELECT COUNT(*) FROM user_submission WHERE user_submission.challenge_id = ${challenge.id})`,
      successfulSubmissions: sql<number>`(SELECT COUNT(*) FROM user_submission WHERE user_submission.challenge_id = ${challenge.id} AND user_submission.validated = true)`,
    })
    .from(challenge)
    .leftJoin(challengeTheme, eq(challenge.theme, challengeTheme.slug))
    .leftJoin(challengeType, eq(challenge.typeSlug, challengeType.slug))
    .leftJoin(userProgress, eq(challenge.id, userProgress.challengeId))
    .groupBy(
      challenge.id,
      challenge.slug,
      challenge.title,
      challenge.difficulty,
      challengeTheme.name,
      challengeType.name,
      challenge.available,
      challenge.ofTheWeek,
      challenge.createdAt,
    )
    .orderBy(challenge.createdAt);

  return c.json({ challenges: rows });
});

// GET /api/admin/challenges/stats — global challenge stats
adminChallenges.get("/stats", async (c) => {
  const [submissionStats] = await db
    .select({
      totalSubmissions: count(userSubmission.id),
      successfulSubmissions: sql<number>`SUM(CASE WHEN ${userSubmission.validated} = true THEN 1 ELSE 0 END)`,
    })
    .from(userSubmission);

  const [progressStats] = await db
    .select({
      totalStarts: sql<number>`COUNT(DISTINCT CASE WHEN ${userProgress.status} != 'not_started' THEN ${userProgress.id} END)`,
      totalCompletions: sql<number>`COUNT(DISTINCT CASE WHEN ${userProgress.status} = 'completed' THEN ${userProgress.id} END)`,
    })
    .from(userProgress);

  const totalSubs = submissionStats?.totalSubmissions ?? 0;
  const successfulSubs = Number(submissionStats?.successfulSubmissions ?? 0);
  const totalStarts = Number(progressStats?.totalStarts ?? 0);
  const totalCompletions = Number(progressStats?.totalCompletions ?? 0);

  return c.json({
    totalSubmissions: totalSubs,
    successfulSubmissions: successfulSubs,
    successRate: totalSubs > 0 ? successfulSubs / totalSubs : 0,
    totalStarts,
    totalCompletions,
    completionRate: totalStarts > 0 ? totalCompletions / totalStarts : 0,
  });
});

// PATCH /api/admin/challenges/:id/available — toggle challenge availability
adminChallenges.patch(
  "/:id/available",
  zValidator("json", z.object({ available: z.boolean() })),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (Number.isNaN(id)) return c.json({ error: "Invalid id" }, 400);
    const { available } = c.req.valid("json");
    await db.update(challenge).set({ available }).where(eq(challenge.id, id));
    return c.json({ success: true });
  },
);
