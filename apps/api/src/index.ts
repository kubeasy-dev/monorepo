import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { redis } from "./lib/redis.js";
import { createChallengeSubmissionWorker } from "./workers/challenge-submission.worker.js";
import { createUserLifecycleWorker } from "./workers/user-lifecycle.worker.js";
import { createXpAwardWorker } from "./workers/xp-award.worker.js";

const port = Number(process.env.PORT ?? 3001);

// Capture server reference for graceful shutdown
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Kubeasy API running on http://localhost:${info.port}`);
});

// Instantiate BullMQ workers
const workers = [
  createUserLifecycleWorker(),
  createChallengeSubmissionWorker(),
  createXpAwardWorker(),
];

console.log(`Started ${workers.length} BullMQ workers`);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);
  server.close(); // 1. Stop accepting new HTTP/SSE connections
  await Promise.all(workers.map((w) => w.close())); // 2. Drain in-flight BullMQ jobs
  await redis.quit(); // 3. Close shared Redis connection
  console.log("Shutdown complete");
  process.exit(0); // 4. Exit
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
