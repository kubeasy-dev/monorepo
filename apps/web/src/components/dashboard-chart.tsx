import { TrendingUp } from "lucide-react";
import { Suspense, lazy, useEffect, useState, type ComponentType } from "react";

function ChartFallback() {
  return (
    <div className="bg-secondary neo-border-thick neo-shadow p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary neo-border-thick neo-shadow rounded-lg">
          <TrendingUp className="w-5 h-5 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-black">Skills by Themes</h2>
      </div>
      <div className="flex items-center justify-center h-40 text-muted-foreground font-bold">
        Loading chart...
      </div>
    </div>
  );
}

// Lazy-loaded only on client to keep recharts out of the SSR bundle.
// useEffect never runs on the server, so the dynamic import is never
// triggered during SSR/prerender — eliminating the CJS/ESM interop crash.
export function DashboardChart() {
  const [Chart, setChart] = useState<ComponentType | null>(null);

  useEffect(() => {
    import("./dashboard-chart-client").then((m) => {
      setChart(() => m.DashboardChartClient);
    });
  }, []);

  if (!Chart) return <ChartFallback />;

  return (
    <Suspense fallback={<ChartFallback />}>
      <Chart />
    </Suspense>
  );
}
