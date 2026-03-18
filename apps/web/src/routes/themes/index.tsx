import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import type { LucideIconName } from "@/components/lucide-icon";
import { ThemeCard } from "@/components/theme-card";
import { themeListOptions } from "@/lib/query-options";

export const Route = createFileRoute("/themes/")({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(themeListOptions());
  },
  component: ThemeListPage,
});

function ThemeListPage() {
  const { data: themes } = useSuspenseQuery(themeListOptions());

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      {/* Hero Section */}
      <div className="mb-12 space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white neo-border-thick font-black neo-shadow uppercase text-sm">
          <TrendingUp className="h-4 w-4" />
          <span>Browse by Theme</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-balance leading-tight">
          Explore Kubernetes
          <br />
          <span className="text-primary">by Topic</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed font-bold">
          Dive deep into specific Kubernetes concepts. Each theme contains
          curated challenges to help you master that topic.
        </p>
      </div>

      {/* Theme Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.slug}
            theme={{
              name: theme.name,
              slug: theme.slug,
              description: theme.description,
              logo: theme.logo as LucideIconName | null,
            }}
            progress={null}
          />
        ))}
      </div>
    </div>
  );
}
