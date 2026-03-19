import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ProfileApiTokens } from "@/components/profile-api-tokens";
import { ProfileDangerZone } from "@/components/profile-danger-zone";
import { ProfileEmailPreferences } from "@/components/profile-email-preferences";
import { ProfileSettings } from "@/components/profile-settings";
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
          <ProfileSettings
            initialFirstName={firstName ?? ""}
            initialLastName={lastName ?? ""}
          />

          <ProfileApiTokens />

          <ProfileEmailPreferences />

          <ProfileDangerZone />
        </div>
      </div>
    </div>
  );
}
