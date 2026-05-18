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

export function adminAnalyticsFunnelOptions() {
  return queryOptions({
    queryKey: ["admin", "analytics", "funnel"],
    queryFn: () => apiFetch<AnalyticsFunnelOutput>("/admin/analytics/funnel"),
  });
}

export function adminAnalyticsChallengesOptions() {
  return queryOptions({
    queryKey: ["admin", "analytics", "challenges"],
    queryFn: () =>
      apiFetch<AnalyticsChallengesOutput>("/admin/analytics/challenges"),
  });
}

export function adminAnalyticsCliOptions() {
  return queryOptions({
    queryKey: ["admin", "analytics", "cli"],
    queryFn: () => apiFetch<AnalyticsCliOutput>("/admin/analytics/cli"),
  });
}
