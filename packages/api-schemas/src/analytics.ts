import { z } from "zod";

// ── Period ────────────────────────────────────────────────────────────────────

export const AnalyticsPeriodSchema = z.enum([
  "24h",
  "7d",
  "30d",
  "3m",
  "6m",
  "1y",
]);
export type AnalyticsPeriod = z.infer<typeof AnalyticsPeriodSchema>;

// ── Funnel ────────────────────────────────────────────────────────────────────

export const AnalyticsFunnelStatsSchema = z.object({
  totalUsers: z.number(),
  usersStarted: z.number(),
  usersCompleted: z.number(),
});
export type AnalyticsFunnelStats = z.infer<typeof AnalyticsFunnelStatsSchema>;

export const AnalyticsFunnelOutputSchema = AnalyticsFunnelStatsSchema.extend({
  previous: AnalyticsFunnelStatsSchema.optional(),
});
export type AnalyticsFunnelOutput = z.infer<typeof AnalyticsFunnelOutputSchema>;

// ── Challenges ────────────────────────────────────────────────────────────────

export const AnalyticsFailingObjectiveSchema = z.object({
  key: z.string(),
  failCount: z.number(),
});

export const AnalyticsChallengeItemSchema = z.object({
  challengeSlug: z.string(),
  totalAttempts: z.number(),
  uniqueUsers: z.number(),
  validatedSubmissions: z.number(),
  completionRate: z.number().min(0).max(1),
  avgAttempts: z.number().min(0),
  topFailingObjectives: z.array(AnalyticsFailingObjectiveSchema),
});
export type AnalyticsChallengeItem = z.infer<
  typeof AnalyticsChallengeItemSchema
>;

export const AnalyticsChallengePrevItemSchema = z.object({
  challengeSlug: z.string(),
  completionRate: z.number().min(0).max(1),
  uniqueUsers: z.number(),
  totalAttempts: z.number(),
  avgAttempts: z.number().min(0),
});
export type AnalyticsChallengePrevItem = z.infer<
  typeof AnalyticsChallengePrevItemSchema
>;

export const AnalyticsChallengesOutputSchema = z.object({
  challenges: z.array(AnalyticsChallengeItemSchema),
  previous: z.array(AnalyticsChallengePrevItemSchema).optional(),
});
export type AnalyticsChallengesOutput = z.infer<
  typeof AnalyticsChallengesOutputSchema
>;

// ── CLI ───────────────────────────────────────────────────────────────────────

export const AnalyticsCliOutputSchema = z.object({
  totalEvents: z.number(),
  uniqueUsers: z.number(),
  byVersion: z.array(z.object({ cliVersion: z.string(), count: z.number() })),
  byOs: z.array(z.object({ os: z.string(), count: z.number() })),
  byEventType: z.array(z.object({ eventType: z.string(), count: z.number() })),
  previous: z
    .object({ totalEvents: z.number(), uniqueUsers: z.number() })
    .optional(),
});
export type AnalyticsCliOutput = z.infer<typeof AnalyticsCliOutputSchema>;
