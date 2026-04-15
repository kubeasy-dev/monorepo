import { type InferPageType, loader, multiple } from "fumadocs-core/source";
import { openapiPlugin, openapiSource } from "fumadocs-openapi/server";
import { icons } from "lucide-react";
import { createElement } from "react";
import { docs } from "@/.source/server";
import { openapi } from "./openapi";

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader(
  multiple({
    docs: docs.toFumadocsSource(),
    openapi: await openapiSource(openapi, {
      baseDir: "openapi/(generated)",
      meta: {
        folderStyle: "separator",
      },
      groupBy: "tag",
    }),
  }),
  {
    baseUrl: "/",
    icon(icon) {
      if (!icon) return;
      // Convert kebab-case to PascalCase for lucide-react icons
      const iconName = icon
        .split("-")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("");

      if (iconName in icons) {
        return createElement(icons[iconName as keyof typeof icons]);
      }
    },
    plugins: [openapiPlugin()],
  },
);

export type Page = InferPageType<typeof source>;

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, "image.png"];

  return {
    segments,
    url: `/docs/og/${segments.join("/")}`,
  };
}
