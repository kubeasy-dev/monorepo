import { createFsDrain } from "evlog/fs";
import evlog from "evlog/nitro/v3";
import { createOTLPDrain } from "evlog/otlp";
import { defineConfig } from "nitro/config";

const isDev = process.env.NODE_ENV !== "production";
const fsDrain = isDev ? createFsDrain() : null;
const otlpDrain = createOTLPDrain();

export default defineConfig({
  experimental: { asyncContext: true },
  modules: [
    evlog({
      env: { service: "web" },
      drain: (ctx) => {
        fsDrain?.(ctx);
        otlpDrain(ctx);
      },
    }),
  ],
});
