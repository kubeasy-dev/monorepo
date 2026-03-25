import { useSuspenseQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { completionOptions, themeListOptions } from "@/lib/query-options";

export function DashboardChartClient() {
  const { data: completion } = useSuspenseQuery(
    completionOptions({ splitByTheme: true }),
  );
  const { data: themeList } = useSuspenseQuery(themeListOptions());

  const chartData =
    completion?.byTheme?.map((item) => {
      const theme = themeList?.find((t) => t.slug === item.themeSlug);
      return {
        themeName: theme?.name ?? item.themeSlug,
        percentageCompleted: item.percentageCompleted,
      };
    }) ?? [];

  const bestTheme =
    completion?.byTheme && completion.byTheme.length > 0
      ? completion.byTheme.reduce((best, item) =>
          item.percentageCompleted > best.percentageCompleted ? item : best,
        )
      : null;

  const bestThemeName = bestTheme
    ? (themeList?.find((t) => t.slug === bestTheme.themeSlug)?.name ??
      bestTheme.themeSlug)
    : null;

  return (
    <div className="bg-secondary neo-border-thick neo-shadow p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary neo-border-thick neo-shadow rounded-lg">
          <TrendingUp className="w-5 h-5 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-black">Skills by Themes</h2>
      </div>

      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground font-bold">
          Master all themes to become a Kubernetes expert!
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartData}>
            <PolarGrid stroke="#000" strokeWidth={2} />
            <PolarAngleAxis
              dataKey="themeName"
              tick={{ fill: "#000", fontWeight: "bold", fontSize: 12 }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
            <Radar
              name="Completion"
              dataKey="percentageCompleted"
              stroke="#6366F1"
              fill="#6366F1"
              fillOpacity={0.6}
              strokeWidth={3}
            />
          </RadarChart>
        </ResponsiveContainer>
      )}

      <div className="mt-4 p-4 bg-secondary neo-border-thick rounded-xl">
        {bestThemeName && bestTheme && bestTheme.percentageCompleted > 0 ? (
          <p className="text-sm font-bold text-center">
            Your best theme is{" "}
            <span className="text-primary">{bestThemeName}</span> at{" "}
            {bestTheme.percentageCompleted}%!
          </p>
        ) : (
          <p className="text-sm font-bold text-center">
            Master all themes to become a Kubernetes expert!
          </p>
        )}
      </div>
    </div>
  );
}
