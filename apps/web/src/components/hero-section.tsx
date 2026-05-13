import { ArrowRight, Terminal } from "lucide-react";
import { lazy, Suspense } from "react";

const InteractiveTerminal = lazy(() => import("./interactive-terminal"));

export function HeroSection() {
  return (
    <section className="relative pb-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-sm font-bold neo-border neo-shadow">
              <Terminal className="h-4 w-4" />
              <span>CLI-Driven • Local Cluster • Free</span>
            </div>

            <h1 className="text-6xl font-black leading-[1.1] text-balance">
              Learn Kubernetes by solving{" "}
              <span className="text-primary">real broken clusters.</span>
            </h1>

            <p className="text-xl md:text-2xl font-black">
              13 hands-on challenges. From CrashLoopBackOff to RBAC.
            </p>

            <p className="text-lg md:text-xl font-medium leading-relaxed max-w-xl">
              Debug, fix, and migrate Kubernetes workloads on your own machine —
              the problems you’ll actually face in production.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href="/docs/user/getting-started"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-black text-lg neo-border neo-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
              <a
                href="/challenges"
                className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md font-black text-lg neo-border neo-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                Browse Challenges
              </a>
            </div>
          </div>

          <div className="flex-1 w-full">
            <Suspense fallback={<div className="min-h-[250px]" />}>
              <InteractiveTerminal />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
