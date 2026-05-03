import { createFsDrain } from "evlog/fs";
import { createEvlog } from "evlog/next";
import { createOTLPDrain } from "evlog/otlp";

const isDev = process.env.NODE_ENV !== "production";
const fsDrain = isDev ? createFsDrain() : null;
const otlpDrain = createOTLPDrain();

export const { withEvlog, useLogger, log, createError } = createEvlog({
  service: "docs",
  drain: (ctx) => {
    fsDrain?.(ctx);
    otlpDrain(ctx);
  },
});
