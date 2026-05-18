import type { AdminStatsOutput } from "@kubeasy/api-schemas/challenges";
import { Activity, BarChart3, CheckCircle, Trophy } from "lucide-react";

interface ChallengesStatsProps {
  stats: AdminStatsOutput;
}

export function ChallengesStats({ stats }: ChallengesStatsProps) {
  const avgAttempts =
    stats.totalStarts > 0
      ? (stats.totalSubmissions / stats.totalStarts).toFixed(1)
      : "—";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      {/* Completion Rate */}
      <div className="bg-secondary neo-border-thick neo-shadow p-6">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-primary neo-border-thick neo-shadow rounded-lg">
            <Trophy className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Completion Rate</p>
            <p className="text-3xl font-black text-foreground">
              {(stats.completionRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>
        <p className="text-sm font-bold text-foreground">
          {stats.totalCompletions} completions
        </p>
      </div>

      {/* Success Rate */}
      <div className="bg-secondary neo-border-thick neo-shadow p-6">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-primary neo-border-thick neo-shadow rounded-lg">
            <CheckCircle className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Success Rate</p>
            <p className="text-3xl font-black text-foreground">
              {(stats.successRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>
        <p className="text-sm font-bold text-foreground">
          {stats.successfulSubmissions} successful submissions
        </p>
      </div>

      {/* Total Submissions */}
      <div className="bg-secondary neo-border-thick neo-shadow p-6">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-primary neo-border-thick neo-shadow rounded-lg">
            <BarChart3 className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              Total Submissions
            </p>
            <p className="text-3xl font-black text-foreground">
              {stats.totalSubmissions.toLocaleString()}
            </p>
          </div>
        </div>
        <p className="text-sm font-bold text-foreground">
          across all challenges
        </p>
      </div>

      {/* Avg Attempts */}
      <div className="bg-secondary neo-border-thick neo-shadow p-6">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-primary neo-border-thick neo-shadow rounded-lg">
            <Activity className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Avg Attempts</p>
            <p className="text-3xl font-black text-foreground">{avgAttempts}</p>
          </div>
        </div>
        <p className="text-sm font-bold text-foreground">
          per challenge starter
        </p>
      </div>
    </div>
  );
}
