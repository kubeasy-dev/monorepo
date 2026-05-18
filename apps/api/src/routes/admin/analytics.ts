import { countDistinct, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { db } from "../../db";
import { user, userProgress, userSubmission } from "../../db/schema";
import { sessionSecurity } from "../../lib/openapi-shared";
import { redis } from "../../lib/redis";
import { slidingWindowRateLimit } from "../../middleware/rate-limit";
import type { AppEnv } from "../../middleware/session";

const FunnelOutputSchema = z.object({
  totalUsers: z.number(),
  usersStarted: z.number(),
  usersCompleted: z.number(),
});

const FailingObjectiveSchema = z.object({
  key: z.string(),
  failCount: z.number(),
});

const ChallengeStatsItemSchema = z.object({
  challengeSlug: z.string(),
  totalAttempts: z.number(),
  uniqueUsers: z.number(),
  validatedSubmissions: z.number(),
  completionRate: z.number(),
  avgAttempts: z.number(),
  topFailingObjectives: z.array(FailingObjectiveSchema),
});

const ChallengesAnalyticsOutputSchema = z.object({
  challenges: z.array(ChallengeStatsItemSchema),
});

// Schema for validating raw JSONB rows from failing objectives query
const failingObjectiveRowSchema = z.object({
  challenge_slug: z.string(),
  key: z
    .string()
    .max(256)
    .regex(/^[\w.-]+$/),
  fail_count: z.coerce.number(),
});

const analyticsRateLimit = slidingWindowRateLimit(redis, {
  windowMs: 60_000,
  max: 30,
  keyFn: (c) => `admin-analytics:${c.get("user")?.id ?? "unknown"}`,
});

export const adminAnalytics = new Hono<AppEnv>()
  .get(
    "/funnel",
    describeRoute({
      tags: ["Admin"],
      summary: "Signup → started → completed funnel",
      security: sessionSecurity,
      responses: {
        200: {
          description: "Funnel stats",
          content: {
            "application/json": { schema: resolver(FunnelOutputSchema) },
          },
        },
      },
    }),
    analyticsRateLimit,
    async (c) => {
      const [totalRow] = await db
        .select({ totalUsers: sql<number>`COUNT(*)` })
        .from(user);

      const [startedRow] = await db
        .select({
          usersStarted: countDistinct(userProgress.userId),
        })
        .from(userProgress)
        .where(ne(userProgress.status, "not_started"));

      const [completedRow] = await db
        .select({
          usersCompleted: countDistinct(userProgress.userId),
        })
        .from(userProgress)
        .where(sql`${userProgress.status} = 'completed'`);

      return c.json({
        totalUsers: Number(totalRow?.totalUsers ?? 0),
        usersStarted: Number(startedRow?.usersStarted ?? 0),
        usersCompleted: Number(completedRow?.usersCompleted ?? 0),
      });
    },
  )
  .get(
    "/challenges",
    describeRoute({
      tags: ["Admin"],
      summary: "Aggregated stats per challenge",
      security: sessionSecurity,
      responses: {
        200: {
          description: "Challenge analytics",
          content: {
            "application/json": {
              schema: resolver(ChallengesAnalyticsOutputSchema),
            },
          },
        },
      },
    }),
    analyticsRateLimit,
    async (c) => {
      // Aggregate base stats per challenge
      const baseStats = await db
        .select({
          challengeSlug: userSubmission.challengeSlug,
          totalAttempts: sql<number>`COUNT(*)`,
          uniqueUsers: countDistinct(userSubmission.userId),
          validatedSubmissions: sql<number>`COUNT(DISTINCT ${userSubmission.userId}) FILTER (WHERE ${userSubmission.validated} = true)`,
        })
        .from(userSubmission)
        .groupBy(userSubmission.challengeSlug)
        .orderBy(userSubmission.challengeSlug);

      // Get top failing objectives per challenge using jsonb_array_elements
      const failingObjectivesRows = await db.execute(sql`
        SELECT
          s.challenge_slug,
          obj->>'objectiveKey' AS key,
          COUNT(*) AS fail_count
        FROM user_submission s,
             jsonb_array_elements(s.objectives) AS obj
        WHERE (obj->>'passed')::boolean = false
          AND s.objectives IS NOT NULL
        GROUP BY s.challenge_slug, obj->>'objectiveKey'
        ORDER BY s.challenge_slug, COUNT(*) DESC
      `);

      // Group failing objectives by challenge slug, keep top 5
      // Validate each row with Zod before processing
      const failingBySlug = new Map<
        string,
        Array<{ key: string; failCount: number }>
      >();
      for (const row of failingObjectivesRows.rows
        .map((r) => failingObjectiveRowSchema.safeParse(r))
        .filter((r) => r.success)
        .map((r) => r.data)) {
        const existing = failingBySlug.get(row.challenge_slug) ?? [];
        if (existing.length < 5) {
          existing.push({ key: row.key, failCount: Number(row.fail_count) });
        }
        failingBySlug.set(row.challenge_slug, existing);
      }

      const challenges = baseStats.map((row) => {
        const totalAttempts = Number(row.totalAttempts);
        const uniqueUsers = Number(row.uniqueUsers);
        const validatedSubmissions = Number(row.validatedSubmissions);
        const completionRate =
          uniqueUsers > 0 ? validatedSubmissions / uniqueUsers : 0;
        const avgAttempts = uniqueUsers > 0 ? totalAttempts / uniqueUsers : 0;
        const topFailingObjectives = failingBySlug.get(row.challengeSlug) ?? [];

        return {
          challengeSlug: row.challengeSlug,
          totalAttempts,
          uniqueUsers,
          validatedSubmissions,
          completionRate,
          avgAttempts,
          topFailingObjectives,
        };
      });

      return c.json({ challenges });
    },
  );
