import type {
  AnalyticsChallengeItem,
  AnalyticsChallengesOutput,
  AnalyticsCliOutput,
  AnalyticsFunnelOutput,
  AnalyticsFunnelStats,
  AnalyticsPeriod,
} from "@kubeasy/api-schemas/analytics";
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

export type {
  AnalyticsChallengeItem,
  AnalyticsChallengesOutput,
  AnalyticsCliOutput,
  AnalyticsFunnelOutput,
  AnalyticsFunnelStats,
  AnalyticsPeriod,
};

export const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  "24h": "24 h",
  "7d": "7 d",
  "30d": "30 d",
  "3m": "3 mo",
  "6m": "6 mo",
  "1y": "1 yr",
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

export function adminAnalyticsFunnelOptions(
  period: AnalyticsPeriod,
  compare = false,
) {
  return queryOptions({
    queryKey: ["admin", "analytics", "funnel", period, compare],
    queryFn: () =>
      apiFetch<AnalyticsFunnelOutput>(
        `/admin/analytics/funnel?period=${period}&compare=${compare}`,
      ),
  });
}

export function adminAnalyticsChallengesOptions(
  period: AnalyticsPeriod,
  compare = false,
) {
  return queryOptions({
    queryKey: ["admin", "analytics", "challenges", period, compare],
    queryFn: () =>
      apiFetch<AnalyticsChallengesOutput>(
        `/admin/analytics/challenges?period=${period}&compare=${compare}`,
      ),
  });
}

export function adminAnalyticsCliOptions(
  period: AnalyticsPeriod,
  compare = false,
) {
  return queryOptions({
    queryKey: ["admin", "analytics", "cli", period, compare],
    queryFn: () =>
      apiFetch<AnalyticsCliOutput>(
        `/admin/analytics/cli?period=${period}&compare=${compare}`,
      ),
  });
}
