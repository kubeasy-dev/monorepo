import { countDistinct, eq, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { db } from "../../db";
import { cliEvent, user, userProgress, userSubmission } from "../../db/schema";
import { sessionSecurity } from "../../lib/openapi-shared";
import { redis } from "../../lib/redis";
import { slidingWindowRateLimit } from "../../middleware/rate-limit";
import type { AppEnv } from "../../middleware/session";

const FunnelOutputSchema = z.object({
  totalUsers: z.number(),
  usersStarted: z.number(),
  usersCompleted: z.number(),
});

const FunnelHistoryWeekSchema = z.object({
  week: z.string(),
  newSignups: z.number(),
  newStarters: z.number(),
  newCompleters: z.number(),
});

const FunnelHistoryOutputSchema = z.object({
  weeks: z.array(FunnelHistoryWeekSchema),
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
  completionRate: z.number().min(0).max(1),
  avgAttempts: z.number().min(0),
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
  keyFn: (c) =>
    `admin-analytics:${c.get("user")?.id ?? c.req.header("x-forwarded-for") ?? "unknown"}`,
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
        .where(eq(userProgress.status, "completed"));

      return c.json({
        totalUsers: Number(totalRow?.totalUsers ?? 0),
        usersStarted: Number(startedRow?.usersStarted ?? 0),
        usersCompleted: Number(completedRow?.usersCompleted ?? 0),
      });
    },
  )
  .get(
    "/funnel/history",
    describeRoute({
      tags: ["Admin"],
      summary: "Monthly funnel evolution over the last 12 months",
      security: sessionSecurity,
      responses: {
        200: {
          description: "Funnel history",
          content: {
            "application/json": {
              schema: resolver(FunnelHistoryOutputSchema),
            },
          },
        },
      },
    }),
    analyticsRateLimit,
    async (c) => {
      const rows = await db.execute(sql`
        WITH
        months AS (
          SELECT generate_series(
            date_trunc('month', now() - INTERVAL '11 months'),
            date_trunc('month', now()),
            '1 month'::interval
          )::date AS week
        ),
        first_starts AS (
          SELECT user_id, MIN(started_at) AS first_at
          FROM user_progress
          GROUP BY user_id
        ),
        first_completions AS (
          SELECT user_id, MIN(completed_at) AS first_at
          FROM user_progress
          WHERE completed_at IS NOT NULL
          GROUP BY user_id
        ),
        weekly_signups AS (
          SELECT date_trunc('month', created_at)::date AS week, COUNT(*)::int AS count
          FROM "user"
          WHERE created_at >= now() - INTERVAL '12 months'
          GROUP BY 1
        ),
        weekly_starters AS (
          SELECT date_trunc('month', first_at)::date AS week, COUNT(*)::int AS count
          FROM first_starts
          WHERE first_at >= now() - INTERVAL '12 months'
          GROUP BY 1
        ),
        weekly_completers AS (
          SELECT date_trunc('month', first_at)::date AS week, COUNT(*)::int AS count
          FROM first_completions
          WHERE first_at >= now() - INTERVAL '12 months'
          GROUP BY 1
        )
        SELECT
          m.week::text,
          COALESCE(s.count, 0) AS new_signups,
          COALESCE(st.count, 0) AS new_starters,
          COALESCE(c.count, 0) AS new_completers
        FROM months m
        LEFT JOIN weekly_signups s ON s.week = m.week
        LEFT JOIN weekly_starters st ON st.week = m.week
        LEFT JOIN weekly_completers c ON c.week = m.week
        ORDER BY m.week
      `);

      const weeks = rows.rows.map((r) => ({
        week: String(r.week).substring(0, 10),
        newSignups: Number(r.new_signups),
        newStarters: Number(r.new_starters),
        newCompleters: Number(r.new_completers),
      }));

      return c.json({ weeks });
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
      for (const parsed of failingObjectivesRows.rows.map((r) =>
        failingObjectiveRowSchema.safeParse(r),
      )) {
        if (!parsed.success) {
          c.get("log").warn("analytics: dropping malformed objective row", {
            error: String(parsed.error),
          });
          continue;
        }
        const row = parsed.data;
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
  )
  .get(
    "/cli",
    describeRoute({
      tags: ["Admin"],
      summary: "CLI events analytics (versions, OS, event type spread)",
      security: sessionSecurity,
      responses: {
        200: {
          description: "CLI analytics",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  totalEvents: z.number(),
                  uniqueUsers: z.number(),
                  byVersion: z.array(
                    z.object({ cliVersion: z.string(), count: z.number() }),
                  ),
                  byOs: z.array(
                    z.object({ os: z.string(), count: z.number() }),
                  ),
                  byEventType: z.array(
                    z.object({ eventType: z.string(), count: z.number() }),
                  ),
                }),
              ),
            },
          },
        },
      },
    }),
    analyticsRateLimit,
    async (c) => {
      const [totals, byVersion, byOs, byEventType] = await Promise.all([
        db
          .select({
            totalEvents: sql<number>`COUNT(*)`,
            uniqueUsers: countDistinct(cliEvent.userId),
          })
          .from(cliEvent)
          .then((rows) => rows[0]),
        db
          .select({
            cliVersion: cliEvent.cliVersion,
            count: sql<number>`COUNT(*)`,
          })
          .from(cliEvent)
          .groupBy(cliEvent.cliVersion)
          .orderBy(sql`COUNT(*) DESC`)
          .limit(100),
        db
          .select({
            os: cliEvent.os,
            count: sql<number>`COUNT(*)`,
          })
          .from(cliEvent)
          .groupBy(cliEvent.os)
          .orderBy(sql`COUNT(*) DESC`)
          .limit(100),
        db
          .select({
            eventType: cliEvent.eventType,
            count: sql<number>`COUNT(*)`,
          })
          .from(cliEvent)
          .groupBy(cliEvent.eventType)
          .orderBy(sql`COUNT(*) DESC`),
      ]);

      return c.json({
        totalEvents: Number(totals?.totalEvents ?? 0),
        uniqueUsers: Number(totals?.uniqueUsers ?? 0),
        byVersion: byVersion.map((r) => ({
          cliVersion: r.cliVersion,
          count: Number(r.count),
        })),
        byOs: byOs.map((r) => ({ os: r.os, count: Number(r.count) })),
        byEventType: byEventType.map((r) => ({
          eventType: r.eventType,
          count: Number(r.count),
        })),
      });
    },
  );
