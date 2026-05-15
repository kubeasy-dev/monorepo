import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { describeRoute } from "hono-openapi";
import { Redis } from "ioredis";
import { sessionSecurity } from "../lib/openapi-shared";
import { redisConfig } from "../lib/redis";
import { type AppEnv, requireAuth } from "../middleware/session";

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

      return streamSSE(c, async (stream) => {
        const subscriber = new Redis(redisConfig);
        let aborted = false;

        stream.onAbort(async () => {
          aborted = true;
          try {
            await subscriber.unsubscribe(channel);
            await subscriber.quit();
          } catch (err) {
            c.get("log").error("SSE cleanup error", {
              channel,
              error: String(err),
            });
          }
        });

        subscriber.on("message", async (_ch: string, message: string) => {
          try {
            const parsed = JSON.parse(message) as {
              event?: string;
              data?: unknown;
            };
            if (parsed.event) {
              await stream.writeSSE({
                event: parsed.event,
                data:
                  typeof parsed.data === "string"
                    ? parsed.data
                    : JSON.stringify(parsed.data),
              });
              return;
            }
          } catch {
            // ignore malformed messages
          }
        });

        await subscriber.subscribe(channel);

        while (!aborted) {
          await stream.writeSSE({ data: "", event: "heartbeat" });
          await stream.sleep(30_000);
        }
      });
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

      return streamSSE(c, async (stream) => {
        const subscriber = new Redis(redisConfig);
        let aborted = false;

        stream.onAbort(async () => {
          aborted = true;
          try {
            await subscriber.unsubscribe(channel);
            await subscriber.quit();
          } catch (err) {
            c.get("log").error("SSE cleanup error", {
              channel,
              error: String(err),
            });
          }
        });

        subscriber.on("message", async (_ch: string, message: string) => {
          try {
            const parsed = JSON.parse(message) as {
              event?: string;
              data?: unknown;
            };
            if (parsed.event) {
              await stream.writeSSE({
                event: parsed.event,
                data:
                  typeof parsed.data === "string"
                    ? parsed.data
                    : JSON.stringify(parsed.data),
              });
              return;
            }
          } catch {
            // fall through to legacy path
          }
          // Legacy format: publish({ queryKey: [...] }) from xp-award.worker
          await stream.writeSSE({ data: message, event: "invalidate-cache" });
        });

        await subscriber.subscribe(channel);

        while (!aborted) {
          await stream.writeSSE({ data: "", event: "heartbeat" });
          await stream.sleep(30_000);
        }
      });
    },
  );
