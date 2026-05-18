import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  CheckCircle,
  Monitor,
  Terminal,
  TrendingUp,
  Users,
} from "lucide-react";
import { Suspense } from "react";
import {
  type AnalyticsChallengeItem,
  type AnalyticsCliOutput,
  type AnalyticsFunnelOutput,
  adminAnalyticsChallengesOptions,
  adminAnalyticsCliOptions,
  adminAnalyticsFunnelOptions,
} from "@/lib/query-options";

export const Route = createFileRoute("/analytics/")({
  component: AnalyticsPage,
});

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-secondary neo-border-thick neo-shadow p-6">
      <div className="flex items-center gap-4 mb-3">
        <div className="p-3 bg-primary neo-border-thick neo-shadow rounded-lg">
          <Icon className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{label}</p>
          <p className="text-3xl font-black text-foreground">{value}</p>
        </div>
      </div>
      {sub && <p className="text-sm font-bold text-foreground">{sub}</p>}
    </div>
  );
}

function FunnelSection({ data }: { data: AnalyticsFunnelOutput }) {
  const startedPct =
    data.totalUsers > 0
      ? ((data.usersStarted / data.totalUsers) * 100).toFixed(1)
      : "0.0";
  const completedPct =
    data.totalUsers > 0
      ? ((data.usersCompleted / data.totalUsers) * 100).toFixed(1)
      : "0.0";

  return (
    <section className="mb-12">
      <h2 className="text-xl font-black mb-4">User Funnel</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={Users}
          label="Signed Up"
          value={data.totalUsers.toLocaleString()}
          sub="total registered users"
        />
        <StatCard
          icon={Activity}
          label="Started a Challenge"
          value={`${data.usersStarted.toLocaleString()} (${startedPct}%)`}
          sub="of all users"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed a Challenge"
          value={`${data.usersCompleted.toLocaleString()} (${completedPct}%)`}
          sub="of all users"
        />
      </div>
    </section>
  );
}

function ChallengeRow({ item }: { item: AnalyticsChallengeItem }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-4 font-mono text-sm font-bold">
        {item.challengeSlug}
      </td>
      <td className="py-3 pr-4 text-sm text-right">{item.uniqueUsers}</td>
      <td className="py-3 pr-4 text-sm text-right">{item.totalAttempts}</td>
      <td className="py-3 pr-4 text-sm text-right">
        {(item.completionRate * 100).toFixed(1)}%
      </td>
      <td className="py-3 pr-4 text-sm text-right">
        {item.avgAttempts.toFixed(1)}
      </td>
      <td className="py-3 text-sm text-muted-foreground">
        {item.topFailingObjectives.length > 0
          ? item.topFailingObjectives
              .slice(0, 3)
              .map((o) => `${o.key} (${o.failCount})`)
              .join(", ")
          : "—"}
      </td>
    </tr>
  );
}

function ChallengesSection({
  challenges,
}: {
  challenges: AnalyticsChallengeItem[];
}) {
  const sorted = [...challenges].sort((a, b) => b.uniqueUsers - a.uniqueUsers);

  return (
    <section className="mb-12">
      <h2 className="text-xl font-black mb-4">
        Challenge Stats
        <span className="ml-2 text-base font-bold text-muted-foreground">
          ({challenges.length} challenges)
        </span>
      </h2>
      <div className="bg-secondary neo-border-thick neo-shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="py-3 pr-4 text-left text-sm font-black">
                Challenge
              </th>
              <th className="py-3 pr-4 text-right text-sm font-black">Users</th>
              <th className="py-3 pr-4 text-right text-sm font-black">
                Attempts
              </th>
              <th className="py-3 pr-4 text-right text-sm font-black">
                Completion
              </th>
              <th className="py-3 pr-4 text-right text-sm font-black">
                Avg Attempts
              </th>
              <th className="py-3 text-left text-sm font-black">
                Top Failing Objectives
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <ChallengeRow key={item.challengeSlug} item={item} />
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No submission data yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BreakdownList({
  rows,
  keyLabel,
}: {
  rows: { label: string; count: number }[];
  keyLabel: string;
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <div className="bg-secondary neo-border-thick neo-shadow p-6">
      <p className="text-sm font-black mb-4 uppercase tracking-wide">
        {keyLabel}
      </p>
      <ul className="space-y-2">
        {rows.map((r) => {
          const pct = total > 0 ? ((r.count / total) * 100).toFixed(1) : "0";
          return (
            <li key={r.label} className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold">{r.label}</span>
              <span className="text-sm text-muted-foreground">
                {r.count.toLocaleString()} ({pct}%)
              </span>
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="text-sm text-muted-foreground">No data yet</li>
        )}
      </ul>
    </div>
  );
}

function CliSection({ data }: { data: AnalyticsCliOutput }) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-black mb-4">CLI Events</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <StatCard
          icon={Terminal}
          label="Total CLI Events"
          value={data.totalEvents.toLocaleString()}
          sub="login + setup events"
        />
        <StatCard
          icon={Monitor}
          label="Unique CLI Users"
          value={data.uniqueUsers.toLocaleString()}
          sub="distinct users seen"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BreakdownList
          keyLabel="By Event Type"
          rows={data.byEventType.map((r) => ({
            label: r.eventType,
            count: r.count,
          }))}
        />
        <BreakdownList
          keyLabel="By CLI Version"
          rows={data.byVersion.map((r) => ({
            label: r.cliVersion,
            count: r.count,
          }))}
        />
        <BreakdownList
          keyLabel="By OS"
          rows={data.byOs.map((r) => ({ label: r.os, count: r.count }))}
        />
      </div>
    </section>
  );
}

function AnalyticsContent() {
  const { data: funnel } = useSuspenseQuery(adminAnalyticsFunnelOptions());
  const { data: challenges } = useSuspenseQuery(
    adminAnalyticsChallengesOptions(),
  );
  const { data: cli } = useSuspenseQuery(adminAnalyticsCliOptions());

  return (
    <>
      <FunnelSection data={funnel} />
      <ChallengesSection challenges={challenges.challenges} />
      <CliSection data={cli} />
    </>
  );
}

function AnalyticsPage() {
  return (
    <div className="py-8">
      <div className="flex items-center gap-3 mb-8">
        <TrendingUp className="w-7 h-7" />
        <h1 className="text-2xl font-black">Analytics</h1>
      </div>
      <Suspense
        fallback={
          <div className="text-muted-foreground text-sm">Loading...</div>
        }
      >
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}
