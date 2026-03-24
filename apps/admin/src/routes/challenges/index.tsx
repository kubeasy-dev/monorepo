import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/challenges/")({
  component: ChallengesPage,
});

function ChallengesPage() {
  return (
    <div className="py-8">
      <h1 className="text-xl font-bold">Challenges</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Challenge management is coming in Phase 11.
      </p>
    </div>
  );
}
