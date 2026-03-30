import type { ChallengeListInput } from "@kubeasy/api-schemas/challenges";
import { queryOptions } from "@tanstack/react-query";
import { api } from "./api-client";
import { fetchBlogPostDetailFn, fetchBlogPostsFn } from "./blog.functions";

// --- Challenges ---

export function challengeListOptions(params?: ChallengeListInput) {
  // Strip undefined values so challengeListOptions() and challengeListOptions({ difficulty: undefined, ... })
  // produce the same query key — avoids SSG cache miss on hydration.
  const normalized = params
    ? Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined),
      )
    : {};
  return queryOptions({
    queryKey: ["challenges", "list", normalized],
    queryFn: () => api.challenges.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function challengeDetailOptions(slug: string) {
  return queryOptions({
    queryKey: ["challenges", "detail", slug],
    queryFn: () => api.challenges.getBySlug(slug),
    staleTime: 60 * 60 * 1000, // 1h — matches ISR revalidation window
  });
}

export function challengeObjectivesOptions(slug: string) {
  return queryOptions({
    queryKey: ["challenges", "objectives", slug],
    queryFn: () => api.challenges.getObjectives(slug),
    staleTime: 60 * 60 * 1000,
  });
}

// --- Themes ---

export function themeListOptions() {
  return queryOptions({
    queryKey: ["themes", "list"],
    queryFn: () => api.themes.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function themeDetailOptions(slug: string) {
  return queryOptions({
    queryKey: ["themes", "detail", slug],
    queryFn: () => api.themes.getBySlug(slug),
  });
}

// --- Types ---

export function typeListOptions() {
  return queryOptions({
    queryKey: ["types", "list"],
    queryFn: () => api.types.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function typeDetailOptions(slug: string) {
  return queryOptions({
    queryKey: ["types", "detail", slug],
    queryFn: () => api.types.getBySlug(slug),
  });
}

// --- User stats (auth-required) ---

export function userStatsOptions() {
  return queryOptions({
    queryKey: ["user", "stats"],
    queryFn: () =>
      Promise.all([api.user.xp(), api.user.streak()]).then(([xp, streak]) => ({
        xp,
        streak,
      })),
  });
}

// --- Progress (auth-required) ---

export function completionOptions(params?: {
  splitByTheme?: boolean;
  themeSlug?: string;
}) {
  return queryOptions({
    queryKey: ["progress", "completion", params ?? {}],
    queryFn: () => api.progress.completion(params),
  });
}

export function challengeStatusOptions(slug: string) {
  return queryOptions({
    queryKey: ["progress", "status", slug],
    queryFn: () => api.progress.status(slug),
  });
}

// --- Submissions ---

export function submissionsOptions(slug: string) {
  return queryOptions({
    queryKey: ["submissions", slug],
    queryFn: () => api.submissions.getBySlug(slug),
  });
}

export function latestValidationOptions(slug: string) {
  return queryOptions({
    queryKey: ["submissions", "latest", slug],
    queryFn: () => api.submissions.latestValidation(slug),
  });
}

// --- User (auth-required) ---

export function userXpOptions() {
  return queryOptions({
    queryKey: ["user", "xp"],
    queryFn: () => api.user.xp(),
  });
}

export function userStreakOptions() {
  return queryOptions({
    queryKey: ["user", "streak"],
    queryFn: () => api.user.streak(),
  });
}

// --- XP ---

export function xpTransactionsOptions() {
  return queryOptions({
    queryKey: ["xp", "transactions"],
    queryFn: () => api.xp.transactions(),
  });
}

// --- Blog ---

export function blogListOptions() {
  return queryOptions({
    queryKey: ["blog", "list"],
    queryFn: () => fetchBlogPostsFn(),
    staleTime: 10 * 60 * 1000, // 10 min — blog content changes infrequently
  });
}

export function blogPostDetailOptions(slug: string) {
  return queryOptions({
    queryKey: ["blog", "detail", slug],
    queryFn: () => fetchBlogPostDetailFn({ data: slug }),
    staleTime: 10 * 60 * 1000,
  });
}

// --- Admin ---

export function adminChallengesOptions() {
  return queryOptions({
    queryKey: ["admin", "challenges"],
    queryFn: () => api.admin.challenges(),
  });
}

export function adminStatsOptions() {
  return queryOptions({
    queryKey: ["admin", "stats"],
    queryFn: () => api.admin.stats(),
  });
}
