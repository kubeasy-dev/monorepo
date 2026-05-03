import "./instrumentation.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { initLogger, log } from "evlog";
import { createFsDrain } from "evlog/fs";
import { createOTLPDrain } from "evlog/otlp";

const isDev = process.env.NODE_ENV !== "production";
const fsDrain = isDev ? createFsDrain() : null;
const otlpDrain = createOTLPDrain();

initLogger({
  env: { service: "api" },
  drain: (ctx) => {
    fsDrain?.(ctx);
    otlpDrain(ctx);
  },
});

import { app } from "./app";
import { db } from "./db";
import { redis } from "./lib/redis";
import { createChallengeSubmissionWorker } from "./workers/challenge-submission.worker";
import { createUserSignupWorker } from "./workers/user-lifecycle.worker";
import { createXpAwardWorker } from "./workers/xp-award.worker";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
await migrate(db, { migrationsFolder: path.join(__dirname, "../drizzle") });
log.info({ message: "Database migrations applied" });

const port = Number(process.env.PORT ?? 3001);

// Capture server reference for graceful shutdown
const server = serve(
  { fetch: app.fetch, port, hostname: "0.0.0.0" },
  (info) => {
    log.info({
      message: `Kubeasy API running on http://${info.address}:${info.port}`,
    });
  },
);

// Instantiate BullMQ workers
const workers = [
  createUserSignupWorker(),
  createChallengeSubmissionWorker(),
  createXpAwardWorker(),
];

log.info({ message: `Started ${workers.length} BullMQ workers` });

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  log.info({ message: `Received ${signal}, shutting down...` });
  server.close(); // 1. Stop accepting new HTTP/SSE connections
  await Promise.all(workers.map((w) => w.close())); // 2. Drain in-flight BullMQ jobs
  await redis.quit(); // 3. Close shared Redis connection
  const { sdk } = await import("./instrumentation"); // cached module, no re-init
  await sdk.shutdown(); // 4. Flush remaining spans/logs
  log.info({ message: "Shutdown complete" });
  process.exit(0); // 5. Exit
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
