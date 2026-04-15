import { createFileRoute } from "@tanstack/react-router";
import { CTASection } from "@/components/cta-section";
import { EarlyAccessSection } from "@/components/early-access-section";
import { FeaturesSection } from "@/components/features-section";
import { HeroSection } from "@/components/hero-section";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { OpenSourceSection } from "@/components/open-source-section";
import { StatsSection } from "@/components/stats-section";
import { VideoSection } from "@/components/video-section";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <StatsSection />
      <VideoSection />
      <FeaturesSection />
      <HowItWorksSection />
      <OpenSourceSection />
      <EarlyAccessSection />
      <CTASection />
    </div>
  );
}
