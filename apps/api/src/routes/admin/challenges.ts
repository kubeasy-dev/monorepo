import { zValidator } from "@hono/zod-validator";
import { logger } from "@kubeasy/logger";
import { all } from "better-all";
import { count, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db";
import {
  challengeMetadata,
  userProgress,
  userSubmission,
} from "../../db/schema";
import { cacheDelPattern } from "../../lib/cache";
import { getMeta, listChallenges } from "../../lib/registry";

export const adminChallenges = new Hono();

// GET /api/admin/challenges — list all challenges with per-challenge metrics
adminChallenges.get("/", async (c) => {
  const [registryList, meta, metadataRows, progressStats, submissionStats] =
    await Promise.all([
      listChallenges(),
      getMeta(),
      db.select().from(challengeMetadata),
      db
        .select({
          challengeSlug: userProgress.challengeSlug,
          starts: sql<number>`COUNT(DISTINCT CASE WHEN ${userProgress.status} != 'not_started' THEN ${userProgress.userId} END)`,
          completions: sql<number>`COUNT(DISTINCT CASE WHEN ${userProgress.status} = 'completed' THEN ${userProgress.userId} END)`,
        })
        .from(userProgress)
        .groupBy(userProgress.challengeSlug),
      db
        .select({
          challengeSlug: userSubmission.challengeSlug,
          totalSubmissions: count(userSubmission.id),
          successfulSubmissions: sql<number>`SUM(CASE WHEN ${userSubmission.validated} = true THEN 1 ELSE 0 END)`,
        })
        .from(userSubmission)
        .groupBy(userSubmission.challengeSlug),
    ]);

  const themeMap = new Map(meta.themes.map((t) => [t.slug, t]));
  const typeMap = new Map(meta.types.map((t) => [t.slug, t]));
  const metadataMap = new Map(metadataRows.map((m) => [m.slug, m]));
  const progressMap = new Map(progressStats.map((r) => [r.challengeSlug, r]));
  const submissionMap = new Map(
    submissionStats.map((r) => [r.challengeSlug, r]),
  );

  const challenges = registryList.map((ch) => {
    const m = metadataMap.get(ch.slug);
    const p = progressMap.get(ch.slug);
    const s = submissionMap.get(ch.slug);
    return {
      slug: ch.slug,
      title: ch.title,
      difficulty: ch.difficulty,
      theme: themeMap.get(ch.theme)?.name ?? ch.theme,
      type: typeMap.get(ch.type)?.name ?? ch.type,
      available: m?.available ?? true,
      ofTheWeek: m?.ofTheWeek ?? false,
      starts: Number(p?.starts ?? 0),
      completions: Number(p?.completions ?? 0),
      totalSubmissions: Number(s?.totalSubmissions ?? 0),
      successfulSubmissions: Number(s?.successfulSubmissions ?? 0),
    };
  });

  return c.json({ challenges });
});

// GET /api/admin/challenges/stats — global challenge stats
adminChallenges.get("/stats", async (c) => {
  const { submissionRows, progressRows } = await all({
    async submissionRows() {
      return db
        .select({
          totalSubmissions: count(userSubmission.id),
          successfulSubmissions: sql<number>`SUM(CASE WHEN ${userSubmission.validated} = true THEN 1 ELSE 0 END)`,
        })
        .from(userSubmission);
    },
    async progressRows() {
      return db
        .select({
          totalStarts: sql<number>`COUNT(DISTINCT CASE WHEN ${userProgress.status} != 'not_started' THEN ${userProgress.id} END)`,
          totalCompletions: sql<number>`COUNT(DISTINCT CASE WHEN ${userProgress.status} = 'completed' THEN ${userProgress.id} END)`,
        })
        .from(userProgress);
    },
  });
  const [submissionStats] = submissionRows;
  const [progressStats] = progressRows;

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

// PATCH /api/admin/challenges/:slug/available — toggle challenge availability
adminChallenges.patch(
  "/:slug/available",
  zValidator("json", z.object({ available: z.boolean() })),
  async (c) => {
    const slug = c.req.param("slug");
    const { available } = c.req.valid("json");
    await db
      .insert(challengeMetadata)
      .values({ slug, available })
      .onConflictDoUpdate({
        target: challengeMetadata.slug,
        set: { available },
      });

    // Invalidate caches
    Promise.all([
      cacheDelPattern(`cache:challenges:detail:*${slug}*`),
      cacheDelPattern(`cache:challenges:objectives:*${slug}*`),
      cacheDelPattern("cache:u:*:challenges:list:*"),
    ]).catch((err) => {
      logger.error("[admin/challenges] cache invalidation failed", {
        slug,
        error: String(err),
      });
    });

    return c.json({ success: true });
  },
);
