import type { ChallengeCompletedEventData } from "@kubeasy/api-schemas/sse-events";
import { Button } from "@kubeasy/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@kubeasy/ui/dialog";
import { CheckCircle2, Link, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChallengeCompletionModalProps {
  payload: ChallengeCompletedEventData | null;
  onClose: () => void;
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function BlueSkyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 320"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M180 141.964C163.699 110.262 119.308 51.1 78.476 26.703 39.717 3.23 16.451 0 5.065 0c-11.34 0-5.072 19.52-.699 27.418 5.383 9.697 24.046 40.816 35.376 57.254C51.204 101.153 68.54 114.5 81.059 119.5c-12.519-5-48.098-35.47-64.815-43.497-6.77-3.364-17.218-9.73-19.4-3.764-4.062 11.15 4.014 17.427 13.046 25.085 22.83 19.406 65.543 57.614 71.77 62.526-6.228-4.912-62.02-28.4-80.58-35.44-8.524-3.265-19.79-6.64-16.07 7.247 4.003 14.764 52.887 49.79 83.76 65.463-32.68-4.914-60.16-1.52-61.45 11.217-1.176 11.598 37.584 27.55 63.614 27.55H180" />
      <path d="M180 141.964C196.301 110.262 240.692 51.1 281.524 26.703 320.283 3.23 343.549 0 354.935 0c11.34 0 5.072 19.52.699 27.418-5.383 9.697-24.046 40.816-35.376 57.254-11.463 17.43-28.8 30.778-41.318 35.778 12.519-5 48.098-35.47 64.815-43.497 6.77-3.364 17.218-9.73 19.4-3.764 4.062 11.15-4.014 17.427-13.046 25.085-22.83 19.406-65.543 57.614-71.77 62.526 6.228-4.912 62.02-28.4 80.58-35.44 8.524-3.265 19.79-6.64 16.07 7.247-4.003 14.764-52.887 49.79-83.76 65.463 32.68-4.914 60.16-1.52 61.45 11.217 1.176 11.598-37.584 27.55-63.614 27.55H180" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const CONFETTI_COLORS = [
  "bg-yellow-400",
  "bg-pink-400",
  "bg-blue-400",
  "bg-green-400",
  "bg-purple-400",
  "bg-orange-400",
];

const CONFETTI_PIECES = Array.from({ length: 24 }, (_, i) => ({
  id: `confetti-${i}`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: `${(i * 37 + 5) % 95}%`,
  delay: `${(i * 0.13) % 2}s`,
  width: i % 3 === 0 ? "w-2" : "w-3",
  height: i % 3 === 0 ? "h-3" : "h-2",
}));

function ConfettiPiece({
  color,
  left,
  delay,
  width,
  height,
}: {
  color: string;
  left: string;
  delay: string;
  width: string;
  height: string;
}) {
  return (
    <div
      className={cn(
        "absolute animate-confetti rounded-sm",
        color,
        width,
        height,
      )}
      style={{ left, animationDelay: delay }}
    />
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 bg-white neo-border rounded-lg flex-1">
      <span className="text-2xl font-black">{value}</span>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

export function ChallengeCompletionModal({
  payload,
  onClose,
}: ChallengeCompletionModalProps) {
  const challengeUrl =
    typeof window !== "undefined" && payload
      ? `${window.location.origin}/challenges/${payload.challengeSlug}`
      : "";

  const shareText = payload
    ? encodeURIComponent(
        `Just completed the "${payload.challengeSlug.replace(/-/g, " ")}" Kubernetes challenge on @kubeasy_dev! 🚀 (+${payload.xpGain.total} XP)`,
      )
    : "";
  const shareUrl = encodeURIComponent(challengeUrl);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
    bluesky: `https://bsky.app/intent/compose?text=${shareText}%20${shareUrl}`,
  };

  function copyLink() {
    navigator.clipboard.writeText(challengeUrl).then(
      () => {
        toast.success("Link copied!");
      },
      () => {
        toast.error("Failed to copy link");
      },
    );
  }

  return (
    <Dialog
      open={payload !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {payload && (
        <DialogContent className="max-w-lg neo-border-thick neo-shadow-xl overflow-hidden">
          {/* Confetti */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
            {CONFETTI_PIECES.map((p) => (
              <ConfettiPiece key={p.id} {...p} />
            ))}
          </div>

          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <Trophy className="h-7 w-7 text-yellow-500" />
              Challenge Completed!
            </DialogTitle>
            <DialogDescription className="font-semibold">
              <span className="capitalize">
                {payload.challengeSlug.replace(/-/g, " ")}
              </span>
              {" · "}
              <span className="capitalize">
                {
                  { easy: "Easy", medium: "Medium", hard: "Hard" }[
                    payload.difficulty
                  ]
                }
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="relative z-10 space-y-4 mt-2">
            {/* Stats row */}
            <div className="flex gap-2">
              <StatCard label="Attempts" value={payload.attemptsCount} />
              <StatCard label="K8s Calls" value={payload.commandsCount} />
            </div>

            {/* XP card */}
            <div className="bg-primary text-primary-foreground neo-border-thick rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <span className="font-black text-lg">XP Earned</span>
                <span className="ml-auto text-3xl font-black">
                  +{payload.xpGain.total}
                </span>
              </div>
              <div className="space-y-1 text-sm font-medium opacity-90">
                <div className="flex justify-between">
                  <span>Base XP</span>
                  <span>+{payload.xpGain.base}</span>
                </div>
                {payload.xpGain.firstChallenge > 0 && (
                  <div className="flex justify-between">
                    <span>First challenge bonus</span>
                    <span>+{payload.xpGain.firstChallenge}</span>
                  </div>
                )}
                {payload.xpGain.streak > 0 && (
                  <div className="flex justify-between">
                    <span>Streak bonus ({payload.currentStreak} days)</span>
                    <span>+{payload.xpGain.streak}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Level-up banner */}
            {payload.leveledUp && (
              <div className="bg-yellow-50 neo-border-thick neo-border-amber rounded-lg p-3 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <p className="font-black text-yellow-900">
                  You ranked up to{" "}
                  <span className="text-yellow-700">
                    {payload.newRank.name}
                  </span>
                  !
                </p>
              </div>
            )}

            {/* First challenge banner */}
            {payload.isFirstChallenge && !payload.leveledUp && (
              <div className="bg-blue-50 neo-border-thick rounded-lg p-3 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <p className="font-bold text-blue-900">
                  First challenge completed!
                </p>
              </div>
            )}

            {/* Share buttons */}
            <div className="space-y-2">
              <p className="text-sm font-bold">Share your achievement:</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="neo-border font-bold gap-2"
                  asChild
                >
                  <a
                    href={shareLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <XIcon className="h-4 w-4" />
                    Post
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="neo-border font-bold gap-2"
                  asChild
                >
                  <a
                    href={shareLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LinkedInIcon className="h-4 w-4" />
                    Share
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="neo-border font-bold gap-2"
                  asChild
                >
                  <a
                    href={shareLinks.bluesky}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BlueSkyIcon className="h-4 w-4" />
                    Post
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="neo-border font-bold gap-2"
                  onClick={copyLink}
                >
                  <Link className="h-4 w-4" />
                  Copy link
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
