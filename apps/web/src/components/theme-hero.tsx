import type { Theme } from "@kubeasy/api-schemas/themes";
import { TrendingUp } from "lucide-react";
import { LucideIcon, type LucideIconName } from "./lucide-icon";

interface ThemeHeroProps {
  theme: Theme;
  totalChallenges: number;
}

export function ThemeHero({ theme, totalChallenges }: ThemeHeroProps) {
  return (
    <div className="bg-secondary text-foreground p-8 md:p-12 neo-border-thick neo-shadow-xl mb-12">
      <div className="flex items-start gap-6">
        {theme.logo && (
          <div className="p-6 bg-primary neo-border-thick shrink-0">
            <LucideIcon
              name={theme.logo as LucideIconName}
              className="h-12 w-12 text-primary-foreground"
            />
          </div>
        )}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-0.5 bg-primary text-primary-foreground neo-border font-black uppercase text-xs mb-3">
            <TrendingUp className="h-3 w-3" />
            <span>{totalChallenges} Challenges</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
            {theme.name}
          </h1>
          <p className="text-xl font-bold opacity-90 max-w-3xl leading-relaxed">
            {theme.description}
          </p>
        </div>
      </div>
    </div>
  );
}
