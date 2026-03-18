import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import { ChallengesGrid } from "@/components/challenges-grid";
import { TypeHero } from "@/components/type-hero";
import type { ChallengeTypeItem } from "@/lib/api-client";
import { challengeListOptions, typeDetailOptions } from "@/lib/query-options";

function ChallengesGridSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }, (_, i) => `skeleton-${i}`).map((key) => (
        <div
          key={key}
          className="bg-secondary neo-border-thick neo-shadow p-6 animate-pulse h-64"
        />
      ))}
    </div>
  );
}

export const Route = createFileRoute("/types/$slug")({
  loader: async ({ context: { queryClient }, params }) => {
    await Promise.all([
      queryClient.ensureQueryData(typeDetailOptions(params.slug)),
      queryClient.ensureQueryData(challengeListOptions({ type: params.slug })),
    ]);
  },
  component: TypeDetailPage,
});

function TypeDetailPage() {
  const { slug } = Route.useParams();
  const { data: type } = useSuspenseQuery(typeDetailOptions(slug));
  const { data: challengeData } = useSuspenseQuery(
    challengeListOptions({ type: slug }),
  );

  if (!type) {
    throw notFound();
  }

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      {/* Back Button */}
      <Link
        to="/types"
        className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-secondary neo-border-thick neo-shadow hover:neo-shadow-lg hover:-translate-y-0.5 transition-all font-black"
      >
        <ArrowLeft className="h-4 w-4" />
        All Types
      </Link>

      {/* Type Hero */}
      <TypeHero
        type={type as ChallengeTypeItem}
        totalChallenges={challengeData.count}
      />

      {/* Challenges Grid */}
      <Suspense fallback={<ChallengesGridSkeleton />}>
        <ChallengesGrid filters={{ type: slug }} />
      </Suspense>
    </div>
  );
}
