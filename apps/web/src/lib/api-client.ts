import type {
  AdminChallengeListOutput,
  AdminStatsOutput,
  ChallengeGetBySlugOutput,
  ChallengeGetObjectivesOutput,
  ChallengeListInput,
  ChallengeListOutput,
} from "@kubeasy/api-schemas/challenges";

export interface ChallengeTypeItem {
  slug: string;
  name: string;
  description: string;
  logo: string | null;
  challengeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubmissionItem {
  id: number;
  userId: string;
  challengeId: number;
  validated: boolean;
  objectives: unknown;
  timestamp: string | null;
  validatedAt?: string | null;
}

export interface SubmissionsOutput {
  submissions: SubmissionItem[];
}

import type {
  CompletionPercentageOutput,
  GetStatusOutput,
  LatestValidationStatusOutput,
  ResetChallengeOutput,
  StartChallengeOutput,
  StreakOutput,
  XpAndRankOutput,
} from "@kubeasy/api-schemas/progress";
import type { Theme, ThemeListOutput } from "@kubeasy/api-schemas/themes";
import type { XpTransaction } from "@kubeasy/api-schemas/xp";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}/api${path}`;

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  if (init.method && init.method !== "GET") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  challenges: {
    list: (params?: ChallengeListInput) => {
      const search = new URLSearchParams();
      if (params?.difficulty) search.set("difficulty", params.difficulty);
      if (params?.type) search.set("type", params.type);
      if (params?.theme) search.set("theme", params.theme);
      if (params?.search) search.set("search", params.search);
      if (params?.showCompleted === false) search.set("showCompleted", "false");
      const qs = search.toString();
      return apiFetch<ChallengeListOutput>(`/challenges${qs ? `?${qs}` : ""}`);
    },
    getBySlug: (slug: string) =>
      apiFetch<ChallengeGetBySlugOutput>(`/challenges/${slug}`),
    getObjectives: (slug: string) =>
      apiFetch<ChallengeGetObjectivesOutput>(`/challenges/${slug}/objectives`),
  },

  themes: {
    list: () => apiFetch<ThemeListOutput>("/themes"),
    getBySlug: (slug: string) => apiFetch<Theme>(`/themes/${slug}`),
  },

  types: {
    list: () => apiFetch<ChallengeTypeItem[]>("/types"),
    getBySlug: (slug: string) => apiFetch<ChallengeTypeItem>(`/types/${slug}`),
  },

  progress: {
    /**
     * GET /api/progress/completion
     * Query params: splitByTheme, themeSlug
     */
    completion: (params?: { splitByTheme?: boolean; themeSlug?: string }) => {
      const search = new URLSearchParams();
      if (params?.splitByTheme) search.set("splitByTheme", "true");
      if (params?.themeSlug) search.set("themeSlug", params.themeSlug);
      const qs = search.toString();
      return apiFetch<CompletionPercentageOutput>(
        `/progress/completion${qs ? `?${qs}` : ""}`,
      );
    },

    /**
     * GET /api/progress/:slug
     * Returns challenge status for authenticated user
     */
    status: (slug: string) => apiFetch<GetStatusOutput>(`/progress/${slug}`),

    /**
     * POST /api/progress/:slug/start
     * Creates or updates user progress to in_progress
     */
    start: (challengeSlug: string) =>
      apiFetch<StartChallengeOutput>(`/progress/${challengeSlug}/start`, {
        method: "POST",
        body: "{}",
      }),

    /**
     * DELETE /api/progress/:slug/reset
     * Deletes progress, submissions, and XP transactions for a challenge
     */
    reset: (challengeSlug: string) =>
      apiFetch<ResetChallengeOutput>(`/progress/${challengeSlug}/reset`, {
        method: "DELETE",
      }),
  },

  submissions: {
    /**
     * GET /api/submissions/:slug
     * Returns all submissions for a challenge by the current user
     */
    getBySlug: (slug: string) =>
      apiFetch<SubmissionsOutput>(`/submissions/${slug}`),

    /**
     * GET /api/submissions/:slug/latest
     * Returns latest validation status for a challenge
     */
    latestValidation: (slug: string) =>
      apiFetch<LatestValidationStatusOutput>(`/submissions/${slug}/latest`),
  },

  user: {
    xp: () => apiFetch<XpAndRankOutput>("/user/xp"),
    streak: () => apiFetch<StreakOutput>("/user/streak"),
    /**
     * PATCH /api/user/name
     * Updates user name
     */
    updateName: (firstName: string, lastName?: string) =>
      apiFetch<unknown>("/user/name", {
        method: "PATCH",
        body: JSON.stringify({ firstName, lastName }),
      }),
  },

  xp: {
    /**
     * GET /api/xp/history
     * Returns last 20 XP transactions with challenge details
     */
    transactions: () => apiFetch<XpTransaction[]>("/xp/history"),
  },

  admin: {
    challenges: () => apiFetch<AdminChallengeListOutput>("/admin/challenges"),
    stats: () => apiFetch<AdminStatsOutput>("/admin/stats"),
  },
};
