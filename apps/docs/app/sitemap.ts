import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/metadata";
import { source } from "@/lib/source";

export const revalidate = false;

export default function sitemap(): MetadataRoute.Sitemap {
  // Use string concatenation so absolute paths like "/user/cli-reference" don't
  // override the "/docs" segment of baseUrl (new URL(absPath, base) strips base path).
  const base = baseUrl.href.replace(/\/$/, "");
  const url = (path: string): string => `${base}${path}`;
  const items = source
    .getPages()
    .filter((page) => page.data.type !== "openapi")
    .map((page) => ({
      url: url(page.url),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));

  return [
    {
      url: url("/"),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: url("/showcase"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...items,
  ];
}
