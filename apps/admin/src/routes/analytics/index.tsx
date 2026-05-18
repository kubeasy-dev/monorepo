import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kubeasy/ui/table";
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
import { Suspense, useEffect, useState } from "react";
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

function useBarAnimation() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return ready;
}

// ─── Shared stat card (same pattern as challenges/users pages) ────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
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
      <p className="text-sm font-bold text-foreground">{sub}</p>
    </div>
  );
}

// ─── Funnel ───────────────────────────────────────────────────────────────────

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
          sub="100% — baseline"
        />
        <StatCard
          icon={Activity}
          label="Started a Challenge"
          value={data.usersStarted.toLocaleString()}
          sub={`${startedPct}% of signups`}
        />
        <StatCard
          icon={CheckCircle}
          label="Completed a Challenge"
          value={data.usersCompleted.toLocaleString()}
          sub={`${completedPct}% of signups`}
        />
      </div>
    </section>
  );
}

// ─── Challenge stats ──────────────────────────────────────────────────────────

function CompletionBar({
  rate,
  animated,
  delay,
}: {
  rate: number;
  animated: boolean;
  delay: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted neo-border overflow-hidden">
        <div
          className="h-full bg-primary transition-[width] duration-700 ease-out"
          style={{
            width: animated ? `${rate * 100}%` : "0%",
            transitionDelay: `${delay}ms`,
          }}
        />
      </div>
      <span className="text-sm font-bold w-12 text-right tabular-nums">
        {(rate * 100).toFixed(1)}%
      </span>
    </div>
  );
}

function ChallengesSection({
  challenges,
}: {
  challenges: AnalyticsChallengeItem[];
}) {
  const animated = useBarAnimation();
  const sorted = [...challenges].sort((a, b) => b.uniqueUsers - a.uniqueUsers);

  return (
    <section className="mb-12">
      <h2 className="text-xl font-black mb-4">
        Challenge Performance
        <span className="ml-2 text-base font-bold text-muted-foreground">
          ({challenges.length} challenges)
        </span>
      </h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Challenge</TableHead>
            <TableHead className="text-right">Users</TableHead>
            <TableHead className="text-right">Attempts</TableHead>
            <TableHead className="text-right">Avg</TableHead>
            <TableHead className="w-64">Completion rate</TableHead>
            <TableHead>Top failing objectives</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((item, i) => (
            <TableRow key={item.challengeSlug}>
              <TableCell className="font-mono font-bold">
                {item.challengeSlug}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.uniqueUsers}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.totalAttempts}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.avgAttempts.toFixed(1)}×
              </TableCell>
              <TableCell>
                <CompletionBar
                  rate={item.completionRate}
                  animated={animated}
                  delay={i * 40}
                />
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {item.topFailingObjectives.length > 0
                  ? item.topFailingObjectives
                      .slice(0, 3)
                      .map((o) => `${o.key} (${o.failCount})`)
                      .join(", ")
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
          {sorted.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-8 text-center text-muted-foreground"
              >
                No submission data yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </section>
  );
}

// ─── CLI section ──────────────────────────────────────────────────────────────

function BreakdownCard({
  title,
  rows,
  animated,
  delay,
}: {
  title: string;
  rows: { label: string; count: number }[];
  animated: boolean;
  delay: number;
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);

  return (
    <div className="bg-secondary neo-border-thick neo-shadow p-6">
      <p className="text-sm font-bold text-foreground mb-4">{title}</p>
      <ul className="space-y-3">
        {rows.map((r, i) => {
          const pct = total > 0 ? (r.count / total) * 100 : 0;
          return (
            <li key={r.label}>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-sm font-bold">{r.label}</span>
                <span className="text-sm font-bold tabular-nums text-muted-foreground">
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 bg-muted neo-border overflow-hidden">
                <div
                  className="h-full bg-primary transition-[width] duration-500 ease-out"
                  style={{
                    width: animated ? `${pct}%` : "0%",
                    transitionDelay: `${delay + i * 60}ms`,
                  }}
                />
              </div>
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
  const animated = useBarAnimation();

  return (
    <section className="mb-12">
      <h2 className="text-xl font-black mb-4">CLI Adoption</h2>
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
        <BreakdownCard
          title="By Event Type"
          rows={data.byEventType.map((r) => ({
            label: r.eventType,
            count: r.count,
          }))}
          animated={animated}
          delay={0}
        />
        <BreakdownCard
          title="By CLI Version"
          rows={data.byVersion.map((r) => ({
            label: r.cliVersion,
            count: r.count,
          }))}
          animated={animated}
          delay={100}
        />
        <BreakdownCard
          title="By OS"
          rows={data.byOs.map((r) => ({ label: r.os, count: r.count }))}
          animated={animated}
          delay={200}
        />
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
