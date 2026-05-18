import { QUEUE_NAMES, type UserSignupPayload } from "@kubeasy/jobs";
import { allSettled } from "better-all";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { createRequestLogger } from "evlog";
import { db } from "../db/index";
import { user } from "../db/schema/auth";
import { redisConfig } from "../lib/redis";
import { createResendContact } from "../lib/resend";

export function createUserSignupWorker() {
  const connection = { ...redisConfig, maxRetriesPerRequest: null as null };

  return new Worker<UserSignupPayload>(
    QUEUE_NAMES.USER_SIGNUP,
    async (job) => {
      const { userId, email } = job.data;
      const log = createRequestLogger();
      log.set({ jobId: job.id, worker: "user-signup" });

      // allSettled: individual failures are logged without failing the whole job
      // (avoids BullMQ retries that could produce duplicate Resend contacts).
      const results = await allSettled({
        async resendResult() {
          return createResendContact({ email, userId });
        },
        async updateResendContact() {
          const resendResult = await this.$.resendResult;
          if (resendResult?.contactId) {
            await db
              .update(user)
              .set({ resendContactId: resendResult.contactId })
              .where(eq(user.id, userId));
          }
        },
      });

      for (const [task, result] of Object.entries(results)) {
        if (result.status === "rejected") {
          log.set({
            userId,
            task,
            error: String(result.reason),
          });
          log.error(`task "${task}" failed`);
        }
      }

      log.emit();
    },
    { connection, concurrency: 5 },
  );
}
