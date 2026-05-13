import { createFileRoute } from "@tanstack/react-router";
import { CTASection } from "@/components/cta-section";
import { EarlyAccessSection } from "@/components/early-access-section";
import { FeaturesSection } from "@/components/features-section";
import { HeroSection } from "@/components/hero-section";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { OpenSourceSection } from "@/components/open-source-section";
import { StatsSection } from "@/components/stats-section";
import { VideoSection } from "@/components/video-section";
import { siteConfig } from "@/lib/constants";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kubeasy",
  url: "https://kubeasy.dev",
  logo: "https://kubeasy.dev/logo.png",
  description:
    "Interactive Kubernetes learning platform based on hands-on challenges that run on a local cluster.",
  sameAs: ["https://github.com/kubeasy-dev", "https://twitter.com/kubeasy_dev"],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Kubeasy",
  url: "https://kubeasy.dev",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://kubeasy.dev/challenges?search={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

export const Route = createFileRoute("/")({
  headers: () => ({
    Link: [
      `<${siteConfig.url}/docs>; rel="service-doc"`,
      `<${siteConfig.url}/api/openapi/openapi.json>; rel="service-desc"; type="application/json"`,
      `<${siteConfig.url}/>; rel="canonical"`,
      `<${siteConfig.url}/>; rel="alternate"; type="text/markdown"`,
    ].join(", "),
  }),
  head: () => ({
    meta: [
      {
        title:
          "Kubeasy — Learn Kubernetes with Hands-On Challenges on Your Local Cluster",
      },
      {
        name: "description",
        content:
          "Practice Kubernetes through real-world challenges on your own Kind cluster. Debug crashes, fix RBAC, migrate APIs — no playground, no toy examples. Free and open source.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:title",
        content: "Kubeasy — Learn Kubernetes with Hands-On Challenges",
      },
      {
        property: "og:description",
        content:
          "Practice Kubernetes through real-world challenges on your own local cluster. Free and open source.",
      },
      { property: "og:url", content: `${siteConfig.url}/` },
      {
        property: "og:image",
        content: `${siteConfig.url}/og/home.png`,
      },
      { property: "og:site_name", content: "Kubeasy" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@kubeasy_dev" },
    ],
    links: [{ rel: "canonical", href: `${siteConfig.url}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(organizationJsonLd),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(websiteJsonLd),
      },
    ],
  }),
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
