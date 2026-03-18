import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { LucideIcon, type LucideIconName } from "./lucide-icon";

interface TypeInfo {
  name: string;
  slug: string;
  description: string;
  logo: LucideIconName | null;
  challengeCount: number;
}

interface TypeCardProps {
  type: TypeInfo;
}

export function TypeCard({ type }: TypeCardProps) {
  return (
    <Link
      to="/types/$slug"
      params={{ slug: type.slug }}
      className="bg-secondary text-foreground p-8 neo-border-thick neo-shadow-lg hover:neo-shadow-xl hover:-translate-y-1 transition-all group flex flex-col"
    >
      {/* Icon */}
      {type.logo && (
        <div className="mb-6">
          <div className="inline-flex p-4 bg-primary neo-border-thick">
            <LucideIcon name={type.logo} className="h-8 w-8 text-white" />
          </div>
        </div>
      )}

      {/* Title & Description */}
      <h3 className="text-2xl font-black mb-3 flex items-center justify-between">
        {type.name}
        <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
      </h3>
      <p className="text-base font-bold opacity-90 mb-6 leading-relaxed">
        {type.description}
      </p>

      {/* Spacer to push content to bottom */}
      <div className="flex-1" />

      {/* Challenge count */}
      <div className="flex gap-3">
        <div className="bg-black/20 backdrop-blur-sm px-4 py-2 neo-border">
          <div className="text-xl font-black">{type.challengeCount}</div>
          <div className="text-xs font-bold uppercase opacity-90">
            Challenges
          </div>
        </div>
      </div>
    </Link>
  );
}
