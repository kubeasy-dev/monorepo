import type { ChallengeListItem } from "@kubeasy/api-schemas/challenges";
import { Badge } from "@kubeasy/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@kubeasy/ui/card";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, Clock, PlayCircle, Users } from "lucide-react";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { trackChallengeCardClicked } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type ChallengeStatus = "not_started" | "in_progress" | "completed";

const statusConfig: Record<
  ChallengeStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    className: string;
  }
> = {
  not_started: {
    icon: Circle,
    label: "Not Started",
    className: "bg-muted text-muted-foreground",
  },
  in_progress: {
    icon: PlayCircle,
    label: "In Progress",
    className: "bg-accent text-accent-foreground",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    className: "bg-primary text-primary-foreground",
  },
};

export function ChallengeCard({
  challenge,
}: Readonly<{
  challenge: ChallengeListItem;
}>) {
  const card = (
    <Card
      className={cn(
        "group hover:neo-shadow-lg transition-all h-full neo-border neo-shadow bg-card flex flex-col relative overflow-hidden",
      )}
    >
      {/* Challenge of the Week Ribbon */}
      {challenge.ofTheWeek && (
        <div className="absolute -top-1 -right-1 w-32 h-32 overflow-hidden z-10">
          <div className="absolute top-0 right-0 w-full h-full">
            <div className="absolute top-0 right-0 w-0 h-0 border-l-[128px] border-l-transparent border-t-[128px] border-t-primary/5" />
            <div className="absolute top-6 -right-8 w-40 text-center bg-primary text-primary-foreground font-black text-[10px] py-1.5 transform rotate-45 border-y-4 border-black shadow-xs">
              ⭐ OF THE WEEK
            </div>
          </div>
        </div>
      )}

      <CardHeader>
        {challenge.userStatus && challenge.userStatus in statusConfig && (
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className={cn(
                "font-bold neo-border flex items-center gap-1",
                statusConfig[challenge.userStatus as ChallengeStatus].className,
              )}
            >
              {(() => {
                const StatusIcon =
                  statusConfig[challenge.userStatus as ChallengeStatus].icon;
                return <StatusIcon className="h-3 w-3" />;
              })()}
              {statusConfig[challenge.userStatus as ChallengeStatus].label}
            </Badge>
          </div>
        )}
        <CardTitle className="text-xl font-black group-hover:text-primary transition-colors">
          {challenge.title}
        </CardTitle>
        <CardDescription className="leading-relaxed font-medium">
          {challenge.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <DifficultyBadge difficulty={challenge.difficulty} size="sm" />
            <Badge
              variant="secondary"
              className="text-xs font-bold neo-border w-fit"
            >
              {challenge.theme}
            </Badge>
            <Badge
              variant="outline"
              className="text-xs font-bold neo-border w-fit"
            >
              {challenge.type}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm font-bold pt-4">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{challenge.estimatedTime} min</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{challenge.completedCount} completed</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Link
      to="/challenges/$slug"
      params={{ slug: challenge.slug }}
      onClick={() =>
        trackChallengeCardClicked(
          challenge.slug,
          challenge.difficulty,
          "challenges_list",
        )
      }
    >
      {card}
    </Link>
  );
}
