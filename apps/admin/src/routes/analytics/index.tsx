import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Terminal } from "lucide-react";
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

// Animate bars from 0 → actual width after mount
function useBarAnimation() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return ready;
}

function completionColor(rate: number): string {
  if (rate >= 0.6) return "oklch(0.75 0.2 150)"; // accent cyan/green
  if (rate >= 0.35) return "oklch(0.7 0.22 50)"; // chart-3 amber
  return "oklch(0.6 0.25 25)"; // destructive red-orange
}

// ─── Funnel ──────────────────────────────────────────────────────────────────

function FunnelStep({
  index,
  label,
  value,
  pct,
  highlight,
}: {
  index: string;
  label: string;
  value: number;
  pct: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex-1 neo-border-thick neo-shadow p-6 flex flex-col justify-between min-h-[180px]"
      style={{
        background: highlight ? "oklch(0.55 0.25 280)" : "oklch(0.95 0.05 85)",
        color: highlight ? "oklch(1 0 0)" : "oklch(0.15 0 0)",
      }}
    >
      <div
        className="text-xs font-black tracking-[0.25em] mb-4 opacity-50"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        STEP {index}
      </div>
      <div>
        <div
          className="font-black leading-none mb-1"
          style={{
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.03em",
          }}
        >
          {value.toLocaleString()}
        </div>
        <div className="text-sm font-bold uppercase tracking-widest opacity-70 mb-3">
          {label}
        </div>
        <div
          className="text-xs font-black"
          style={{
            color: highlight ? "oklch(0.85 0.15 150)" : "oklch(0.55 0.25 280)",
          }}
        >
          {pct}
        </div>
      </div>
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
  const startToComplete =
    data.usersStarted > 0
      ? ((data.usersCompleted / data.usersStarted) * 100).toFixed(1)
      : "0.0";

  return (
    <section className="mb-14">
      <SectionLabel>User Conversion Funnel</SectionLabel>
      <div className="flex items-stretch gap-0">
        <FunnelStep
          index="01"
          label="Signed Up"
          value={data.totalUsers}
          pct="100% baseline"
        />
        <div className="flex flex-col items-center justify-center px-3 gap-1">
          <ArrowRight className="w-5 h-5 opacity-40" />
          <span
            className="text-xs font-black"
            style={{
              color: "oklch(0.55 0.25 280)",
              writingMode: "vertical-lr",
            }}
          >
            {startedPct}%
          </span>
        </div>
        <FunnelStep
          index="02"
          label="Started Challenge"
          value={data.usersStarted}
          pct={`${startedPct}% of signups`}
          highlight
        />
        <div className="flex flex-col items-center justify-center px-3 gap-1">
          <ArrowRight className="w-5 h-5 opacity-40" />
          <span
            className="text-xs font-black"
            style={{
              color: "oklch(0.55 0.25 280)",
              writingMode: "vertical-lr",
            }}
          >
            {startToComplete}%
          </span>
        </div>
        <FunnelStep
          index="03"
          label="Completed Challenge"
          value={data.usersCompleted}
          pct={`${completedPct}% of signups`}
        />
      </div>
    </section>
  );
}

// ─── Challenge Stats ─────────────────────────────────────────────────────────

function ChallengeBar({
  item,
  rank,
  animated,
}: {
  item: AnalyticsChallengeItem;
  rank: number;
  animated: boolean;
}) {
  const pct = (item.completionRate * 100).toFixed(1);
  const barColor = completionColor(item.completionRate);

  return (
    <div
      className="group neo-border-thick py-4 px-5 mb-[-4px] transition-colors"
      style={{ background: "oklch(1 0 0)" }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "oklch(0.95 0.05 85)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "oklch(1 0 0)")}
    >
      <div className="flex items-center gap-4 mb-2">
        {/* Rank */}
        <span
          className="text-xs font-black opacity-30 w-6 text-right flex-shrink-0"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {rank}
        </span>

        {/* Slug */}
        <span
          className="font-mono font-bold text-sm flex-shrink-0 w-52 truncate"
          title={item.challengeSlug}
        >
          {item.challengeSlug}
        </span>

        {/* Bar track */}
        <div
          className="flex-1 h-4 neo-border relative overflow-hidden"
          style={{ background: "oklch(0.92 0.01 90)" }}
        >
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: animated ? `${item.completionRate * 100}%` : "0%",
              background: barColor,
              transition: "width 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: `${rank * 40}ms`,
            }}
          />
        </div>

        {/* Completion % */}
        <span
          className="text-sm font-black w-14 text-right flex-shrink-0"
          style={{ fontVariantNumeric: "tabular-nums", color: barColor }}
        >
          {pct}%
        </span>

        {/* Secondary stats */}
        <span
          className="text-xs text-muted-foreground w-20 text-right flex-shrink-0 font-mono"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {item.uniqueUsers} users
        </span>
        <span
          className="text-xs text-muted-foreground w-16 text-right flex-shrink-0 font-mono"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {item.avgAttempts.toFixed(1)}× avg
        </span>
      </div>

      {/* Failing objectives pills */}
      {item.topFailingObjectives.length > 0 && (
        <div className="flex gap-2 ml-10 flex-wrap">
          {item.topFailingObjectives.slice(0, 3).map((o) => (
            <span
              key={o.key}
              className="text-[10px] font-mono font-bold px-2 py-0.5 neo-border"
              style={{
                background: "oklch(0.6 0.25 25 / 0.1)",
                color: "oklch(0.45 0.2 25)",
                borderColor: "oklch(0.6 0.25 25 / 0.3)",
              }}
            >
              {o.key} ×{o.failCount}
            </span>
          ))}
        </div>
      )}
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
    <section className="mb-14">
      <div className="flex items-baseline justify-between mb-4">
        <SectionLabel>Challenge Performance</SectionLabel>
        <span className="text-xs font-mono text-muted-foreground">
          {challenges.length} challenges · sorted by reach
        </span>
      </div>

      {/* Column headers */}
      <div
        className="flex items-center gap-4 py-2 px-5 neo-border-thick neo-shadow text-[10px] font-black uppercase tracking-widest"
        style={{ background: "oklch(0.55 0.25 280)", color: "oklch(1 0 0)" }}
      >
        <span className="w-6 text-right flex-shrink-0 opacity-50">#</span>
        <span className="w-52 flex-shrink-0">Challenge</span>
        <span className="flex-1">Completion rate</span>
        <span className="w-14 text-right flex-shrink-0">Rate</span>
        <span className="w-20 text-right flex-shrink-0">Users</span>
        <span className="w-16 text-right flex-shrink-0">Avg</span>
      </div>

      {sorted.map((item, i) => (
        <ChallengeBar
          key={item.challengeSlug}
          item={item}
          rank={i + 1}
          animated={animated}
        />
      ))}

      {sorted.length === 0 && (
        <div className="neo-border-thick p-12 text-center text-sm text-muted-foreground">
          No submission data yet
        </div>
      )}
    </section>
  );
}

// ─── CLI Section ─────────────────────────────────────────────────────────────

function BigStat({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className="neo-border-thick neo-shadow p-6 flex-1"
      style={{
        background: accent ? "oklch(0.55 0.25 280)" : "oklch(0.95 0.05 85)",
        color: accent ? "oklch(1 0 0)" : "oklch(0.15 0 0)",
      }}
    >
      <div
        className="font-black leading-none mb-2"
        style={{
          fontSize: "clamp(2rem, 4vw, 3.5rem)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.03em",
        }}
      >
        {value.toLocaleString()}
      </div>
      <div
        className="text-xs font-black uppercase tracking-[0.2em]"
        style={{ opacity: 0.5 }}
      >
        {label}
      </div>
    </div>
  );
}

function ProportionalBar({
  rows,
  title,
  animated,
  delay,
}: {
  rows: { label: string; count: number }[];
  title: string;
  animated: boolean;
  delay: number;
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  const colors = [
    "oklch(0.55 0.25 280)", // purple
    "oklch(0.75 0.2 150)", // cyan
    "oklch(0.7 0.22 50)", // amber
    "oklch(0.65 0.23 330)", // pink
    "oklch(0.6 0.2 200)", // blue
  ];

  return (
    <div
      className="neo-border-thick neo-shadow p-5 flex-1"
      style={{ background: "oklch(1 0 0)" }}
    >
      <p
        className="text-[10px] font-black uppercase tracking-[0.2em] mb-5"
        style={{ color: "oklch(0.35 0 0)" }}
      >
        {title}
      </p>
      <div className="space-y-3">
        {rows.map((r, i) => {
          const pct = total > 0 ? (r.count / total) * 100 : 0;
          return (
            <div key={r.label}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-mono text-xs font-bold truncate max-w-[60%]">
                  {r.label}
                </span>
                <span
                  className="font-mono text-xs font-black"
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: colors[i % colors.length],
                  }}
                >
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div
                className="h-2 neo-border overflow-hidden"
                style={{ background: "oklch(0.92 0.01 90)" }}
              >
                <div
                  style={{
                    height: "100%",
                    width: animated ? `${pct}%` : "0%",
                    background: colors[i % colors.length],
                    transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                    transitionDelay: `${delay + i * 80}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground">No data yet</p>
        )}
      </div>
    </div>
  );
}

function CliSection({ data }: { data: AnalyticsCliOutput }) {
  const animated = useBarAnimation();

  return (
    <section className="mb-14">
      <div className="flex items-center gap-3 mb-4">
        <SectionLabel>CLI Adoption</SectionLabel>
        <Terminal className="w-4 h-4 text-muted-foreground mb-0.5" />
      </div>

      <div className="flex gap-0 mb-0">
        <BigStat value={data.totalEvents} label="CLI Events" accent />
        <BigStat value={data.uniqueUsers} label="Unique CLI Users" />
      </div>

      <div className="flex gap-0 mt-[-4px]">
        <ProportionalBar
          rows={data.byEventType.map((r) => ({
            label: r.eventType,
            count: r.count,
          }))}
          title="Event Type"
          animated={animated}
          delay={0}
        />
        <ProportionalBar
          rows={data.byVersion.map((r) => ({
            label: r.cliVersion,
            count: r.count,
          }))}
          title="CLI Version"
          animated={animated}
          delay={100}
        />
        <ProportionalBar
          rows={data.byOs.map((r) => ({ label: r.os, count: r.count }))}
          title="Operating System"
          animated={animated}
          delay={200}
        />
      </div>
    </section>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs font-black uppercase tracking-[0.25em] mb-4"
      style={{ color: "oklch(0.35 0 0)" }}
    >
      {children}
    </h2>
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
    <div className="py-10">
      {/* Page header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              background: "oklch(0.75 0.2 150)",
              boxShadow: "0 0 8px oklch(0.75 0.2 150)",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
          <span
            className="text-[10px] font-black uppercase tracking-[0.3em]"
            style={{ color: "oklch(0.75 0.2 150)" }}
          >
            Live
          </span>
        </div>
        <h1
          className="font-black leading-none"
          style={{
            fontSize: "clamp(2.5rem, 6vw, 5rem)",
            letterSpacing: "-0.04em",
          }}
        >
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground font-medium mt-2">
          Platform metrics across users, challenges and CLI adoption
        </p>
      </div>

      {/* Divider */}
      <div
        className="neo-border-thick mb-10"
        style={{
          borderBottom: "none",
          borderLeft: "none",
          borderRight: "none",
        }}
      />

      <Suspense
        fallback={
          <div
            className="font-mono text-sm"
            style={{ color: "oklch(0.75 0.2 150)" }}
          >
            loading metrics...
          </div>
        }
      >
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}
