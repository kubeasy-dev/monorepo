import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/lib/constants";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const base = siteConfig.url;
        const index = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          "  <sitemap>",
          `    <loc>${base}/sitemap-main.xml</loc>`,
          "  </sitemap>",
          "  <sitemap>",
          `    <loc>${base}/docs/sitemap.xml</loc>`,
          "  </sitemap>",
          "</sitemapindex>",
        ].join("\n");

        return new Response(index, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control":
              "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});
