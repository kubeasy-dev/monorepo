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
import { Suspense, useEffect, useRef, useState } from "react";
import {
  type AnalyticsChallengeItem,
  type AnalyticsCliOutput,
  type AnalyticsFunnelHistoryOutput,
  type AnalyticsFunnelOutput,
  adminAnalyticsChallengesOptions,
  adminAnalyticsCliOptions,
  adminAnalyticsFunnelHistoryOptions,
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

// ─── Funnel history chart ─────────────────────────────────────────────────────

const CHART_COLORS = {
  signups: "oklch(0.55 0.25 280)",
  starters: "oklch(0.75 0.2 150)",
  completers: "oklch(0.7 0.22 50)",
} as const;

const SERIES = [
  {
    key: "newSignups" as const,
    label: "New signups",
    color: CHART_COLORS.signups,
  },
  {
    key: "newStarters" as const,
    label: "First start",
    color: CHART_COLORS.starters,
  },
  {
    key: "newCompleters" as const,
    label: "First completion",
    color: CHART_COLORS.completers,
  },
];

function formatWeekLabel(week: string) {
  const d = new Date(`${week}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function FunnelLineChart({
  weeks,
}: {
  weeks: AnalyticsFunnelHistoryOutput["weeks"];
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const VW = 900;
  const VH = 220;
  const pad = { t: 20, r: 20, b: 44, l: 10 };
  const CW = VW - pad.l - pad.r;
  const CH = VH - pad.t - pad.b;
  const n = weeks.length;

  const maxVal = Math.max(
    1,
    ...weeks.flatMap((w) => [w.newSignups, w.newStarters, w.newCompleters]),
  );
  const niceMax = Math.ceil(maxVal / 5) * 5;

  const xOf = (i: number) => pad.l + (n <= 1 ? CW / 2 : (i / (n - 1)) * CW);
  const yOf = (v: number) => pad.t + CH * (1 - v / niceMax);

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * VW;
    const idx = Math.round(((svgX - pad.l) / CW) * (n - 1));
    setHoveredIdx(Math.max(0, Math.min(n - 1, idx)));
  }

  const hovered = hoveredIdx !== null ? weeks[hoveredIdx] : null;
  const tipX =
    hoveredIdx !== null
      ? xOf(hoveredIdx) > VW - 160
        ? xOf(hoveredIdx) - 138
        : xOf(hoveredIdx) + 10
      : 0;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VW} ${VH}`}
      className="w-full"
      style={{ height: "220px" }}
      role="img"
      aria-label="Funnel evolution over the last 12 months"
      onMouseMove={onMouseMove}
      onMouseLeave={() => setHoveredIdx(null)}
    >
      {/* Horizontal grid lines */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={pad.l}
          y1={yOf(f * niceMax)}
          x2={pad.l + CW}
          y2={yOf(f * niceMax)}
          stroke="oklch(0.85 0 0)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      ))}

      {/* X axis baseline */}
      <line
        x1={pad.l}
        y1={pad.t + CH}
        x2={pad.l + CW}
        y2={pad.t + CH}
        stroke="oklch(0.15 0 0)"
        strokeWidth="2"
      />

      {/* X axis labels */}
      {weeks.map((w, i) => {
        return (
          <text
            key={w.week}
            x={xOf(i)}
            y={pad.t + CH + 20}
            textAnchor="middle"
            fontSize="11"
            fontFamily="Geist Variable, sans-serif"
            fontWeight="700"
            fill="oklch(0.35 0 0)"
          >
            {formatWeekLabel(w.week)}
          </text>
        );
      })}

      {/* Series */}
      {SERIES.map(({ key, color }) => {
        const points = weeks
          .map((w, i) => `${xOf(i)},${yOf(w[key])}`)
          .join(" ");
        return (
          <g key={key}>
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {weeks.map((w, i) => (
              <circle
                key={w.week}
                cx={xOf(i)}
                cy={yOf(w[key])}
                r={hoveredIdx === i ? 5 : 3.5}
                fill={color}
                stroke="white"
                strokeWidth="1.5"
                style={{ transition: "r 0.1s" }}
              />
            ))}
          </g>
        );
      })}

      {/* Hover guide line */}
      {hoveredIdx !== null && (
        <line
          x1={xOf(hoveredIdx)}
          y1={pad.t}
          x2={xOf(hoveredIdx)}
          y2={pad.t + CH}
          stroke="oklch(0.15 0 0)"
          strokeWidth="1"
          strokeDasharray="3 2"
        />
      )}

      {/* Hover tooltip */}
      {hoveredIdx !== null && hovered && (
        <g>
          <rect
            x={tipX}
            y={pad.t}
            width={128}
            height={76}
            fill="oklch(0.15 0 0)"
          />
          <text
            x={tipX + 10}
            y={pad.t + 16}
            fill="oklch(0.85 0 0)"
            fontSize="10"
            fontFamily="Geist Variable, sans-serif"
            fontWeight="700"
          >
            {formatWeekLabel(hovered.week)}
          </text>
          {SERIES.map(({ key, label, color }, i) => (
            <text
              key={key}
              x={tipX + 10}
              y={pad.t + 32 + i * 15}
              fill={color}
              fontSize="10"
              fontFamily="Geist Variable, sans-serif"
              fontWeight="700"
            >
              {label}: {hovered[key]}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}

function FunnelHistorySection({
  data,
}: {
  data: AnalyticsFunnelHistoryOutput;
}) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-black mb-4">Funnel Over Time (12 months)</h2>
      <div className="bg-secondary neo-border-thick neo-shadow p-6">
        {/* Legend */}
        <div className="flex gap-6 mb-5">
          {SERIES.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-6 h-0.5 rounded-none"
                style={{ background: color }}
              />
              <span className="text-xs font-bold">{label}</span>
            </div>
          ))}
        </div>
        <FunnelLineChart weeks={data.weeks} />
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
  const { data: funnelHistory } = useSuspenseQuery(
    adminAnalyticsFunnelHistoryOptions(),
  );
  const { data: challenges } = useSuspenseQuery(
    adminAnalyticsChallengesOptions(),
  );
  const { data: cli } = useSuspenseQuery(adminAnalyticsCliOptions());

  return (
    <>
      <FunnelSection data={funnel} />
      <FunnelHistorySection data={funnelHistory} />
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
