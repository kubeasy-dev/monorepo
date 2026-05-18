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
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Monitor,
  Terminal,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import React, { Suspense, useEffect, useState } from "react";
import {
  type AnalyticsChallengeItem,
  type AnalyticsCliOutput,
  type AnalyticsFunnelOutput,
  type AnalyticsGranularity,
  type AnalyticsPeriod,
  type AnalyticsSubmissionsHistogramOutput,
  adminAnalyticsChallengeHistogramOptions,
  adminAnalyticsChallengesOptions,
  adminAnalyticsCliOptions,
  adminAnalyticsFunnelOptions,
  GRANULARITY_LABELS,
  PERIOD_DEFAULT_GRANULARITY,
  PERIOD_GRANULARITIES,
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

// ─── Bucket label formatter ───────────────────────────────────────────────────

function formatBucketLabel(
  bucket: string,
  granularity: AnalyticsGranularity,
): string {
  // Hourly buckets come as "YYYY-MM-DDTHH:MM", others as "YYYY-MM-DD"
  const isHourly = bucket.includes("T");
  if (isHourly) {
    const [datePart, timePart] = bucket.split("T");
    const d = new Date(`${datePart}T${timePart}:00Z`);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
  }
  const d = new Date(`${bucket}T12:00:00Z`);
  if (granularity === "month") {
    return d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
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

function SubmissionsHistogram({
  data,
  granularity,
}: {
  data: AnalyticsSubmissionsHistogramOutput;
  granularity: AnalyticsGranularity;
}) {
  const { buckets } = data;
  const VW = 860;
  const VH = 160;
  const pad = { t: 10, r: 10, b: 36, l: 10 };
  const CW = VW - pad.l - pad.r;
  const CH = VH - pad.t - pad.b;
  const n = buckets.length;

  const maxVal = Math.max(1, ...buckets.map((b) => b.ok + b.ko));
  const niceMax = Math.ceil(maxVal / 2) * 2;

  const barGroupW = n > 0 ? CW / n : CW;
  const gap = barGroupW * 0.15;
  const barW = (barGroupW - gap * 3) / 2;

  const yOf = (v: number) => pad.t + CH * (1 - v / niceMax);

  // Show label every ~7 days to avoid crowding
  const labelStep = Math.ceil(n / 12);

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      className="w-full"
      style={{ height: "160px" }}
      role="img"
      aria-label="Daily OK/KO submissions over the last 30 days"
    >
      {/* Baseline */}
      <line
        x1={pad.l}
        y1={pad.t + CH}
        x2={pad.l + CW}
        y2={pad.t + CH}
        stroke="oklch(0.15 0 0)"
        strokeWidth="1.5"
      />

      {buckets.map((b, i) => {
        const gx = pad.l + i * barGroupW + gap;
        const okH = CH * (b.ok / niceMax);
        const koH = CH * (b.ko / niceMax);
        const showLabel = i % labelStep === 0;
        const label = formatBucketLabel(b.date, granularity);

        return (
          <g key={b.date}>
            {/* OK bar */}
            <rect
              x={gx}
              y={yOf(b.ok)}
              width={barW}
              height={okH}
              fill={OK_COLOR}
            />
            {/* KO bar */}
            <rect
              x={gx + barW + gap}
              y={yOf(b.ko)}
              width={barW}
              height={koH}
              fill={KO_COLOR}
            />
            {showLabel && (
              <text
                x={gx + barW}
                y={pad.t + CH + 20}
                textAnchor="middle"
                fontSize="10"
                fontFamily="Geist Variable, sans-serif"
                fontWeight="700"
                fill="oklch(0.45 0 0)"
              >
                {label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ChallengeHistogramRow({
  slug,
  period,
  granularity,
}: {
  slug: string;
  period: AnalyticsPeriod;
  granularity: AnalyticsGranularity;
}) {
  const { data } = useSuspenseQuery(
    adminAnalyticsChallengeHistogramOptions(slug, period, granularity),
  );
  const total = data.buckets.reduce((s, b) => s + b.ok + b.ko, 0);
  const totalOk = data.buckets.reduce((s, b) => s + b.ok, 0);
  const totalKo = data.buckets.reduce((s, b) => s + b.ko, 0);

  return (
    <TableRow>
      <TableCell colSpan={7} className="bg-muted/40 px-6 py-4">
        <div className="flex items-center gap-6 mb-3">
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            {PERIOD_LABELS[period]} · {GRANULARITY_LABELS[granularity]}
          </span>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: OK_COLOR }}
            />
            <span className="text-xs font-bold">
              OK — {totalOk.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: KO_COLOR }}
            />
            <span className="text-xs font-bold">
              KO — {totalKo.toLocaleString()}
            </span>
          </div>
          {total > 0 && (
            <span className="text-xs font-bold text-muted-foreground">
              {((totalOk / total) * 100).toFixed(1)}% success rate
            </span>
          )}
        </div>
        <Suspense
          fallback={
            <div className="text-xs text-muted-foreground">Loading…</div>
          }
        >
          <SubmissionsHistogram data={data} granularity={granularity} />
        </Suspense>
      </TableCell>
    </TableRow>
  );
}

function ChallengesSection({
  challenges,
  previousChallenges,
  period,
  granularity,
}: {
  challenges: AnalyticsChallengeItem[];
  previousChallenges?: {
    challengeSlug: string;
    completionRate: number;
    uniqueUsers: number;
  }[];
  period: AnalyticsPeriod;
  granularity: AnalyticsGranularity;
}) {
  const animated = useBarAnimation();
  const sorted = [...challenges].sort((a, b) => b.uniqueUsers - a.uniqueUsers);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const prevMap = new Map(previousChallenges?.map((p) => [p.challengeSlug, p]));

  function toggle(slug: string) {
    setExpandedSlug((prev) => (prev === slug ? null : slug));
  }

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
            <TableHead className="w-6" />
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
            const isExpanded = expandedSlug === item.challengeSlug;
            const prev = prevMap.get(item.challengeSlug);
            const failedSubmissions =
              item.totalAttempts - item.validatedSubmissions;
            return (
              <React.Fragment key={item.challengeSlug}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggle(item.challengeSlug)}
                >
                  <TableCell className="pr-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </TableCell>
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
                {isExpanded && (
                  <Suspense>
                    <ChallengeHistogramRow
                      slug={item.challengeSlug}
                      period={period}
                      granularity={granularity}
                    />
                  </Suspense>
                )}
              </React.Fragment>
            );
          })}
          {sorted.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={8}
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

function PeriodGranularitySelector({
  period,
  granularity,
  compare,
  onPeriodChange,
  onGranularityChange,
  onCompareToggle,
}: {
  period: AnalyticsPeriod;
  granularity: AnalyticsGranularity;
  compare: boolean;
  onPeriodChange: (p: AnalyticsPeriod) => void;
  onGranularityChange: (g: AnalyticsGranularity) => void;
  onCompareToggle: () => void;
}) {
  const periodOptions = (Object.keys(PERIOD_LABELS) as AnalyticsPeriod[]).map(
    (p) => ({ value: p, label: PERIOD_LABELS[p] }),
  );

  const granOptions = PERIOD_GRANULARITIES[period].map((g) => ({
    value: g,
    label: GRANULARITY_LABELS[g],
  }));

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <SegmentedControl
        options={periodOptions}
        value={period}
        onChange={onPeriodChange}
      />
      <span className="text-xs font-bold text-muted-foreground">by</span>
      <SegmentedControl
        options={granOptions}
        value={granularity}
        onChange={onGranularityChange}
      />
      <CompareToggle enabled={compare} onToggle={onCompareToggle} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AnalyticsContent({
  period,
  granularity,
  compare,
}: {
  period: AnalyticsPeriod;
  granularity: AnalyticsGranularity;
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
        period={period}
        granularity={granularity}
      />
      <CliSection data={cli} />
    </>
  );
}

function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [granularity, setGranularity] = useState<AnalyticsGranularity>(
    PERIOD_DEFAULT_GRANULARITY["30d"],
  );
  const [compare, setCompare] = useState(false);

  function handlePeriodChange(p: AnalyticsPeriod) {
    const defaultGran = PERIOD_DEFAULT_GRANULARITY[p];
    const available = PERIOD_GRANULARITIES[p];
    setPeriod(p);
    setGranularity(available.includes(granularity) ? granularity : defaultGran);
  }

  return (
    <div className="py-8">
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-7 h-7" />
          <h1 className="text-2xl font-black">Analytics</h1>
        </div>
        <PeriodGranularitySelector
          period={period}
          granularity={granularity}
          compare={compare}
          onPeriodChange={handlePeriodChange}
          onGranularityChange={setGranularity}
          onCompareToggle={() => setCompare((c) => !c)}
        />
      </div>
      <Suspense
        fallback={
          <div className="text-muted-foreground text-sm">Loading...</div>
        }
      >
        <AnalyticsContent
          period={period}
          granularity={granularity}
          compare={compare}
        />
      </Suspense>
    </div>
  );
}
