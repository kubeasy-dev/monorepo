import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { ChallengesTable } from "@/components/challenges-table";
import { adminChallengesOptions } from "@/lib/query-options";

export const Route = createFileRoute("/challenges/")({
  component: ChallengesPage,
});

function ChallengesContent() {
  const { data: challengesData } = useSuspenseQuery(adminChallengesOptions());

  return <ChallengesTable challenges={challengesData.challenges} />;
}

function ChallengesPage() {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-black mb-8">Challenges</h1>
      <Suspense
        fallback={
          <div className="text-muted-foreground text-sm">Loading...</div>
        }
      >
        <ChallengesContent />
      </Suspense>
    </div>
  );
}
