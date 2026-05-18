import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kubeasy/ui/table";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckCircle,
  Monitor,
  Terminal,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import type React from "react";
import { Suspense, useEffect, useState } from "react";
import { z } from "zod";
import {
  type AnalyticsChallengeItem,
  type AnalyticsCliOutput,
  type AnalyticsFunnelOutput,
  type AnalyticsPeriod,
  adminAnalyticsChallengesOptions,
  adminAnalyticsCliOptions,
  adminAnalyticsFunnelOptions,
  PERIOD_LABELS,
} from "@/lib/query-options";

// ─── Delta badge ──────────────────────────────────────────────────────────────

function DeltaBadge({
  current,
  previous,
  lowerIsBetter = false,
}: {
  current: number;
  previous: number;
  lowerIsBetter?: boolean;
}) {
  if (previous === 0) return null;
  const delta = ((current - previous) / previous) * 100;
  const positive = lowerIsBetter ? delta < 0 : delta > 0;
  const neutral = delta === 0;
  const abs = Math.abs(delta);
  return (
    <span
      className={[
        "inline-flex items-center gap-0.5 text-xs font-black px-1.5 py-0.5",
        neutral
          ? "bg-muted text-muted-foreground"
          : positive
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800",
      ].join(" ")}
    >
      {delta > 0 ? (
        <ArrowUp className="w-3 h-3" />
      ) : delta < 0 ? (
        <ArrowDown className="w-3 h-3" />
      ) : null}
      {abs.toFixed(1)}%
    </span>
  );
}

const analyticsSearchSchema = z.object({
  period: z
    .enum(["24h", "7d", "30d", "3m", "6m", "1y"])
    .optional()
    .default("30d")
    .catch("30d"),
  compare: z.boolean().optional().default(false).catch(false),
});

export const Route = createFileRoute("/analytics/")({
  validateSearch: zodValidator(analyticsSearchSchema),
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
  rawCurrent,
  rawPrevious,
  lowerIsBetter,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  rawCurrent?: number;
  rawPrevious?: number;
  lowerIsBetter?: boolean;
}) {
  return (
    <div className="bg-secondary neo-border-thick neo-shadow p-6">
      <div className="flex items-center gap-4 mb-3">
        <div className="p-3 bg-primary neo-border-thick neo-shadow rounded-lg">
          <Icon className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{label}</p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-black text-foreground">{value}</p>
            {rawCurrent !== undefined && rawPrevious !== undefined && (
              <DeltaBadge
                current={rawCurrent}
                previous={rawPrevious}
                lowerIsBetter={lowerIsBetter}
              />
            )}
          </div>
        </div>
      </div>
      <p className="text-sm font-bold text-foreground">{sub}</p>
    </div>
  );
}

// ─── Funnel ───────────────────────────────────────────────────────────────────

function FunnelSection({ data }: { data: AnalyticsFunnelOutput }) {
  const animated = useBarAnimation();
  const prev = data.previous;

  const steps = [
    {
      icon: Users,
      label: "Signed Up",
      value: data.totalUsers,
      pct: 1,
      prevValue: prev?.totalUsers,
    },
    {
      icon: Activity,
      label: "Started a Challenge",
      value: data.usersStarted,
      pct: data.totalUsers > 0 ? data.usersStarted / data.totalUsers : 0,
      prevValue: prev?.usersStarted,
    },
    {
      icon: CheckCircle,
      label: "Completed a Challenge",
      value: data.usersCompleted,
      pct: data.totalUsers > 0 ? data.usersCompleted / data.totalUsers : 0,
      prevValue: prev?.usersCompleted,
    },
  ];

  return (
    <section className="mb-12">
      <h2 className="text-xl font-black mb-4">User Funnel</h2>
      <div className="bg-secondary neo-border-thick neo-shadow p-6 space-y-5">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.label}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-bold">{step.label}</span>
                  {step.prevValue !== undefined && (
                    <DeltaBadge
                      current={step.value}
                      previous={step.prevValue}
                    />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground tabular-nums">
                    {(step.pct * 100).toFixed(1)}%
                  </span>
                  <span className="text-lg font-black tabular-nums">
                    {step.value.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="h-3 bg-muted neo-border overflow-hidden">
                <div
                  className="h-full transition-[width] duration-700 ease-out"
                  style={{
                    width: animated ? `${step.pct * 100}%` : "0%",
                    transitionDelay: `${i * 120}ms`,
                    background:
                      i === 0
                        ? CHART_COLORS.signups
                        : i === 1
                          ? CHART_COLORS.starters
                          : CHART_COLORS.completers,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Shared chart colors ──────────────────────────────────────────────────────

const CHART_COLORS = {
  signups: "oklch(0.55 0.25 280)",
  starters: "oklch(0.75 0.2 150)",
  completers: "oklch(0.7 0.22 50)",
} as const;

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

function ChallengesGlobalStats({
  challenges,
}: {
  challenges: AnalyticsChallengeItem[];
}) {
  const totalSubmissions = challenges.reduce((s, c) => s + c.totalAttempts, 0);
  const successfulSubmissions = challenges.reduce(
    (s, c) => s + c.validatedSubmissions,
    0,
  );
  const totalUniqueUsers = challenges.reduce((s, c) => s + c.uniqueUsers, 0);
  const successRate =
    totalSubmissions > 0 ? successfulSubmissions / totalSubmissions : 0;
  const avgAttempts =
    totalUniqueUsers > 0
      ? (totalSubmissions / totalUniqueUsers).toFixed(1)
      : "—";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatCard
        icon={BarChart3}
        label="Total Submissions"
        value={totalSubmissions.toLocaleString()}
        sub="across all challenges"
      />
      <StatCard
        icon={CheckCircle}
        label="Success Rate"
        value={`${(successRate * 100).toFixed(1)}%`}
        sub={`${successfulSubmissions.toLocaleString()} successful`}
      />
      <StatCard
        icon={Activity}
        label="Avg Attempts"
        value={avgAttempts}
        sub="per challenge starter"
      />
      <StatCard
        icon={Trophy}
        label="Active Challenges"
        value={challenges.length}
        sub="with submissions this period"
      />
    </div>
  );
}

const OK_COLOR = "oklch(0.55 0.18 150)";
const KO_COLOR = "oklch(0.55 0.22 25)";

function ChallengesSection({
  challenges,
  previousChallenges,
}: {
  challenges: AnalyticsChallengeItem[];
  previousChallenges?: {
    challengeSlug: string;
    completionRate: number;
    uniqueUsers: number;
  }[];
}) {
  const animated = useBarAnimation();
  const sorted = [...challenges].sort((a, b) => b.uniqueUsers - a.uniqueUsers);
  const prevMap = new Map(previousChallenges?.map((p) => [p.challengeSlug, p]));

  return (
    <section className="mb-12">
      <h2 className="text-xl font-black mb-4">
        Challenge Performance
        <span className="ml-2 text-base font-bold text-muted-foreground">
          ({challenges.length} challenges)
        </span>
      </h2>
      <ChallengesGlobalStats challenges={challenges} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Challenge</TableHead>
            <TableHead className="text-right">Tried</TableHead>
            <TableHead className="text-right">Submissions</TableHead>
            <TableHead className="text-right">Avg / user</TableHead>
            <TableHead className="text-right">Results</TableHead>
            <TableHead className="w-56">Completion</TableHead>
            <TableHead>Top blockers</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((item, i) => {
            const prev = prevMap.get(item.challengeSlug);
            const failedSubmissions =
              item.totalAttempts - item.validatedSubmissions;
            return (
              <TableRow key={item.challengeSlug}>
                <TableCell className="font-mono font-bold">
                  {item.challengeSlug}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>{item.uniqueUsers}</span>
                    {prev && (
                      <DeltaBadge
                        current={item.uniqueUsers}
                        previous={prev.uniqueUsers}
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums font-bold">
                  {item.totalAttempts}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.avgAttempts.toFixed(1)}×
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2 text-sm font-bold tabular-nums">
                    <span style={{ color: OK_COLOR }}>
                      {item.validatedSubmissions} ✓
                    </span>
                    <span style={{ color: KO_COLOR }}>
                      {failedSubmissions} ✗
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <CompletionBar
                        rate={item.completionRate}
                        animated={animated}
                        delay={i * 40}
                      />
                    </div>
                    {prev && (
                      <DeltaBadge
                        current={item.completionRate}
                        previous={prev.completionRate}
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {item.topFailingObjectives.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.topFailingObjectives.slice(0, 3).map((o) => (
                        <span
                          key={o.key}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold neo-border"
                          style={{
                            background: "oklch(0.97 0.02 25)",
                            color: KO_COLOR,
                          }}
                        >
                          {o.key}
                          <span className="opacity-70">×{o.failCount}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
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
  const prev = data.previous;

  return (
    <section className="mb-12">
      <h2 className="text-xl font-black mb-4">CLI Adoption</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <StatCard
          icon={Terminal}
          label="Total CLI Events"
          value={data.totalEvents.toLocaleString()}
          sub="login + setup events"
          rawCurrent={data.totalEvents}
          rawPrevious={prev?.totalEvents}
        />
        <StatCard
          icon={Monitor}
          label="Unique CLI Users"
          value={data.uniqueUsers.toLocaleString()}
          sub="distinct users seen"
          rawCurrent={data.uniqueUsers}
          rawPrevious={prev?.uniqueUsers}
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

// ─── Period / granularity selector ───────────────────────────────────────────

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex neo-border-thick overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            "px-3 py-1.5 text-xs font-black transition-colors",
            "[&:not(:first-child)]:[border-left:4px_solid_oklch(0.15_0_0)]",
            opt.value === value
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-foreground hover:bg-muted",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CompareToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "flex items-center gap-2 px-3 py-1.5 text-xs font-black neo-border-thick transition-colors",
        enabled
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-foreground hover:bg-muted",
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex w-7 h-4 rounded-full relative transition-colors",
          enabled ? "bg-primary-foreground/30" : "bg-muted-foreground/30",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200",
            enabled
              ? "left-3.5 bg-primary-foreground"
              : "left-0.5 bg-muted-foreground",
          ].join(" ")}
        />
      </span>
      vs prev period
    </button>
  );
}

function PeriodSelector({
  period,
  compare,
  onPeriodChange,
  onCompareToggle,
}: {
  period: AnalyticsPeriod;
  compare: boolean;
  onPeriodChange: (p: AnalyticsPeriod) => void;
  onCompareToggle: () => void;
}) {
  const periodOptions = (Object.keys(PERIOD_LABELS) as AnalyticsPeriod[]).map(
    (p) => ({ value: p, label: PERIOD_LABELS[p] }),
  );

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <SegmentedControl
        options={periodOptions}
        value={period}
        onChange={onPeriodChange}
      />
      <CompareToggle enabled={compare} onToggle={onCompareToggle} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AnalyticsContent({
  period,
  compare,
}: {
  period: AnalyticsPeriod;
  compare: boolean;
}) {
  const { data: funnel } = useSuspenseQuery(
    adminAnalyticsFunnelOptions(period, compare),
  );
  const { data: challenges } = useSuspenseQuery(
    adminAnalyticsChallengesOptions(period, compare),
  );
  const { data: cli } = useSuspenseQuery(
    adminAnalyticsCliOptions(period, compare),
  );

  return (
    <>
      <FunnelSection data={funnel} />
      <ChallengesSection
        challenges={challenges.challenges}
        previousChallenges={challenges.previous}
      />
      <CliSection data={cli} />
    </>
  );
}

function AnalyticsPage() {
  const { period, compare } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  function setPeriod(p: AnalyticsPeriod) {
    navigate({ search: { period: p, compare } });
  }

  function toggleCompare() {
    navigate({ search: { period, compare: !compare } });
  }

  return (
    <div className="py-8">
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-7 h-7" />
          <h1 className="text-2xl font-black">Analytics</h1>
        </div>
        <PeriodSelector
          period={period}
          compare={compare}
          onPeriodChange={setPeriod}
          onCompareToggle={toggleCompare}
        />
      </div>
      <Suspense
        fallback={
          <div className="text-muted-foreground text-sm">Loading...</div>
        }
      >
        <AnalyticsContent period={period} compare={compare} />
      </Suspense>
    </div>
  );
}
