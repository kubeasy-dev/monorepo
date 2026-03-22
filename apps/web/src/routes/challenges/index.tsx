import type { ChallengeListInput } from "@kubeasy/api-schemas/challenges";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { Suspense, useState } from "react";
import { z } from "zod";
import { ChallengesFilters } from "@/components/challenges-filters";
import { ChallengesGrid } from "@/components/challenges-grid";
import { ChallengesQuickStartCTA } from "@/components/challenges-quick-start-cta";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
  challengeListOptions,
  themeListOptions,
  typeListOptions,
} from "@/lib/query-options";
import { serverLog } from "@/lib/server-log";

const challengeSearchSchema = z.object({
  difficulty: z.string().optional(),
  type: z.string().optional(),
  theme: z.string().optional(),
  search: z.string().optional(),
});

export const Route = createFileRoute("/challenges/")({
  validateSearch: challengeSearchSchema,
  loader: async ({ context: { queryClient } }) => {
    await serverLog.info("page.load", { page: "challenges.list" });
    await Promise.all([
      queryClient.ensureQueryData(challengeListOptions()),
      queryClient.ensureQueryData(themeListOptions()),
      queryClient.ensureQueryData(typeListOptions()),
    ]);
  },
  component: ChallengesListingPage,
});

function ChallengesView() {
  const { data: session } = authClient.useSession();
  const [filters, setFilters] = useState<ChallengeListInput>({
    difficulty: undefined,
    theme: undefined,
    type: undefined,
    search: undefined,
    showCompleted: true,
  });

  return (
    <>
      {/* Filters */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Suspense fallback={<div>Loading filters...</div>}>
            <ChallengesFilters
              onFilterChange={(newFilters) =>
                setFilters({
                  difficulty: newFilters.difficulty,
                  theme: newFilters.theme,
                  type: newFilters.type,
                  search: newFilters.search,
                  showCompleted: filters.showCompleted,
                })
              }
            />
          </Suspense>
          {session && (
            <Button
              variant={filters.showCompleted ? "outline" : "default"}
              onClick={() =>
                setFilters({
                  ...filters,
                  showCompleted: !filters.showCompleted,
                })
              }
              className="neo-border-thick font-black neo-shadow hover:neo-shadow-lg transition-shadow px-6 py-6 text-base"
            >
              {filters.showCompleted ? "Hide Completed" : "Show Completed"}
            </Button>
          )}
        </div>
      </div>

      {/* Challenges Grid */}
      <Suspense fallback={<div>Loading challenges...</div>}>
        <ChallengesGrid filters={filters} />
      </Suspense>
    </>
  );
}

function ChallengesListingPage() {
  const { data } = useSuspenseQuery(challengeListOptions());

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      {/* Hero Section */}
      <div className="mb-12 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-foreground neo-border-thick font-bold neo-shadow">
          <Trophy className="h-4 w-4" />
          <span>{data.count} Challenges Available</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-balance">
          Kubernetes Challenges
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed font-bold">
          Master Kubernetes through hands-on practice. Each challenge is
          designed to teach you real-world skills you&apos;ll use in production.
        </p>
      </div>

      {/* Quick Start CTA - Only shown to unauthenticated users */}
      <ChallengesQuickStartCTA />

      {/* All Challenges View */}
      <ChallengesView />
    </div>
  );
}
