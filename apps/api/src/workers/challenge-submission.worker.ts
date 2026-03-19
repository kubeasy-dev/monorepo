import { type ChallengeSubmissionPayload, QUEUE_NAMES } from "@kubeasy/jobs";
import { Worker } from "bullmq";

export function createChallengeSubmissionWorker() {
  return new Worker<ChallengeSubmissionPayload>(
    QUEUE_NAMES.CHALLENGE_SUBMISSION,
    async (job) => {
      console.log(`[challenge-submission] Processing job ${job.id}`, {
        userId: job.data.userId,
        challengeSlug: job.data.challengeSlug,
      });
      // TODO: implement challenge submission processing (analytics, notifications, etc.)
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
