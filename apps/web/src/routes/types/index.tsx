import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import type { LucideIconName } from "@/components/lucide-icon";
import { TypeCard } from "@/components/type-card";
import type { ChallengeTypeItem } from "@/lib/api-client";
import { typeListOptions } from "@/lib/query-options";

export const Route = createFileRoute("/types/")({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(typeListOptions());
  },
  component: TypeListPage,
});

function TypeListPage() {
  const { data: types } = useSuspenseQuery(typeListOptions());

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      {/* Hero Section */}
      <div className="mb-12 space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white neo-border-thick font-black neo-shadow uppercase text-sm">
          <TrendingUp className="h-4 w-4" />
          <span>Browse by Type</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-balance leading-tight">
          Explore Kubernetes
          <br />
          <span className="text-primary">by Challenge Type</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed font-bold">
          Choose the type of challenge that matches your learning goals. Fix
          broken deployments, build new resources from scratch, or migrate
          existing configurations.
        </p>
      </div>

      {/* Type Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(types as ChallengeTypeItem[]).map((type) => (
          <TypeCard
            key={type.slug}
            type={{
              name: type.name,
              slug: type.slug,
              description: type.description,
              logo: type.logo as LucideIconName | null,
              challengeCount: type.challengeCount ?? 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
