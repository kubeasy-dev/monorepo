import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Terminal } from "lucide-react";

export const Route = createFileRoute("/get-started")({
  component: GetStartedPage,
});

function GetStartedPage() {
  return (
    <div className="container mx-auto px-4 max-w-4xl py-12">
      <div className="mb-12 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white neo-border-thick font-black neo-shadow uppercase text-sm">
          <Terminal className="h-4 w-4" />
          <span>Get Started</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-balance leading-tight">
          Start Learning
          <br />
          <span className="text-primary">Kubernetes Today</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-bold">
          Set up your local environment and start solving real Kubernetes
          challenges in minutes.
        </p>
      </div>

      <div className="space-y-8">
        {/* Step 1 */}
        <div className="bg-secondary neo-border-thick neo-shadow p-8">
          <div className="flex items-start gap-6">
            <span className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground font-black flex items-center justify-center neo-border text-xl">
              1
            </span>
            <div className="flex-1">
              <h2 className="text-2xl font-black mb-3">Install the CLI</h2>
              <p className="font-bold text-muted-foreground mb-4">
                Install the Kubeasy CLI tool on your machine.
              </p>
              <div className="bg-black text-green-400 p-4 rounded-lg neo-border-thick font-mono">
                <span className="text-gray-500">$</span> brew install
                kubeasy-dev/tap/kubeasy
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-secondary neo-border-thick neo-shadow p-8">
          <div className="flex items-start gap-6">
            <span className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground font-black flex items-center justify-center neo-border text-xl">
              2
            </span>
            <div className="flex-1">
              <h2 className="text-2xl font-black mb-3">Authenticate</h2>
              <p className="font-bold text-muted-foreground mb-4">
                Log in to your Kubeasy account to track your progress.
              </p>
              <div className="bg-black text-green-400 p-4 rounded-lg neo-border-thick font-mono">
                <span className="text-gray-500">$</span> kubeasy auth login
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-secondary neo-border-thick neo-shadow p-8">
          <div className="flex items-start gap-6">
            <span className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground font-black flex items-center justify-center neo-border text-xl">
              3
            </span>
            <div className="flex-1">
              <h2 className="text-2xl font-black mb-3">Start a Challenge</h2>
              <p className="font-bold text-muted-foreground mb-4">
                Pick a challenge and start your Kubernetes cluster.
              </p>
              <div className="bg-black text-green-400 p-4 rounded-lg neo-border-thick font-mono">
                <span className="text-gray-500">$</span> kubeasy challenge start
                pod-crash
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/challenges"
            className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 neo-border-thick neo-shadow font-black text-lg hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
          >
            Browse Challenges
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
