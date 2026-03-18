import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import { ChallengesGrid } from "@/components/challenges-grid";
import { ThemeHero } from "@/components/theme-hero";
import { challengeListOptions, themeDetailOptions } from "@/lib/query-options";

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

export const Route = createFileRoute("/themes/$slug")({
  loader: async ({ context: { queryClient }, params }) => {
    await Promise.all([
      queryClient.ensureQueryData(themeDetailOptions(params.slug)),
      queryClient.ensureQueryData(challengeListOptions({ theme: params.slug })),
    ]);
  },
  component: ThemeDetailPage,
});

function ThemeDetailPage() {
  const { slug } = Route.useParams();
  const { data: theme } = useSuspenseQuery(themeDetailOptions(slug));
  const { data: challengeData } = useSuspenseQuery(
    challengeListOptions({ theme: slug }),
  );

  if (!theme) {
    throw notFound();
  }

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      {/* Back Button */}
      <Link
        to="/themes"
        className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-secondary neo-border-thick neo-shadow hover:neo-shadow-lg hover:-translate-y-0.5 transition-all font-black"
      >
        <ArrowLeft className="h-4 w-4" />
        All Themes
      </Link>

      {/* Theme Hero */}
      <ThemeHero theme={theme} totalChallenges={challengeData.count} />

      {/* Challenges Grid */}
      <Suspense fallback={<ChallengesGridSkeleton />}>
        <ChallengesGrid filters={{ theme: slug }} />
      </Suspense>
    </div>
  );
}
