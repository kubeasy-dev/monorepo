import { queryKeys } from "@kubeasy/api-schemas/query-keys";
import { QUEUE_NAMES, type XpAwardPayload } from "@kubeasy/jobs";
import { Worker } from "bullmq";
import { sql } from "drizzle-orm";
import { createRequestLogger } from "evlog";
import { db } from "../db/index";
import { userXp, userXpTransaction } from "../db/schema/index";
import { cacheDel, cacheKey } from "../lib/cache";
import { redis, redisConfig } from "../lib/redis";

export function createXpAwardWorker() {
  const connection = { ...redisConfig, maxRetriesPerRequest: null as null };

  return new Worker<XpAwardPayload>(
    QUEUE_NAMES.XP_AWARD,
    async (job) => {
      const log = createRequestLogger();
      log.set({ jobId: job.id, worker: "xp-award" });
      const { userId, challengeSlug, xpAmount, action, description } = job.data;

      // 1. Write the XP transaction record first — acts as the idempotency key.
      //    ON CONFLICT DO NOTHING means retried jobs skip the XP update safely.
      // 2. Atomically increment userXp total, but only if the transaction was new.
      await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(userXpTransaction)
          .values({ userId, action, xpAmount, challengeSlug, description })
          .onConflictDoNothing()
          .returning({ id: userXpTransaction.id });

        if (!inserted) return;

        await tx
          .insert(userXp)
          .values({ userId, totalXp: xpAmount })
          .onConflictDoUpdate({
            target: userXp.userId,
            set: {
              totalXp: sql`${userXp.totalXp} + ${xpAmount}`,
              updatedAt: new Date(),
            },
          });
      });

      // 3. Publish SSE cache-invalidation event for user's XP query
      const channel = `invalidate-cache:${userId}`;
      const payload = JSON.stringify({ queryKey: queryKeys.user.xp() });
      await redis.publish(channel, payload).catch((err) => {
        log.error("SSE publish failed", { channel, error: String(err) });
      });

      // 4. Invalidate server-side XP and streak caches
      await Promise.all([
        cacheDel(cacheKey(`u:${userId}:user:xp`)),
        cacheDel(cacheKey(`u:${userId}:user:streak`)),
      ]).catch((err) => {
        log.error("Cache invalidation failed", { error: String(err) });
      });

      log.set({ userId, challengeSlug, xpAmount, action });
      log.emit();
    },
    { connection, concurrency: 5 },
  );
}
