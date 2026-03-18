import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { adminChallengesOptions, adminStatsOptions } from "@/lib/query-options";

export const Route = createFileRoute("/_protected/(admin)/challenges")({
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { role?: string } }).user;
    if (!user || user.role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(adminChallengesOptions()),
      queryClient.ensureQueryData(adminStatsOptions()),
    ]);
  },
  component: AdminChallengesPage,
});

function AdminChallengesPage() {
  const { data: challengeData } = useSuspenseQuery(adminChallengesOptions());
  const { data: stats } = useSuspenseQuery(adminStatsOptions());

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-secondary neo-border-thick neo-shadow p-4">
          <div className="text-2xl font-black">{stats?.totalStarts ?? 0}</div>
          <div className="text-xs font-bold text-muted-foreground uppercase">
            Total Starts
          </div>
        </div>
        <div className="bg-secondary neo-border-thick neo-shadow p-4">
          <div className="text-2xl font-black">
            {stats?.totalCompletions ?? 0}
          </div>
          <div className="text-xs font-bold text-muted-foreground uppercase">
            Completions
          </div>
        </div>
        <div className="bg-secondary neo-border-thick neo-shadow p-4">
          <div className="text-2xl font-black">
            {stats?.totalSubmissions ?? 0}
          </div>
          <div className="text-xs font-bold text-muted-foreground uppercase">
            Submissions
          </div>
        </div>
        <div className="bg-secondary neo-border-thick neo-shadow p-4">
          <div className="text-2xl font-black">
            {stats?.completionRate ?? 0}%
          </div>
          <div className="text-xs font-bold text-muted-foreground uppercase">
            Completion Rate
          </div>
        </div>
      </div>

      {/* Challenges table */}
      <div className="bg-secondary neo-border-thick neo-shadow">
        <div className="p-6 border-b-2 border-black">
          <h2 className="text-2xl font-black">Challenges</h2>
          <p className="text-muted-foreground font-bold">
            Enable or disable challenges to control visibility on the site.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left px-6 py-3 font-black text-sm uppercase">
                  Challenge
                </th>
                <th className="text-left px-6 py-3 font-black text-sm uppercase">
                  Difficulty
                </th>
                <th className="text-left px-6 py-3 font-black text-sm uppercase">
                  Theme
                </th>
                <th className="text-right px-6 py-3 font-black text-sm uppercase">
                  Starts
                </th>
                <th className="text-right px-6 py-3 font-black text-sm uppercase">
                  Completions
                </th>
                <th className="text-right px-6 py-3 font-black text-sm uppercase">
                  Available
                </th>
              </tr>
            </thead>
            <tbody>
              {challengeData?.challenges.map((challenge) => (
                <tr
                  key={challenge.slug}
                  className="border-b border-black/20 hover:bg-background"
                >
                  <td className="px-6 py-4 font-bold">{challenge.title}</td>
                  <td className="px-6 py-4 font-bold capitalize">
                    {challenge.difficulty}
                  </td>
                  <td className="px-6 py-4 font-bold">{challenge.theme}</td>
                  <td className="px-6 py-4 text-right font-bold">
                    {challenge.starts}
                  </td>
                  <td className="px-6 py-4 text-right font-bold">
                    {challenge.completions}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`font-black text-sm px-2 py-0.5 neo-border ${challenge.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {challenge.available ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
