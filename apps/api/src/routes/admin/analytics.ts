import { countDistinct, sql } from "drizzle-orm";
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

// compare=true fetches the previous period and includes it in the response
const compareSchema = z
  .string()
  .optional()
  .transform((v) => v === "true");

const periodQuerySchema = z.object({
  period: periodSchema,
  compare: compareSchema,
});
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

// ── Period range helper ────────────────────────────────────────────────────────

/** Returns a SQL condition for col within the current or previous period window. */
// col is typed as unknown because Drizzle's sql tag accepts any interpolated value
function periodWhere(col: unknown, interval: string, prev: boolean) {
  const i = sql.raw(`INTERVAL '${interval}'`);
  if (prev) {
    return sql`${col} >= now() - 2 * ${i} AND ${col} < now() - ${i}`;
  }
  return sql`${col} >= now() - ${i}`;
}

// ── Output schemas ─────────────────────────────────────────────────────────────

const FunnelStatsSchema = z.object({
  totalUsers: z.number(),
  usersStarted: z.number(),
  usersCompleted: z.number(),
});

const FunnelOutputSchema = FunnelStatsSchema.extend({
  previous: FunnelStatsSchema.optional(),
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

const ChallengeStatsPrevSchema = z.object({
  challengeSlug: z.string(),
  completionRate: z.number().min(0).max(1),
  uniqueUsers: z.number(),
  totalAttempts: z.number(),
  avgAttempts: z.number().min(0),
});

const ChallengesAnalyticsOutputSchema = z.object({
  challenges: z.array(ChallengeStatsItemSchema),
  previous: z.array(ChallengeStatsPrevSchema).optional(),
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
      const { period, compare } = c.req.valid("query");
      const i = PERIOD_INTERVALS[period];

      // Cohort funnel: all three metrics are scoped to users who signed up
      // in the period. usersStarted/usersCompleted use all-time progress so
      // a signup from day 1 of the window who completes on day 30 is counted.
      async function fetchFunnelStats(prev: boolean) {
        const cohort = db
          .select({ id: user.id })
          .from(user)
          .where(periodWhere(user.createdAt, i, prev))
          .as("cohort");

        const [[totalRow], [startedRow], [completedRow]] = await Promise.all([
          db.select({ totalUsers: sql<number>`COUNT(*)` }).from(cohort),
          db
            .select({ usersStarted: countDistinct(userProgress.userId) })
            .from(userProgress)
            .innerJoin(cohort, sql`${userProgress.userId} = cohort.id`)
            .where(sql`${userProgress.status} != 'not_started'`),
          db
            .select({ usersCompleted: countDistinct(userProgress.userId) })
            .from(userProgress)
            .innerJoin(cohort, sql`${userProgress.userId} = cohort.id`)
            .where(sql`${userProgress.status} = 'completed'`),
        ]);
        return {
          totalUsers: Number(totalRow?.totalUsers ?? 0),
          usersStarted: Number(startedRow?.usersStarted ?? 0),
          usersCompleted: Number(completedRow?.usersCompleted ?? 0),
        };
      }

      const [current, previous] = await Promise.all([
        fetchFunnelStats(false),
        compare ? fetchFunnelStats(true) : Promise.resolve(undefined),
      ]);

      return c.json({ ...current, previous });
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
      const { period, compare } = c.req.valid("query");
      const i = PERIOD_INTERVALS[period];

      async function fetchBaseStats(prev: boolean) {
        return db
          .select({
            challengeSlug: userSubmission.challengeSlug,
            totalAttempts: sql<number>`COUNT(*)`,
            uniqueUsers: countDistinct(userSubmission.userId),
            validatedSubmissions: sql<number>`COUNT(DISTINCT ${userSubmission.userId}) FILTER (WHERE ${userSubmission.validated} = true)`,
          })
          .from(userSubmission)
          .where(periodWhere(userSubmission.timestamp, i, prev))
          .groupBy(userSubmission.challengeSlug)
          .orderBy(userSubmission.challengeSlug);
      }

      const [baseStats, prevStats, failingObjectivesRows] = await Promise.all([
        fetchBaseStats(false),
        compare
          ? fetchBaseStats(true)
          : Promise.resolve([] as Awaited<ReturnType<typeof fetchBaseStats>>),
        db.execute(sql`
          SELECT
            s.challenge_slug,
            obj->>'key' AS key,
            COUNT(*) AS fail_count
          FROM user_submission s,
               jsonb_array_elements(s.objectives) AS obj
          WHERE (obj->>'passed')::boolean = false
            AND s.objectives IS NOT NULL
            AND ${periodWhere(sql`s.timestamp`, i, false)}
          GROUP BY s.challenge_slug, obj->>'key'
          ORDER BY s.challenge_slug, COUNT(*) DESC
        `),
      ]);

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
        return {
          challengeSlug: row.challengeSlug,
          totalAttempts,
          uniqueUsers,
          validatedSubmissions,
          completionRate,
          avgAttempts,
          topFailingObjectives: failingBySlug.get(row.challengeSlug) ?? [],
        };
      });

      const previous = compare
        ? prevStats.map((row) => {
            const totalAttempts = Number(row.totalAttempts);
            const uniqueUsers = Number(row.uniqueUsers);
            const validatedSubmissions = Number(row.validatedSubmissions);
            return {
              challengeSlug: row.challengeSlug,
              totalAttempts,
              uniqueUsers,
              completionRate:
                uniqueUsers > 0 ? validatedSubmissions / uniqueUsers : 0,
              avgAttempts: uniqueUsers > 0 ? totalAttempts / uniqueUsers : 0,
            };
          })
        : undefined;

      return c.json({ challenges, previous });
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
                  previous: z
                    .object({
                      totalEvents: z.number(),
                      uniqueUsers: z.number(),
                    })
                    .optional(),
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
      const { period, compare } = c.req.valid("query");
      const i = PERIOD_INTERVALS[period];

      function fetchCliTotals(prev: boolean) {
        return db
          .select({
            totalEvents: sql<number>`COUNT(*)`,
            uniqueUsers: countDistinct(cliEvent.userId),
          })
          .from(cliEvent)
          .where(periodWhere(cliEvent.createdAt, i, prev))
          .then((rows) => rows[0]);
      }

      const [totals, prevTotals, byVersion, byOs, byEventType] =
        await Promise.all([
          fetchCliTotals(false),
          compare ? fetchCliTotals(true) : Promise.resolve(undefined),
          db
            .select({
              cliVersion: cliEvent.cliVersion,
              count: sql<number>`COUNT(*)`,
            })
            .from(cliEvent)
            .where(periodWhere(cliEvent.createdAt, i, false))
            .groupBy(cliEvent.cliVersion)
            .orderBy(sql`COUNT(*) DESC`)
            .limit(100),
          db
            .select({ os: cliEvent.os, count: sql<number>`COUNT(*)` })
            .from(cliEvent)
            .where(periodWhere(cliEvent.createdAt, i, false))
            .groupBy(cliEvent.os)
            .orderBy(sql`COUNT(*) DESC`)
            .limit(100),
          db
            .select({
              eventType: cliEvent.eventType,
              count: sql<number>`COUNT(*)`,
            })
            .from(cliEvent)
            .where(periodWhere(cliEvent.createdAt, i, false))
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
        previous: prevTotals
          ? {
              totalEvents: Number(prevTotals.totalEvents ?? 0),
              uniqueUsers: Number(prevTotals.uniqueUsers ?? 0),
            }
          : undefined,
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
