import type { ChallengeDifficulty } from "@kubeasy/api-schemas/challenges";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const difficultyColors: Record<ChallengeDifficulty, string> = {
  easy: "bg-primary-light text-primary-light-foreground",
  medium: "bg-primary text-primary-foreground",
  hard: "bg-primary-dark text-primary-dark-foreground",
};

const difficultySizes: Record<"sm" | "md" | "lg", string> = {
  sm: "text-xs",
  md: "text-sm px-2 py-0.5 neo-shadow-sm",
  lg: "text-md px-4 py-1.5 neo-shadow",
};

export function DifficultyBadge({
  difficulty,
  size = "md",
}: {
  difficulty: ChallengeDifficulty;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize border-black neo-border",
        difficultyColors[difficulty],
        difficultySizes[size],
      )}
    >
      {difficulty}
    </Badge>
  );
}
