import { Button } from "@kubeasy/ui/button";
import { Beaker, Github, MessageSquare } from "lucide-react";
import { siteConfig } from "@/lib/constants";

export function EarlyAccessSection() {
  return (
    <section className="py-24 px-4 bg-background relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-secondary neo-border-thick rotate-12 opacity-20" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-accent neo-border-thick -rotate-12 opacity-20" />

      <div className="max-w-4xl px-4 mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-secondary neo-border-thick px-6 py-2 mb-6 neo-shadow">
            <Beaker className="w-5 h-5" />
            <span className="font-black text-sm uppercase tracking-wider">
              Early Access
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            We&apos;re just getting started
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-bold">
            Kubeasy is in active development. New challenges, features, and
            improvements are being added regularly.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Feedback Card */}
          <div className="bg-white neo-border-thick p-8 neo-shadow-xl">
            <div className="mb-4">
              <MessageSquare className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-black mb-3">Share Feedback</h3>
            <p className="text-muted-foreground font-bold mb-6">
              Found a bug? Have an idea for a challenge? Your feedback shapes
              the future of Kubeasy.
            </p>
            <Button
              variant="outline"
              className="font-bold neo-border neo-shadow"
              asChild
            >
              <a
                href={`${siteConfig.links.github}/${siteConfig.github.repo}/issues`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-4 w-4" />
                Open an Issue
              </a>
            </Button>
          </div>

          {/* Contribute Card */}
          <div className="bg-white neo-border-thick p-8 neo-shadow-xl">
            <div className="mb-4">
              <Github className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-black mb-3">Contribute</h3>
            <p className="text-muted-foreground font-bold mb-6">
              Kubeasy is open source. Help us build the best Kubernetes learning
              platform by contributing challenges or code.
            </p>
            <Button
              variant="outline"
              className="font-bold neo-border neo-shadow"
              asChild
            >
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-4 w-4" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
