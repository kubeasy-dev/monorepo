import { countDistinct, gte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import { db } from "../../db";
import { cliEvent, user, userProgress, userSubmission } from "../../db/schema";
import { sessionSecurity } from "../../lib/openapi-shared";
import { redis } from "../../lib/redis";
import { slidingWindowRateLimit } from "../../middleware/rate-limit";
import type { AppEnv } from "../../middleware/session";

// ── Period / granularity helpers ──────────────────────────────────────────────

const periodSchema = z
  .enum(["24h", "7d", "30d", "3m", "6m", "1y"])
  .default("30d");
const granularitySchema = z
  .enum(["hour", "day", "week", "month"])
  .default("day");

const periodQuerySchema = z.object({ period: periodSchema });
const periodGranQuerySchema = z.object({
  period: periodSchema,
  granularity: granularitySchema,
});

const PERIOD_INTERVALS: Record<string, string> = {
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
  "3m": "3 months",
  "6m": "6 months",
  "1y": "1 year",
};

// PostgreSQL date_trunc truncation level and generate_series step per granularity
const GRAN_TRUNC: Record<string, string> = {
  hour: "hour",
  day: "day",
  week: "week",
  month: "month",
};
const GRAN_STEP: Record<string, string> = {
  hour: "1 hour",
  day: "1 day",
  week: "1 week",
  month: "1 month",
};
// to_char format string per granularity — always produces a sortable ISO-ish string
const GRAN_FORMAT: Record<string, string> = {
  hour: 'YYYY-MM-DD"T"HH24:MI',
  day: "YYYY-MM-DD",
  week: "YYYY-MM-DD",
  month: "YYYY-MM-DD",
};

// ── Output schemas ─────────────────────────────────────────────────────────────

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

const SubmissionsHistogramBucketSchema = z.object({
  date: z.string(),
  ok: z.number(),
  ko: z.number(),
});

const SubmissionsHistogramOutputSchema = z.object({
  buckets: z.array(SubmissionsHistogramBucketSchema),
});

// ── Rate limit ─────────────────────────────────────────────────────────────────

const analyticsRateLimit = slidingWindowRateLimit(redis, {
  windowMs: 60_000,
  max: 30,
  keyFn: (c) =>
    `admin-analytics:${c.get("user")?.id ?? c.req.header("x-forwarded-for") ?? "unknown"}`,
});

// ── Routes ─────────────────────────────────────────────────────────────────────

export const adminAnalytics = new Hono<AppEnv>()
  .get(
    "/funnel",
    describeRoute({
      tags: ["Admin"],
      summary: "Signup → started → completed funnel for a given period",
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
    validator("query", periodQuerySchema),
    analyticsRateLimit,
    async (c) => {
      const { period } = c.req.valid("query");
      const interval = sql.raw(`INTERVAL '${PERIOD_INTERVALS[period]}'`);

      const [[totalRow], [startedRow], [completedRow]] = await Promise.all([
        db
          .select({ totalUsers: sql<number>`COUNT(*)` })
          .from(user)
          .where(gte(user.createdAt, sql`now() - ${interval}`)),
        db
          .select({ usersStarted: sql<number>`COUNT(DISTINCT user_id)` })
          .from(
            db
              .select({ userId: userProgress.userId })
              .from(userProgress)
              .where(
                sql`${userProgress.status} != 'not_started' AND ${userProgress.startedAt} >= now() - ${interval}`,
              )
              .as("s"),
          ),
        db
          .select({ usersCompleted: sql<number>`COUNT(DISTINCT user_id)` })
          .from(
            db
              .select({ userId: userProgress.userId })
              .from(userProgress)
              .where(
                sql`${userProgress.status} = 'completed' AND ${userProgress.completedAt} >= now() - ${interval}`,
              )
              .as("c"),
          ),
      ]);

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
      summary:
        "Funnel evolution over the selected period, bucketed by granularity",
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
    validator("query", periodGranQuerySchema),
    analyticsRateLimit,
    async (c) => {
      const { period, granularity } = c.req.valid("query");
      const trunc = GRAN_TRUNC[granularity];
      const step = GRAN_STEP[granularity];
      const format = GRAN_FORMAT[granularity];
      const interval = PERIOD_INTERVALS[period];

      const rows = await db.execute(sql`
        WITH
        buckets AS (
          SELECT generate_series(
            date_trunc(${trunc}, now() - ${sql.raw(`INTERVAL '${interval}'`)}) ,
            date_trunc(${trunc}, now()),
            ${sql.raw(`'${step}'::interval`)}
          ) AS bucket
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
        period_signups AS (
          SELECT date_trunc(${trunc}, created_at) AS bucket, COUNT(*)::int AS count
          FROM "user"
          WHERE created_at >= now() - ${sql.raw(`INTERVAL '${interval}'`)}
          GROUP BY 1
        ),
        period_starters AS (
          SELECT date_trunc(${trunc}, first_at) AS bucket, COUNT(*)::int AS count
          FROM first_starts
          WHERE first_at >= now() - ${sql.raw(`INTERVAL '${interval}'`)}
          GROUP BY 1
        ),
        period_completers AS (
          SELECT date_trunc(${trunc}, first_at) AS bucket, COUNT(*)::int AS count
          FROM first_completions
          WHERE first_at >= now() - ${sql.raw(`INTERVAL '${interval}'`)}
          GROUP BY 1
        )
        SELECT
          to_char(b.bucket, ${format}) AS week,
          COALESCE(s.count, 0)  AS new_signups,
          COALESCE(st.count, 0) AS new_starters,
          COALESCE(c.count, 0)  AS new_completers
        FROM buckets b
        LEFT JOIN period_signups   s  ON s.bucket  = b.bucket
        LEFT JOIN period_starters  st ON st.bucket = b.bucket
        LEFT JOIN period_completers c ON c.bucket  = b.bucket
        ORDER BY b.bucket
      `);

      const weeks = rows.rows.map((r) => ({
        week: String(r.week),
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
      summary: "Aggregated stats per challenge for a given period",
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
    validator("query", periodQuerySchema),
    analyticsRateLimit,
    async (c) => {
      const { period } = c.req.valid("query");
      const interval = sql.raw(`INTERVAL '${PERIOD_INTERVALS[period]}'`);

      const baseStats = await db
        .select({
          challengeSlug: userSubmission.challengeSlug,
          totalAttempts: sql<number>`COUNT(*)`,
          uniqueUsers: countDistinct(userSubmission.userId),
          validatedSubmissions: sql<number>`COUNT(DISTINCT ${userSubmission.userId}) FILTER (WHERE ${userSubmission.validated} = true)`,
        })
        .from(userSubmission)
        .where(gte(userSubmission.timestamp, sql`now() - ${interval}`))
        .groupBy(userSubmission.challengeSlug)
        .orderBy(userSubmission.challengeSlug);

      const failingObjectivesRows = await db.execute(sql`
        SELECT
          s.challenge_slug,
          obj->>'objectiveKey' AS key,
          COUNT(*) AS fail_count
        FROM user_submission s,
             jsonb_array_elements(s.objectives) AS obj
        WHERE (obj->>'passed')::boolean = false
          AND s.objectives IS NOT NULL
          AND s.timestamp >= now() - ${interval}
        GROUP BY s.challenge_slug, obj->>'objectiveKey'
        ORDER BY s.challenge_slug, COUNT(*) DESC
      `);

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
      summary:
        "CLI events analytics (versions, OS, event type spread) for a given period",
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
    validator("query", periodQuerySchema),
    analyticsRateLimit,
    async (c) => {
      const { period } = c.req.valid("query");
      const interval = sql.raw(`INTERVAL '${PERIOD_INTERVALS[period]}'`);
      const since = sql`now() - ${interval}`;

      const [totals, byVersion, byOs, byEventType] = await Promise.all([
        db
          .select({
            totalEvents: sql<number>`COUNT(*)`,
            uniqueUsers: countDistinct(cliEvent.userId),
          })
          .from(cliEvent)
          .where(gte(cliEvent.createdAt, since))
          .then((rows) => rows[0]),
        db
          .select({
            cliVersion: cliEvent.cliVersion,
            count: sql<number>`COUNT(*)`,
          })
          .from(cliEvent)
          .where(gte(cliEvent.createdAt, since))
          .groupBy(cliEvent.cliVersion)
          .orderBy(sql`COUNT(*) DESC`)
          .limit(100),
        db
          .select({ os: cliEvent.os, count: sql<number>`COUNT(*)` })
          .from(cliEvent)
          .where(gte(cliEvent.createdAt, since))
          .groupBy(cliEvent.os)
          .orderBy(sql`COUNT(*) DESC`)
          .limit(100),
        db
          .select({
            eventType: cliEvent.eventType,
            count: sql<number>`COUNT(*)`,
          })
          .from(cliEvent)
          .where(gte(cliEvent.createdAt, since))
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
  )
  .get(
    "/challenges/:slug/submissions-histogram",
    describeRoute({
      tags: ["Admin"],
      summary:
        "OK/KO submission counts for a challenge, bucketed by granularity",
      security: sessionSecurity,
      responses: {
        200: {
          description: "Submissions histogram",
          content: {
            "application/json": {
              schema: resolver(SubmissionsHistogramOutputSchema),
            },
          },
        },
      },
    }),
    validator("query", periodGranQuerySchema),
    analyticsRateLimit,
    async (c) => {
      const slug = c.req.param("slug");
      const { period, granularity } = c.req.valid("query");
      const trunc = GRAN_TRUNC[granularity];
      const step = GRAN_STEP[granularity];
      const format = GRAN_FORMAT[granularity];
      const interval = PERIOD_INTERVALS[period];

      const rows = await db.execute(sql`
        WITH buckets AS (
          SELECT generate_series(
            date_trunc(${trunc}, now() - ${sql.raw(`INTERVAL '${interval}'`)}),
            date_trunc(${trunc}, now()),
            ${sql.raw(`'${step}'::interval`)}
          ) AS bucket
        ),
        counts AS (
          SELECT
            date_trunc(${trunc}, ${userSubmission.timestamp}) AS bucket,
            COUNT(*) FILTER (WHERE ${userSubmission.validated} = true)  AS ok,
            COUNT(*) FILTER (WHERE ${userSubmission.validated} = false) AS ko
          FROM ${userSubmission}
          WHERE ${userSubmission.challengeSlug} = ${slug}
            AND ${userSubmission.timestamp} >= now() - ${sql.raw(`INTERVAL '${interval}'`)}
          GROUP BY 1
        )
        SELECT
          to_char(b.bucket, ${format}) AS date,
          COALESCE(c.ok, 0) AS ok,
          COALESCE(c.ko, 0) AS ko
        FROM buckets b
        LEFT JOIN counts c ON c.bucket = b.bucket
        ORDER BY b.bucket
      `);

      const buckets = rows.rows.map((r) => ({
        date: String(r.date),
        ok: Number(r.ok),
        ko: Number(r.ko),
      }));

      return c.json({ buckets });
    },
  );
