import type { GetStatusOutput } from "@kubeasy/api-schemas/progress";
import type {
  AuditEvent,
  Objective,
  SubmissionRecord,
} from "@kubeasy/api-schemas/submissions";
import { Card, CardContent, CardHeader, CardTitle } from "@kubeasy/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { CheckCircle2, Terminal, Trophy, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  challengeStatusOptions,
  submissionsOptions,
} from "@/lib/query-options";
import type { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";

type SubmissionsOutput = InferResponseType<
  (typeof rpc.submissions)[":slug"]["$get"],
  200
>;

type TimelineItem =
  | { type: "start"; timestamp: Date }
  | {
      type: "audit";
      timestamp: Date;
      verb: string;
      resource: string;
      name?: string;
    }
  | {
      type: "submission";
      id: string;
      timestamp: Date;
      validated: boolean;
      objectives: Objective[] | null;
      attemptNumber: number;
    }
  | { type: "completed"; timestamp: Date };

const TYPE_ORDER: Record<TimelineItem["type"], number> = {
  start: 0,
  audit: 1,
  submission: 2,
  completed: 3,
};

// Color-code audit events by verb for quick scanning
const VERB_COLOR: Record<string, string> = {
  create: "bg-green-500",
  delete: "bg-red-500",
  patch: "bg-blue-500",
  update: "bg-amber-500",
  apply: "bg-purple-500",
  replace: "bg-orange-500",
};

function formatAuditEvent(item: Extract<TimelineItem, { type: "audit" }>) {
  const target = item.name ? `${item.resource}/${item.name}` : item.resource;
  return `${item.verb} ${target}`;
}

// Square spine markers — no circles in this design system
function SpineMarker({ item }: { item: TimelineItem }) {
  if (item.type === "start") {
    return <div className="w-5 h-5 bg-black flex-shrink-0" />;
  }
  if (item.type === "completed") {
    return <div className="w-5 h-5 bg-amber-400 neo-border flex-shrink-0" />;
  }
  if (item.type === "submission") {
    return (
      <div
        className={cn(
          "w-5 h-5 neo-border flex-shrink-0",
          item.validated ? "bg-green-400" : "bg-red-400",
        )}
      />
    );
  }
  // audit — verb-colored small square
  const color = VERB_COLOR[item.verb] ?? "bg-black/30";
  return <div className={cn("w-2.5 h-2.5 flex-shrink-0", color)} />;
}

function ObjectivesPopover({ objectives }: { objectives: Objective[] }) {
  return (
    <div className="absolute left-0 top-full mt-2 z-20 bg-white neo-border-thick neo-shadow p-4 min-w-64 max-w-sm">
      <p className="text-xs font-black uppercase tracking-widest mb-3 text-black/40">
        Objectives
      </p>
      <div className="space-y-2">
        {objectives.map((obj) => (
          <div key={obj.key} className="flex items-start gap-2.5">
            {obj.passed ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <span className="text-sm font-bold leading-snug">{obj.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineRow({
  item,
  isLast,
}: {
  item: TimelineItem;
  isLast: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isAudit = item.type === "audit";

  return (
    // relative mb-2: each row is its own block, spine is absolute behind
    <div
      className={cn(
        "relative flex items-center gap-3",
        isLast ? "" : isAudit ? "mb-1" : "mb-2",
      )}
    >
      {/* Marker: z-10 sits on top of the absolute spine */}
      <div className="w-8 flex-shrink-0 flex items-center justify-center z-10 relative">
        <SpineMarker item={item} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {item.type === "start" && (
          <div className="flex items-center justify-between neo-border-thick bg-black text-white px-4 py-2.5">
            <span className="text-sm font-black uppercase tracking-widest">
              Challenge Started
            </span>
            <span className="text-xs font-bold text-white/50 tabular-nums">
              {item.timestamp.toLocaleTimeString()}
            </span>
          </div>
        )}

        {item.type === "audit" && (
          <div className="flex items-center gap-3 neo-border bg-white px-3 py-1.5">
            {/* Verb-colored accent square inside the row */}
            <div
              className={cn(
                "w-1.5 h-4 flex-shrink-0",
                VERB_COLOR[item.verb] ?? "bg-black/20",
              )}
            />
            <span className="text-sm font-mono text-black/65 flex-1 truncate">
              {formatAuditEvent(item)}
            </span>
            <span className="text-xs font-bold text-black/25 tabular-nums flex-shrink-0">
              {item.timestamp.toLocaleTimeString()}
            </span>
          </div>
        )}

        {item.type === "submission" && (
          <div
            className="relative"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <div
              className={cn(
                "flex items-center justify-between px-4 py-2.5 neo-border-thick cursor-default transition-transform",
                item.validated
                  ? "bg-green-50 neo-border-green hover:translate-x-[2px] hover:translate-y-[2px]"
                  : "bg-red-50 neo-border-destructive hover:translate-x-[2px] hover:translate-y-[2px]",
              )}
            >
              <div className="flex items-center gap-2.5">
                {item.validated ? (
                  <CheckCircle2 className="h-5 w-5 text-green-700 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-700 flex-shrink-0" />
                )}
                <span
                  className={cn(
                    "text-sm font-black uppercase tracking-wide",
                    item.validated ? "text-green-900" : "text-red-900",
                  )}
                >
                  Submit #{item.attemptNumber}
                </span>
                <span
                  className={cn(
                    "text-sm font-bold",
                    item.validated ? "text-green-700" : "text-red-700",
                  )}
                >
                  — {item.validated ? "Passed" : "Failed"}
                </span>
              </div>
              <span className="text-xs font-bold text-black/35 tabular-nums">
                {item.timestamp.toLocaleTimeString()}
              </span>
            </div>
            {hovered && item.objectives && item.objectives.length > 0 && (
              <ObjectivesPopover objectives={item.objectives} />
            )}
          </div>
        )}

        {item.type === "completed" && (
          <div className="flex items-center justify-between neo-border-thick bg-amber-50 neo-border-amber px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <Trophy className="h-5 w-5 text-amber-700 flex-shrink-0" />
              <span className="text-sm font-black uppercase tracking-wide text-amber-900">
                Challenge Complete
              </span>
            </div>
            <span className="text-xs font-bold text-black/35 tabular-nums">
              {item.timestamp.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChallengeTimeline({ slug }: { slug: string }) {
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session;

  const { data: statusData } = useQuery({
    ...challengeStatusOptions(slug),
    enabled: isAuthenticated,
  });

  const { data: submissionsData } = useQuery({
    ...submissionsOptions(slug),
    enabled: isAuthenticated,
  });

  const status = statusData?.status ?? "not_started";

  const timelineItems = useMemo((): TimelineItem[] => {
    const s = statusData as GetStatusOutput | undefined;
    if (!s?.startedAt) return [];

    const items: TimelineItem[] = [];

    items.push({ type: "start", timestamp: new Date(s.startedAt) });

    const submissions =
      ((submissionsData as SubmissionsOutput | undefined)
        ?.submissions as SubmissionRecord[]) ?? [];

    const startedAtMs = new Date(s.startedAt).getTime();

    // Filter out submissions from before the current startedAt (e.g. after a reset)
    const chronological = [...submissions]
      .reverse()
      .filter((sub) => new Date(sub.timestamp).getTime() >= startedAtMs);

    for (const sub of chronological) {
      for (const event of sub.auditEvents ?? []) {
        const eventTime = new Date((event as AuditEvent).timestamp).getTime();
        if (eventTime < startedAtMs) continue;
        items.push({
          type: "audit",
          timestamp: new Date((event as AuditEvent).timestamp),
          verb: (event as AuditEvent).verb,
          resource: (event as AuditEvent).resource,
          name: (event as AuditEvent).name,
        });
      }

      items.push({
        type: "submission",
        id: sub.id,
        timestamp: new Date(sub.timestamp),
        validated: sub.validated,
        objectives: sub.objectives,
        attemptNumber: sub.attemptNumber,
      });
    }

    if (status === "completed" && s.completedAt) {
      items.push({
        type: "completed",
        timestamp: new Date(s.completedAt),
      });
    }

    items.sort((a, b) => {
      const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
      if (timeDiff !== 0) return timeDiff;
      return TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
    });

    return items;
  }, [statusData, submissionsData, status]);

  if (
    !isAuthenticated ||
    status === "not_started" ||
    timelineItems.length === 0
  ) {
    return null;
  }

  const auditCount = timelineItems.filter((i) => i.type === "audit").length;

  return (
    <Card className="neo-border-thick neo-shadow-xl bg-secondary mt-6">
      <CardHeader>
        <CardTitle className="text-2xl font-black flex items-center gap-3">
          <Terminal className="h-6 w-6" />
          Challenge History
          {auditCount > 0 && (
            <span className="ml-auto text-xs font-bold text-foreground/40 uppercase tracking-wide">
              {auditCount} command{auditCount !== 1 ? "s" : ""}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Continuous spine */}
          <div className="absolute left-[15px] top-5 bottom-5 w-[3px] bg-black/20" />

          {timelineItems.map((item, index) => {
            const key =
              item.type === "submission"
                ? `submission-${item.id}`
                : `${item.type}-${item.timestamp.toISOString()}-${index}`;

            return (
              <TimelineRow
                key={key}
                item={item}
                isLast={index === timelineItems.length - 1}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
