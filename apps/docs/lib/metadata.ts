import type { Metadata } from "next/types";
import type { Page } from "./source";

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: "https://kubeasy.dev/docs",
      images: "/banner.png",
      siteName: "Kubeasy Documentation",
      ...override.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      creator: "@paulbrissaud",
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      images: "/banner.png",
      ...override.twitter,
    },
    alternates: {
      ...override.alternates,
    },
  };
}

export function getPageImage(page: Page) {
  const segments = [...page.slugs, "image.webp"];

  return {
    segments,
    url: `/og/${segments.join("/")}`,
  };
}

export const baseUrl =
  process.env.NODE_ENV === "development"
    ? new URL("http://localhost:3024/docs")
    : new URL(`https://kubeasy.dev/docs`);
