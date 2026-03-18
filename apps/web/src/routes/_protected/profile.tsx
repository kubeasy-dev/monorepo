import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { userXpOptions } from "@/lib/query-options";

export const Route = createFileRoute("/_protected/profile")({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(userXpOptions());
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const { data: xpData } = useSuspenseQuery(userXpOptions());

  const [firstName, lastName] = user.name?.split(" ") ?? ["", ""];

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">
            {firstName} {lastName}
          </h1>
          <p className="text-lg text-muted-foreground font-bold">
            {user.email}
          </p>
          <p className="text-sm font-bold text-primary mt-1">
            {xpData?.xpEarned ?? 0} XP &bull; {xpData?.rank ?? "Beginner"}
          </p>
        </div>

        <div className="grid gap-6">
          {/* Profile Info */}
          <div className="bg-secondary neo-border-thick neo-shadow p-8">
            <h2 className="text-2xl font-black mb-4">Profile Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase">
                  Name
                </p>
                <p className="font-bold text-lg">{user.name ?? "Not set"}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase">
                  Email
                </p>
                <p className="font-bold text-lg">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
