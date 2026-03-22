import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { Redis } from "ioredis";
import type { AppEnv } from "../middleware/session";
import { requireAuth } from "../middleware/session";

const sse = new Hono<AppEnv>();

// GET /sse/invalidate-cache -- generic cache-invalidation SSE channel
// Subscribes to Redis `invalidate-cache:{userId}` channel.
// Payload: { queryKey: string[] } -- browser calls invalidateQueries(queryKey).
sse.get("/invalidate-cache", requireAuth, async (c) => {
  const user = c.get("user");
  const channel = `invalidate-cache:${user.id}`;

  return streamSSE(c, async (stream) => {
    // Dedicated ioredis subscriber per SSE connection (never shared)
    const subscriber = new Redis(
      process.env.REDIS_URL ?? "redis://localhost:6379",
    );
    let aborted = false;

    stream.onAbort(async () => {
      aborted = true;
      try {
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
      } catch (err) {
        console.error("SSE cleanup error", { channel, error: String(err) });
      }
    });

    subscriber.on("message", async (_ch: string, message: string) => {
      await stream.writeSSE({
        data: message,
        event: "invalidate-cache",
      });
    });

    await subscriber.subscribe(channel);

    // Heartbeat loop -- keeps connection alive through proxies
    while (!aborted) {
      await stream.writeSSE({ data: "", event: "heartbeat" });
      await stream.sleep(30_000);
    }
  });
});

export { sse };
