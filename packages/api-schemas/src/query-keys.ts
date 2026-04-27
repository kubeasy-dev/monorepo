export const queryKeys = {
  challenges: {
    list: (filters: any) => ["challenges", "list", filters] as const,
    detail: (slug: string) => ["challenges", slug, "detail"] as const,
    objectives: (slug: string) => ["challenges", slug, "objectives"] as const,
    status: (slug: string) => ["challenges", slug, "status"] as const,
    submissions: {
      all: (slug: string) => ["challenges", slug, "submissions"] as const,
      latest: (slug: string) =>
        ["challenges", slug, "submissions", "latest"] as const,
    },
  },
  user: {
    xp: () => ["user", "xp"] as const,
    streak: () => ["user", "streak"] as const,
  },
  onboarding: () => ["onboarding"] as const,
} as const;
