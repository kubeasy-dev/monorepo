import { ArrowRight, Terminal } from "lucide-react";
import { lazy, Suspense } from "react";
import { TypewriterText } from "./typewriter-text";

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

            <h1 className="text-7xl font-black leading-[1.1] text-balance">
              <TypewriterText
                texts={["Build it.", "Fix it.", "Migrate it."]}
                typingSpeed={100}
                deletingSpeed={80}
              />
              <br />
              <span className="text-primary">Learn Kubernetes.</span>
            </h1>

            <p className="text-lg md:text-xl font-medium leading-relaxed max-w-xl">
              Practice Kubernetes through real scenarios on your own machine —
              from building clean workloads to fixing broken configs and
              migrating deprecated APIs.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href="/get-started"
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
