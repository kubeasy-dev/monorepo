import { Button } from "@kubeasy/ui/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Flame, Star, Target, TrendingUp, Trophy } from "lucide-react";
import { DashboardChart } from "@/components/dashboard-chart";
import { DashboardRecentActivity } from "@/components/dashboard-recent-activity";
import {
  completionOptions,
  registryMetaOptions,
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
      queryClient.ensureQueryData(registryMetaOptions()),
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
          {/* Card 1: Completed */}
          <div className="bg-secondary neo-border-thick neo-shadow p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-primary neo-border-thick neo-shadow rounded-lg">
                <Award className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Completed</p>
                <p className="text-3xl font-black text-foreground">
                  {completion?.completedCount ?? 0}
                </p>
              </div>
            </div>
            <p className="text-sm font-bold text-foreground">
              {completion?.percentageCompleted ?? 0}% of all challenges
            </p>
          </div>

          {/* Card 2: Points */}
          <div className="bg-secondary neo-border-thick neo-shadow p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-primary neo-border-thick neo-shadow rounded-lg">
                <Trophy className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Points</p>
                <p
                  className="text-3xl font-black text-foreground"
                  data-testid="total-xp"
                >
                  {xpData?.xpEarned ?? 0}
                </p>
              </div>
            </div>
            <p className="text-sm font-bold text-foreground">Total XP earned</p>
          </div>

          {/* Card 3: Rank */}
          <div className="bg-secondary neo-border-thick neo-shadow p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-primary neo-border-thick neo-shadow rounded-lg">
                <Star className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Rank</p>
                <p className="text-2xl font-black text-foreground leading-tight">
                  {xpData?.rank ?? "Beginner"}
                </p>
              </div>
            </div>
            <p className="text-sm font-bold text-foreground">
              Congratulations!
            </p>
          </div>

          {/* Card 4: Day Streak */}
          <div className="bg-secondary neo-border-thick neo-shadow p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-primary neo-border-thick neo-shadow rounded-lg">
                <Flame className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Day Streak</p>
                <p className="text-3xl font-black text-foreground">
                  {streak?.currentStreak ?? 0}
                </p>
              </div>
            </div>
            <p className="text-sm font-bold text-foreground">Keep it up!</p>
          </div>
        </div>

        {/* Chart + Recent Activity (2-column grid at lg) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <DashboardChart />
          <DashboardRecentActivity />
        </div>

        {/* Quick Actions */}
        <div className="bg-primary neo-border-thick neo-shadow p-8">
          <h2 className="text-2xl font-black text-primary-foreground mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="secondary"
              className="neo-border neo-shadow font-black h-auto py-6 flex-col gap-2"
              asChild
            >
              <Link to="/challenges">
                <Target className="w-8 h-8" />
                <span>Browse Challenges</span>
              </Link>
            </Button>
            <Button
              variant="secondary"
              className="neo-border neo-shadow font-black h-auto py-6 flex-col gap-2"
              asChild
            >
              <Link to="/challenges">
                <TrendingUp className="w-8 h-8" />
                <span>Explore Themes</span>
              </Link>
            </Button>
            <Button
              variant="secondary"
              className="neo-border neo-shadow font-black h-auto py-6 flex-col gap-2"
              asChild
            >
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                <Trophy className="w-8 h-8" />
                <span>View on GitHub</span>
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
