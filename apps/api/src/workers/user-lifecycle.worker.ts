import { QUEUE_NAMES, type UserSignupPayload } from "@kubeasy/jobs";
import { all } from "better-all";
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
      // identify and trackSignup depend on fetchProvider via this.$.fetchProvider.
      await all({
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
          try {
            return await createResendContact({ email, userId });
          } catch (err) {
            // Log and continue -- Resend failure should not block other operations
            console.error("[user-signup] Resend contact creation failed", {
              userId,
              error: String(err),
            });
            return null;
          }
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
    },
    { connection, concurrency: 5 },
  );
}
