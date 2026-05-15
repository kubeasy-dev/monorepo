import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { describeRoute } from "hono-openapi";
import { Redis } from "ioredis";
import { sessionSecurity } from "../lib/openapi-shared";
import { redisConfig } from "../lib/redis";
import { type AppEnv, requireAuth } from "../middleware/session";

type SSEStream = Parameters<Parameters<typeof streamSSE>[1]>[0];

/**
 * Subscribe to a Redis channel and forward messages as SSE events.
 * onMessage transforms a raw Redis message into an SSE event object (or null to skip).
 */
function createRedisSSEHandler(
  channel: string,
  onMessage: (
    message: string,
  ) =>
    | { event: string; data: string }
    | null
    | Promise<{ event: string; data: string } | null>,
) {
  return async (
    stream: SSEStream,
    log: { error: (msg: string, ctx: Record<string, unknown>) => void },
  ) => {
    const subscriber = new Redis(redisConfig);
    let aborted = false;

    stream.onAbort(async () => {
      aborted = true;
      try {
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
      } catch (err) {
        log.error("SSE cleanup error", { channel, error: String(err) });
      }
    });

    subscriber.on("message", async (_ch: string, message: string) => {
      const sseEvent = await onMessage(message);
      if (sseEvent) {
        await stream.writeSSE(sseEvent);
      }
    });

    await subscriber.subscribe(channel);

    while (!aborted) {
      await stream.writeSSE({ data: "", event: "heartbeat" });
      await stream.sleep(30_000);
    }
  };
}

function parseDynamicEvent(
  message: string,
): { event: string; data: string } | null {
  try {
    const parsed = JSON.parse(message) as { event?: string; data?: unknown };
    if (parsed.event) {
      return {
        event: parsed.event,
        data:
          typeof parsed.data === "string"
            ? parsed.data
            : JSON.stringify(parsed.data),
      };
    }
  } catch {
    // fall through
  }
  return null;
}

export const sse = new Hono<AppEnv>()
  .get(
    "/challenge/:slug",
    describeRoute({
      tags: ["SSE"],
      summary: "Per-challenge SSE channel (challenge-completed events)",
      security: sessionSecurity,
      responses: {
        200: {
          description: "SSE stream",
          content: { "text/event-stream": { schema: { type: "string" } } },
        },
      },
    }),
    requireAuth,
    async (c) => {
      const user = c.get("user");
      const slug = c.req.param("slug");
      const channel = `challenge:${user.id}:${slug}`;
      const handler = createRedisSSEHandler(channel, parseDynamicEvent);
      return streamSSE(c, (stream) => handler(stream, c.get("log")));
    },
  )
  .get(
    "/invalidate-cache",
    describeRoute({
      tags: ["SSE"],
      summary: "Generic cache-invalidation SSE channel",
      security: sessionSecurity,
      responses: {
        200: {
          description: "SSE stream",
          content: { "text/event-stream": { schema: { type: "string" } } },
        },
      },
    }),
    requireAuth,
    async (c) => {
      const user = c.get("user");
      const channel = `invalidate-cache:${user.id}`;
      const handler = createRedisSSEHandler(channel, (message) => {
        // Try new dynamic event format first
        const dynamic = parseDynamicEvent(message);
        if (dynamic) return dynamic;
        // Legacy format: raw JSON published by older xp-award.worker
        return { event: "invalidate-cache", data: message };
      });
      return streamSSE(c, (stream) => handler(stream, c.get("log")));
    },
  );
