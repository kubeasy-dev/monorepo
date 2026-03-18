import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { LucideIcon, type LucideIconName } from "./lucide-icon";

interface ThemeInfo {
  name: string;
  slug: string;
  description: string;
  logo: LucideIconName | null;
}

interface ThemeProgress {
  completedCount: number;
  totalCount: number;
  percentageCompleted: number;
}

interface ThemeCardProps {
  theme: ThemeInfo;
  progress?: ThemeProgress | null;
}

export function ThemeCard({ theme, progress }: ThemeCardProps) {
  const hasProgress = !!progress;

  return (
    <Link
      to="/themes/$slug"
      params={{ slug: theme.slug }}
      className="bg-secondary text-foreground p-8 neo-border-thick neo-shadow-lg hover:neo-shadow-xl hover:-translate-y-1 transition-all group flex flex-col"
    >
      {/* Icon */}
      {theme.logo && (
        <div className="mb-6">
          <div className="inline-flex p-4 bg-primary neo-border-thick">
            <LucideIcon name={theme.logo} className="h-8 w-8 text-white" />
          </div>
        </div>
      )}

      {/* Title & Description */}
      <h3 className="text-2xl font-black mb-3 flex items-center justify-between">
        {theme.name}
        <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
      </h3>
      <p className="text-base font-bold opacity-90 mb-6 leading-relaxed">
        {theme.description}
      </p>

      {/* Spacer to push content to bottom */}
      <div className="flex-1" />

      {/* Stats - Only show if user is authenticated */}
      {hasProgress && (
        <>
          <div className="flex gap-3 mb-4">
            <div className="bg-black/20 backdrop-blur-sm px-4 py-2 neo-border">
              <div className="text-xl font-black">{progress.totalCount}</div>
              <div className="text-xs font-bold uppercase opacity-90">
                Challenges
              </div>
            </div>
            <div className="bg-black/20 backdrop-blur-sm px-4 py-2 neo-border">
              <div className="text-xl font-black">
                {progress.percentageCompleted}%
              </div>
              <div className="text-xs font-bold uppercase opacity-90">
                Complete
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-3 bg-black/20 neo-border overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-500"
              style={{ width: `${progress.percentageCompleted}%` }}
            />
          </div>
        </>
      )}
    </Link>
  );
}
