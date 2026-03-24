import type { XpTransaction } from "@kubeasy/api-schemas/xp";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Clock, History, Trophy, X } from "lucide-react";
import { Button } from "@kubeasy/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@kubeasy/ui/dialog";
import { xpTransactionsOptions } from "@/lib/query-options";
import { cn } from "@/lib/utils";

const PREVIEW_COUNT = 4;

function groupByMonth(transactions: XpTransaction[]) {
  const map = new Map<string, { label: string; items: XpTransaction[] }>();
  for (const tx of transactions) {
    const date = new Date(tx.createdAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const label = date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const group = map.get(key);
    if (group) {
      group.items.push(tx);
    } else {
      map.set(key, { label, items: [tx] });
    }
  }
  return Array.from(map.entries()).map(([key, value]) => ({ key, ...value }));
}

function ActivityItem({
  activity,
  compact = false,
}: {
  activity: XpTransaction;
  compact?: boolean;
}) {
  const hasChallenge =
    activity.challengeSlug !== null && activity.challengeTitle !== null;
  const date = new Date(activity.createdAt);

  return (
    <div
      className={cn(
        "bg-background neo-border-thick neo-shadow-sm relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[4px] before:bg-primary",
        compact ? "pl-4" : "pl-6",
      )}
    >
      <div className={cn("flex items-start gap-3", compact ? "p-3" : "p-4")}>
        <div className="p-1.5 neo-border-thick neo-shadow-sm rounded-lg bg-secondary shrink-0">
          <Trophy
            className={cn("text-primary", compact ? "w-3.5 h-3.5" : "w-4 h-4")}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            {hasChallenge ? (
              <Link
                to="/challenges/$slug"
                params={{ slug: activity.challengeSlug as string }}
                className="font-black hover:text-primary transition-colors text-sm block truncate"
              >
                {activity.challengeTitle}
              </Link>
            ) : (
              <span className="font-black text-sm block truncate">
                {activity.description}
              </span>
            )}
            {activity.xpAmount > 0 && (
              <div className="px-1.5 py-0.5 bg-primary neo-border shrink-0">
                <span className="text-xs font-black text-primary-foreground">
                  +{activity.xpAmount} XP
                </span>
              </div>
            )}
          </div>
          {hasChallenge && (
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-xs text-muted-foreground font-bold">
                {activity.description}
              </p>
              <p className="text-xs text-muted-foreground font-bold shrink-0 ml-2">
                {date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          )}
          {!hasChallenge && (
            <p className="text-xs text-muted-foreground font-bold mt-0.5">
              {date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardRecentActivity() {
  const { data: transactions } = useSuspenseQuery(xpTransactionsOptions());

  const preview = (transactions ?? []).slice(0, PREVIEW_COUNT);
  const recentXp = (transactions ?? []).reduce(
    (sum, tx) => sum + tx.xpAmount,
    0,
  );
  const grouped = groupByMonth(transactions ?? []);

  return (
    <div className="bg-secondary neo-border-thick neo-shadow p-8 mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary neo-border-thick neo-shadow rounded-lg">
          <Clock className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-2xl font-black">Recent Activity</h2>
      </div>

      {!transactions || transactions.length === 0 ? (
        <p className="text-muted-foreground font-bold text-sm py-4 text-center">
          No activity yet. Complete a challenge to get started!
        </p>
      ) : (
        <>
          <div className="space-y-4">
            {preview.map((tx) => (
              <ActivityItem key={tx.id} activity={tx} />
            ))}
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full mt-6 neo-border neo-shadow font-black">
                View All Activity
                <History className="ml-2 w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent
              className="p-0 gap-0 overflow-hidden"
              hideCloseButton
            >
              <DialogTitle className="sr-only">Activity Log</DialogTitle>

              {/* Purple header with explicit close button */}
              <div className="bg-primary px-6 py-5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-primary-foreground" />
                    <span className="text-xl font-black text-primary-foreground">
                      Activity Log
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-white/20 border border-white/30">
                      <span className="text-sm font-black text-primary-foreground">
                        +{recentXp} XP recently
                      </span>
                    </div>
                    <span className="text-primary-foreground/80 text-sm font-bold">
                      {transactions.length} recent{" "}
                      {transactions.length === 1 ? "activity" : "activities"}
                    </span>
                  </div>
                </div>
                <DialogClose className="text-primary-foreground/80 hover:text-primary-foreground transition-colors mt-1 shrink-0">
                  <X className="w-5 h-5" />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </div>

              {/* Grouped list */}
              <div className="overflow-y-auto max-h-[55vh] p-5 space-y-5">
                {grouped.map(({ label, key, items }) => (
                  <div key={key}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                        {label}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="space-y-2">
                      {items.map((tx) => (
                        <ActivityItem key={tx.id} activity={tx} compact />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
