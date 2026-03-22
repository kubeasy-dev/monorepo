import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Target, TrendingUp, Trophy } from "lucide-react";
import { DashboardChart } from "@/components/dashboard-chart";
import { DashboardRecentActivity } from "@/components/dashboard-recent-activity";
import {
  completionOptions,
  themeListOptions,
  userStreakOptions,
  userXpOptions,
} from "@/lib/query-options";
import { serverLog } from "@/lib/server-log";

const GITHUB_URL = "https://github.com/kubeasy-dev/kubeasy";

export const Route = createFileRoute("/_protected/dashboard")({
  loader: async ({ context: { queryClient } }) => {
    await serverLog.info("page.load", { page: "dashboard" });
    await Promise.all([
      queryClient.ensureQueryData(completionOptions({ splitByTheme: true })),
      queryClient.ensureQueryData(userXpOptions()),
      queryClient.ensureQueryData(userStreakOptions()),
      queryClient.ensureQueryData(themeListOptions()),
    ]);
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const { data: completion } = useSuspenseQuery(
    completionOptions({ splitByTheme: true }),
  );
  const { data: xpData } = useSuspenseQuery(userXpOptions());
  const { data: streak } = useSuspenseQuery(userStreakOptions());

  const firstName = user.name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-black mb-4">
            Welcome back, <span className="text-primary">{firstName}</span>!
          </h1>
          <p className="text-xl text-muted-foreground font-bold">
            Track your Kubernetes learning journey
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-secondary neo-border-thick neo-shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary neo-border-thick">
                <Trophy className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold text-muted-foreground uppercase">
                XP Earned
              </span>
            </div>
            <div className="text-3xl font-black">{xpData?.xpEarned ?? 0}</div>
            <div className="text-sm font-bold text-muted-foreground mt-1">
              {xpData?.rank ?? "Beginner"}
            </div>
          </div>

          <div className="bg-secondary neo-border-thick neo-shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary neo-border-thick">
                <Target className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold text-muted-foreground uppercase">
                Completed
              </span>
            </div>
            <div className="text-3xl font-black">
              {completion?.completedCount ?? 0}
            </div>
            <div className="text-sm font-bold text-muted-foreground mt-1">
              of {completion?.totalCount ?? 0} challenges
            </div>
          </div>

          <div className="bg-secondary neo-border-thick neo-shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary neo-border-thick">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold text-muted-foreground uppercase">
                Progress
              </span>
            </div>
            <div className="text-3xl font-black">
              {completion?.percentageCompleted ?? 0}%
            </div>
            <div className="text-sm font-bold text-muted-foreground mt-1">
              completion rate
            </div>
          </div>

          <div className="bg-secondary neo-border-thick neo-shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary neo-border-thick">
                <Clock className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold text-muted-foreground uppercase">
                Streak
              </span>
            </div>
            <div className="text-3xl font-black">
              {streak?.currentStreak ?? 0}
            </div>
            <div className="text-sm font-bold text-muted-foreground mt-1">
              day streak
            </div>
          </div>
        </div>

        {/* Skills by Themes */}
        <DashboardChart />

        {/* Recent Activity */}
        <DashboardRecentActivity />

        {/* Quick Actions */}
        <div className="bg-primary neo-border-thick neo-shadow p-8">
          <h2 className="text-2xl font-black text-primary-foreground mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/challenges"
              className="bg-secondary neo-border neo-shadow font-black py-6 flex flex-col items-center gap-2 hover:neo-shadow-lg transition-shadow"
            >
              <Target className="w-8 h-8" />
              <span>Browse Challenges</span>
            </Link>
            <Link
              to="/themes"
              className="bg-secondary neo-border neo-shadow font-black py-6 flex flex-col items-center gap-2 hover:neo-shadow-lg transition-shadow"
            >
              <TrendingUp className="w-8 h-8" />
              <span>Explore Themes</span>
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="bg-secondary neo-border neo-shadow font-black py-6 flex flex-col items-center gap-2 hover:neo-shadow-lg transition-shadow"
            >
              <Trophy className="w-8 h-8" />
              <span>View on GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
