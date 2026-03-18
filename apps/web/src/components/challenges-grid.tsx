import type { ChallengeListInput } from "@kubeasy/api-schemas/challenges";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChallengeCard } from "@/components/challenge-card";
import { challengeListOptions } from "@/lib/query-options";

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {children}
    </div>
  );
}

export function ChallengesGrid({
  filters,
}: Readonly<{ filters?: ChallengeListInput }>) {
  const { data } = useSuspenseQuery(challengeListOptions(filters));

  return (
    <div>
      {data.challenges.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.challenges.map((challenge) => (
            <ChallengeCard key={challenge.slug} challenge={challenge} />
          ))}
        </div>
      ) : (
        <Empty>
          <p className="text-2xl font-black">No challenges found</p>
          <p className="text-lg font-bold text-muted-foreground mt-2">
            Try adjusting your filters or search criteria to find what
            you&apos;re looking for.
          </p>
        </Empty>
      )}
    </div>
  );
}
