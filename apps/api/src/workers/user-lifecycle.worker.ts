import { QUEUE_NAMES, type UserSignupPayload } from "@kubeasy/jobs";
import { logger } from "@kubeasy/logger";
import { allSettled } from "better-all";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { account, user } from "../db/schema/auth";
import { setUserProperties, trackUserSignup } from "../lib/analytics-server";
import { redisConfig } from "../lib/redis";
import { createResendContact } from "../lib/resend";

export function createUserSignupWorker() {
  const connection = { ...redisConfig, maxRetriesPerRequest: null as null };

  return new Worker<UserSignupPayload>(
    QUEUE_NAMES.USER_SIGNUP,
    async (job) => {
      const { userId, email } = job.data;

      // fetchProvider and resendResult start immediately in parallel.
      // identify, trackSignup and updateResendContact declare their deps via this.$.
      // allSettled: individual failures are logged without failing the whole job
      // (avoids BullMQ retries that could produce duplicate Resend contacts).
      const results = await allSettled({
        async fetchProvider() {
          const [userAccount] = await db
            .select({ providerId: account.providerId })
            .from(account)
            .where(eq(account.userId, userId))
            .limit(1);
          return (userAccount?.providerId ?? "unknown") as
            | "github"
            | "google"
            | "microsoft";
        },
        async resendResult() {
          return createResendContact({ email, userId });
        },
        async identify() {
          const provider = await this.$.fetchProvider;
          await setUserProperties(userId, { email, provider });
        },
        async trackSignup() {
          const provider = await this.$.fetchProvider;
          await trackUserSignup(userId, provider, email);
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
          logger.error(`[user-signup] task "${task}" failed`, {
            userId,
            error: String(result.reason),
          });
        }
      }
    },
    { connection, concurrency: 5 },
  );
}
