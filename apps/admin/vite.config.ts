import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import evlog from "evlog/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/admin/",
  server: { port: 3002 },
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
  plugins: [
    evlog({
      service: "admin",
      autoImports: true,
      sourceLocation: true,
    }),
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
  ],
});
