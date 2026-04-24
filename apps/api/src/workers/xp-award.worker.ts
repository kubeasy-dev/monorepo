import { queryKeys } from "@kubeasy/api-schemas/query-keys";
import { QUEUE_NAMES, type XpAwardPayload } from "@kubeasy/jobs";
import { Worker } from "bullmq";
import { sql } from "drizzle-orm";
import { db } from "../db/index";
import { userXp, userXpTransaction } from "../db/schema/index";
import { cacheDel, cacheKey } from "../lib/cache";
import { redis, redisConfig } from "../lib/redis";

export function createXpAwardWorker() {
  const connection = { ...redisConfig, maxRetriesPerRequest: null as null };

  return new Worker<XpAwardPayload>(
    QUEUE_NAMES.XP_AWARD,
    async (job) => {
      const { userId, challengeSlug, xpAmount, action, description } = job.data;

      // 1. Atomic userXp UPSERT (add xpAmount to totalXp)
      await db
        .insert(userXp)
        .values({ userId, totalXp: xpAmount })
        .onConflictDoUpdate({
          target: userXp.userId,
          set: {
            totalXp: sql`${userXp.totalXp} + ${xpAmount}`,
            updatedAt: new Date(),
          },
        });

      // 2. Insert userXpTransaction record
      await db.insert(userXpTransaction).values({
        userId,
        action,
        xpAmount,
        challengeSlug,
        description,
      });

      // 3. Publish SSE cache-invalidation event for user's XP query
      const channel = `invalidate-cache:${userId}`;
      const payload = JSON.stringify({ queryKey: queryKeys.user.xp() });
      await redis.publish(channel, payload).catch((err) => {
        console.error("[xp-award] SSE publish failed", {
          channel,
          error: String(err),
        });
      });

      // 4. Invalidate server-side XP and streak caches
      await Promise.all([
        cacheDel(cacheKey(`u:${userId}:user:xp`)),
        cacheDel(cacheKey(`u:${userId}:user:streak`)),
      ]).catch((err) => {
        console.error("[xp-award] cache invalidation failed", err);
      });
    },
    { connection, concurrency: 5 },
  );
}
