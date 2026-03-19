import { QUEUE_NAMES, type UserSignupPayload } from "@kubeasy/jobs";
import { Worker } from "bullmq";

export function createUserLifecycleWorker() {
  return new Worker<UserSignupPayload>(
    QUEUE_NAMES.USER_LIFECYCLE,
    async (job) => {
      console.log(`[user-lifecycle] Processing job ${job.id}`, {
        userId: job.data.userId,
        email: job.data.email,
      });
      // TODO: implement user lifecycle processing (welcome email, etc.)
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
