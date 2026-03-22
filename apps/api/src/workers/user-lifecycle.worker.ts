import { QUEUE_NAMES, type UserSigninPayload } from "@kubeasy/jobs";
import { all } from "better-all";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { user } from "../db/schema/auth";
import {
  identifyUserServer,
  trackUserSignupServer,
} from "../lib/analytics-server";
import { createResendContact } from "../lib/resend";

export function createUserSigninWorker() {
  const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  const connection = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    maxRetriesPerRequest: null as null,
  };

  return new Worker<UserSigninPayload>(
    QUEUE_NAMES.USER_SIGNIN,
    async (job) => {
      const { userId, email, provider } = job.data;

      // Run all 3 operations in parallel with better-all
      const { resendResult } = await all({
        async identify() {
          await identifyUserServer(userId, { email });
        },
        async resendResult() {
          try {
            return await createResendContact({ email, userId });
          } catch (err) {
            // Log and continue -- Resend failure should not block other operations
            console.error("[user-signin] Resend contact creation failed", {
              userId,
              error: String(err),
            });
            return null;
          }
        },
        async trackSignup() {
          await trackUserSignupServer(
            userId,
            provider as "github" | "google" | "microsoft",
            email,
          );
        },
      });

      // Store Resend contactId on user record if available
      if (resendResult?.contactId) {
        await db
          .update(user)
          .set({ resendContactId: resendResult.contactId })
          .where(eq(user.id, userId));
      }
    },
    { connection, concurrency: 5 },
  );
}
