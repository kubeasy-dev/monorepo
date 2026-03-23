import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

async function getChallengePages(): Promise<
  { path: string; prerender: { enabled: boolean } }[]
> {
  // Challenge pages require the API — only prerender on Railway where the API is already deployed.
  // In local builds the API isn't running, causing the loader to hang indefinitely.
  const isRailway =
    !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_PROJECT_ID;
  const apiUrl = process.env.VITE_API_URL;

  if (!isRailway || !apiUrl) {
    console.log(
      "[prerender] Not on Railway — skipping challenge prerender (API unavailable locally)",
    );
    return [];
  }

  try {
    const res = await fetch(`${apiUrl}/api/challenges`);
    if (!res.ok) return [];
    const data = (await res.json()) as { challenges: { slug: string }[] };
    console.log(
      `[prerender] Discovered ${data.challenges.length} challenge routes from API`,
    );
    return [
      { path: "/challenges", prerender: { enabled: true } },
      ...data.challenges.map((c) => ({
        path: `/challenges/${c.slug}`,
        prerender: { enabled: true },
      })),
    ];
  } catch {
    console.warn(
      "[prerender] Could not fetch challenges — skipping challenge prerender",
    );
    return [];
  }
}

export default defineConfig(async () => {
  const challengePages = await getChallengePages();

  return {
    server: { port: 3000 },
    resolve: {
      alias: { "@": new URL("./src", import.meta.url).pathname },
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
          ...challengePages,
        ],
      }),
      nitro({ preset: "node-server" }),
      viteReact(),
      tailwindcss(),
    ],
  };
});
