import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { describeRoute, validator } from "hono-openapi";
import { Redis } from "ioredis";
import { z } from "zod";
import { sessionSecurity } from "../lib/openapi-shared";
import { redis, redisConfig } from "../lib/redis";
import { slidingWindowRateLimit } from "../middleware/rate-limit";
import { type AppEnv, requireAuth } from "../middleware/session";

const slugParam = z.object({
  slug: z
    .string()
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Invalid slug format"),
});

const ALLOWED_SSE_EVENTS = new Set(["challenge-completed", "invalidate-cache"]);

const sseRateLimit = slidingWindowRateLimit(redis, {
  windowMs: 60_000,
  max: 20,
  keyFn: (c) => {
    const user = c.get("user");
    if (!user) throw new Error("sseRateLimit used outside requireAuth");
    return `sse:${user.id}`;
  },
});

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
      } catch (err) {
        log.error("SSE cleanup error", { channel, error: String(err) });
      } finally {
        subscriber.disconnect();
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
    if (parsed.event && ALLOWED_SSE_EVENTS.has(parsed.event)) {
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
    sseRateLimit,
    validator("param", slugParam),
    async (c) => {
      const user = c.get("user");
      const { slug } = c.req.valid("param");
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
    sseRateLimit,
    async (c) => {
      const user = c.get("user");
      const channel = `invalidate-cache:${user.id}`;
      const handler = createRedisSSEHandler(channel, (message) => {
        // Try new dynamic event format first
        const dynamic = parseDynamicEvent(message);
        if (dynamic) return dynamic;
        // Legacy format: raw JSON published by older xp-award.worker
        if (message.length > 4096) return null;
        return { event: "invalidate-cache", data: message };
      });
      return streamSSE(c, (stream) => handler(stream, c.get("log")));
    },
  );
