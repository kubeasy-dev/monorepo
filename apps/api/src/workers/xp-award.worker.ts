import { QUEUE_NAMES, type XpAwardPayload } from "@kubeasy/jobs";
import { Worker } from "bullmq";

export function createXpAwardWorker() {
  return new Worker<XpAwardPayload>(
    QUEUE_NAMES.XP_AWARD,
    async (job) => {
      console.log(`[xp-award] Processing job ${job.id}`, {
        userId: job.data.userId,
        xpAmount: job.data.xpAmount,
        action: job.data.action,
      });
      // TODO: implement XP award processing
    },
    {
      connection: {
        host: new URL(process.env.REDIS_URL ?? "redis://localhost:6379")
          .hostname,
        port: Number(
          new URL(process.env.REDIS_URL ?? "redis://localhost:6379").port ||
            6379,
        ),
        maxRetriesPerRequest: null,
      },
      concurrency: 5,
    },
  );
}
