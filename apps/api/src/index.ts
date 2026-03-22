import { serve } from "@hono/node-server";
import { logger } from "@kubeasy/logger";
import { app } from "./app";
import { sdk } from "./instrumentation";
import { redis } from "./lib/redis";
import { createChallengeSubmissionWorker } from "./workers/challenge-submission.worker";
import { createUserSigninWorker } from "./workers/user-lifecycle.worker";
import { createXpAwardWorker } from "./workers/xp-award.worker";

const port = Number(process.env.PORT ?? 3001);

// Capture server reference for graceful shutdown
const server = serve({ fetch: app.fetch, port }, (info) => {
  logger.info(`Kubeasy API running on http://localhost:${info.port}`);
});

// Instantiate BullMQ workers
const workers = [
  createUserSigninWorker(),
  createChallengeSubmissionWorker(),
  createXpAwardWorker(),
];

logger.info(`Started ${workers.length} BullMQ workers`);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down...`);
  server.close(); // 1. Stop accepting new HTTP/SSE connections
  await Promise.all(workers.map((w) => w.close())); // 2. Drain in-flight BullMQ jobs
  await redis.quit(); // 3. Close shared Redis connection
  await sdk.shutdown(); // 4. Flush remaining spans/logs
  logger.info("Shutdown complete");
  process.exit(0); // 5. Exit
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
