import { queryKeys } from "@kubeasy/api-schemas/query-keys";
import { QUEUE_NAMES, type XpAwardPayload } from "@kubeasy/jobs";
import { Worker } from "bullmq";
import { sql } from "drizzle-orm";
import { db } from "../db/index";
import { userXp, userXpTransaction } from "../db/schema/index";
import { redis } from "../lib/redis";

export function createXpAwardWorker() {
  const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  const connection = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    maxRetriesPerRequest: null as null,
  };

  return new Worker<XpAwardPayload>(
    QUEUE_NAMES.XP_AWARD,
    async (job) => {
      const { userId, challengeId, xpAmount, action, description } = job.data;

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
        challengeId,
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
    },
    { connection, concurrency: 5 },
  );
}
