import type {
  AdminUserListOutput,
  AdminUserStatsOutput,
} from "@kubeasy/api-schemas/auth";
import type {
  AdminChallengeListOutput,
  AdminStatsOutput,
} from "@kubeasy/api-schemas/challenges";
import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

// ── Period / granularity types (mirrored from API) ────────────────────────────

export type AnalyticsPeriod = "24h" | "7d" | "30d" | "3m" | "6m" | "1y";
export type AnalyticsGranularity = "hour" | "day" | "week" | "month";

export const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  "24h": "24 h",
  "7d": "7 d",
  "30d": "30 d",
  "3m": "3 mo",
  "6m": "6 mo",
  "1y": "1 yr",
};

export const GRANULARITY_LABELS: Record<AnalyticsGranularity, string> = {
  hour: "Hour",
  day: "Day",
  week: "Week",
  month: "Month",
};

/** Granularities available for each period. */
export const PERIOD_GRANULARITIES: Record<
  AnalyticsPeriod,
  AnalyticsGranularity[]
> = {
  "24h": ["hour", "day"],
  "7d": ["day", "week"],
  "30d": ["day", "week"],
  "3m": ["week", "month"],
  "6m": ["week", "month"],
  "1y": ["week", "month"],
};

/** Default granularity for each period. */
export const PERIOD_DEFAULT_GRANULARITY: Record<
  AnalyticsPeriod,
  AnalyticsGranularity
> = {
  "24h": "hour",
  "7d": "day",
  "30d": "day",
  "3m": "week",
  "6m": "week",
  "1y": "month",
};

// ── Shared output types ───────────────────────────────────────────────────────

export type AnalyticsFunnelOutput = {
  totalUsers: number;
  usersStarted: number;
  usersCompleted: number;
};

export type AnalyticsChallengeItem = {
  challengeSlug: string;
  totalAttempts: number;
  uniqueUsers: number;
  validatedSubmissions: number;
  completionRate: number;
  avgAttempts: number;
  topFailingObjectives: { key: string; failCount: number }[];
};

export type AnalyticsChallengesOutput = {
  challenges: AnalyticsChallengeItem[];
};

export type AnalyticsCliOutput = {
  totalEvents: number;
  uniqueUsers: number;
  byVersion: { cliVersion: string; count: number }[];
  byOs: { os: string; count: number }[];
  byEventType: { eventType: string; count: number }[];
};

export type AnalyticsFunnelHistoryOutput = {
  weeks: {
    week: string;
    newSignups: number;
    newStarters: number;
    newCompleters: number;
  }[];
};

export type AnalyticsSubmissionsHistogramOutput = {
  buckets: { date: string; ok: number; ko: number }[];
};

// ── Query options ─────────────────────────────────────────────────────────────

export function adminChallengesOptions() {
  return queryOptions({
    queryKey: ["admin", "challenges"],
    queryFn: () => apiFetch<AdminChallengeListOutput>("/admin/challenges"),
  });
}

export function adminChallengesStatsOptions() {
  return queryOptions({
    queryKey: ["admin", "challenges", "stats"],
    queryFn: () => apiFetch<AdminStatsOutput>("/admin/challenges/stats"),
  });
}

export function adminUsersOptions(page = 1) {
  return queryOptions({
    queryKey: ["admin", "users", page],
    queryFn: () =>
      apiFetch<AdminUserListOutput>(`/admin/users?page=${page}&limit=50`),
  });
}

export function adminUsersStatsOptions() {
  return queryOptions({
    queryKey: ["admin", "users", "stats"],
    queryFn: () => apiFetch<AdminUserStatsOutput>("/admin/users/stats"),
  });
}

export function adminAnalyticsFunnelOptions(period: AnalyticsPeriod) {
  return queryOptions({
    queryKey: ["admin", "analytics", "funnel", period],
    queryFn: () =>
      apiFetch<AnalyticsFunnelOutput>(
        `/admin/analytics/funnel?period=${period}`,
      ),
  });
}

export function adminAnalyticsChallengesOptions(period: AnalyticsPeriod) {
  return queryOptions({
    queryKey: ["admin", "analytics", "challenges", period],
    queryFn: () =>
      apiFetch<AnalyticsChallengesOutput>(
        `/admin/analytics/challenges?period=${period}`,
      ),
  });
}

export function adminAnalyticsCliOptions(period: AnalyticsPeriod) {
  return queryOptions({
    queryKey: ["admin", "analytics", "cli", period],
    queryFn: () =>
      apiFetch<AnalyticsCliOutput>(`/admin/analytics/cli?period=${period}`),
  });
}

export function adminAnalyticsFunnelHistoryOptions(
  period: AnalyticsPeriod,
  granularity: AnalyticsGranularity,
) {
  return queryOptions({
    queryKey: ["admin", "analytics", "funnel", "history", period, granularity],
    queryFn: () =>
      apiFetch<AnalyticsFunnelHistoryOutput>(
        `/admin/analytics/funnel/history?period=${period}&granularity=${granularity}`,
      ),
  });
}

export function adminAnalyticsChallengeHistogramOptions(
  slug: string,
  period: AnalyticsPeriod,
  granularity: AnalyticsGranularity,
) {
  return queryOptions({
    queryKey: [
      "admin",
      "analytics",
      "challenges",
      slug,
      "histogram",
      period,
      granularity,
    ],
    queryFn: () =>
      apiFetch<AnalyticsSubmissionsHistogramOutput>(
        `/admin/analytics/challenges/${slug}/submissions-histogram?period=${period}&granularity=${granularity}`,
      ),
  });
}
