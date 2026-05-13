import { createRequire } from "node:module";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const require = createRequire(import.meta.url);

export default defineConfig(async () => {
  return {
    server: { port: 3000 },
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
    ssr: {
      external: ["@resvg/resvg-js"],
    },
    resolve: {
      alias: {
        "@": new URL("./src", import.meta.url).pathname,
        tslib: require.resolve("tslib/tslib.es6.mjs"),
      },
    },
    plugins: [
      tanstackStart({
        server: { entry: "./src/server.tsx" },
        router: { entry: "./lib/router" },
        prerender: {
          enabled: true,
          crawlLinks: true,
          autoStaticPathsDiscovery: false,
          concurrency: 4,
          failOnError: false,
        },
        pages: [
          { path: "/", prerender: { enabled: true } },
          { path: "/blog", prerender: { enabled: true } },
          { path: "/challenges", prerender: { enabled: true } },
        ],
      }),
      nitro({ preset: "node-server" }),
      viteReact(),
      tailwindcss(),
    ],
  };
});
