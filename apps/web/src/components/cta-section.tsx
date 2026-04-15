import { Button } from "@kubeasy/ui/button";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "@/lib/constants";

export function CTASection() {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-xl bg-primary p-12 text-center neo-border-thick neo-shadow-xl">
          <div className="relative space-y-6">
            <h2 className="text-4xl md:text-5xl font-black text-balance text-white">
              Ready to master Kubernetes?
            </h2>
            <p className="text-xl font-bold text-white/90 max-w-2xl mx-auto">
              Start learning Kubernetes through hands-on challenges on your
              local machine.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="text-base font-bold bg-white text-primary hover:bg-white/90 neo-border-thick neo-shadow-lg"
                asChild
              >
                <a href="/docs/user/getting-started">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base font-bold bg-secondary text-foreground hover:bg-secondary/90 neo-border-thick neo-shadow-lg border-foreground"
                asChild
              >
                <a
                  href={siteConfig.links.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Documentation
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
