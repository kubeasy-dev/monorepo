import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Clock } from "lucide-react";
import { ChallengeMission } from "@/components/challenge-mission";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  challengeDetailOptions,
  challengeObjectivesOptions,
} from "@/lib/query-options";

export const Route = createFileRoute("/challenges/$slug")({
  loader: async ({ context: { queryClient }, params }) => {
    // SSR prefetch: base challenge data (WEB-03)
    await Promise.all([
      queryClient.ensureQueryData(challengeDetailOptions(params.slug)),
      queryClient.ensureQueryData(challengeObjectivesOptions(params.slug)),
    ]);
    // NOTE: Do NOT prefetch latestValidation or challengeStatus here
    // Those are client-only (WEB-05 hybrid rendering)
  },
  component: ChallengeDetailPage,
});

function ChallengeDetailPage() {
  const { slug } = Route.useParams();

  // SSR-hydrated data (no loading spinner)
  const { data: detail } = useSuspenseQuery(challengeDetailOptions(slug));

  if (!detail.challenge) {
    throw notFound();
  }

  const challenge = detail.challenge;

  return (
    <div className="container mx-auto max-w-4xl">
      {/* Back Button */}
      <Link
        to="/challenges"
        className="mb-6 inline-flex items-center neo-border-thick neo-shadow hover:neo-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] transition-all px-4 py-2 font-bold"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Challenges
      </Link>

      {/* Challenge Header */}
      <div className="space-y-6 mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <DifficultyBadge difficulty={challenge.difficulty} size="lg" />
          <Link
            to="/themes/$slug"
            params={{ slug: challenge.themeSlug }}
            className="hover:opacity-80 transition-opacity"
          >
            <Badge
              variant="secondary"
              className="capitalize neo-border-thick neo-shadow px-4 py-1.5 text-base font-bold cursor-pointer"
            >
              {challenge.theme}
            </Badge>
          </Link>
          <Link
            to="/types/$slug"
            params={{ slug: challenge.typeSlug }}
            className="hover:opacity-80 transition-opacity"
          >
            <Badge
              variant="outline"
              className="capitalize neo-border-thick neo-shadow px-4 py-1.5 text-base font-bold cursor-pointer"
            >
              {challenge.type}
            </Badge>
          </Link>
          {challenge.ofTheWeek && (
            <Badge className="neo-border-thick neo-shadow px-4 py-1.5 text-base font-bold bg-accent text-black">
              Challenge of the Week
            </Badge>
          )}
        </div>

        <h1 className="text-5xl md:text-6xl font-black text-balance leading-tight">
          {challenge.title}
        </h1>
        <p className="text-xl text-foreground/80 leading-relaxed font-medium">
          {challenge.description}
        </p>

        <div className="flex flex-wrap gap-6 text-base font-bold">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span>{challenge.estimatedTime} min</span>
          </div>
        </div>
      </div>

      <Separator className="my-8 h-1 bg-black" />

      {/* Initial Situation */}
      <Card className="mb-8 neo-border-thick neo-shadow-xl bg-secondary">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6" />
            <CardTitle className="text-2xl font-black">
              Initial Situation
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-base font-medium whitespace-pre-line">
            {challenge.initialSituation}
          </p>
        </CardContent>
      </Card>

      {/* Challenge Mission with Real-time Validation Status */}
      <ChallengeMission slug={slug} />
    </div>
  );
}
