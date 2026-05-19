import { Hono } from "hono";
import type { Redis } from "ioredis";
import { describe, expect, it } from "vitest";
import { slidingWindowRateLimit } from "../middleware/rate-limit";

describe("sessionMiddleware", () => {
  it.todo("sets user and session from valid auth cookie");
  it.todo("sets user and session to null when no cookie present");
});

describe("requireAuth", () => {
  it.todo("returns 401 when no session exists (API-06)");
  it.todo("allows request through when session exists");
});

/**
 * Minimal in-memory fake of the ioredis pipeline surface used by
 * slidingWindowRateLimit. Models ZADD / ZREMRANGEBYSCORE / ZCARD against a
 * Map<key, {score, member}[]> so the middleware's threshold logic can be
 * exercised without a real Redis.
 */
function makeFakeRedis(): Redis {
  const store = new Map<string, Array<{ score: number; member: string }>>();
  return {
    multi() {
      const ops: Array<() => unknown> = [];
      const chain = {
        zremrangebyscore(key: string, min: number, max: number) {
          ops.push(() => {
            const arr = store.get(key) ?? [];
            const kept = arr.filter((e) => e.score < min || e.score > max);
            store.set(key, kept);
            return arr.length - kept.length;
          });
          return chain;
        },
        zadd(key: string, score: number, member: string) {
          ops.push(() => {
            const arr = store.get(key) ?? [];
            arr.push({ score, member });
            store.set(key, arr);
            return 1;
          });
          return chain;
        },
        zcard(key: string) {
          ops.push(() => (store.get(key) ?? []).length);
          return chain;
        },
        expire() {
          ops.push(() => 1);
          return chain;
        },
        async exec() {
          return ops.map((op) => [null, op()]);
        },
      };
      return chain;
    },
  } as unknown as Redis;
}

function makeApp(max: number, windowMs = 10_000) {
  const redis = makeFakeRedis();
  return new Hono()
    .use(
      slidingWindowRateLimit(redis, {
        windowMs,
        max,
        keyFn: () => "test-key",
      }),
    )
    .get("/", (c) => c.text("ok"));
}

describe("slidingWindowRateLimit", () => {
  it("allows max - 1 requests through, blocks the max-th with 429 (#175)", async () => {
    const app = makeApp(3);

    const r1 = await app.request("/");
    const r2 = await app.request("/");
    const r3 = await app.request("/");

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(429);
  });

  it("returns Retry-After header and JSON error body on 429", async () => {
    const app = makeApp(2, 5_000);

    await app.request("/");
    const blocked = await app.request("/");

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBe("5");
    await expect(blocked.json()).resolves.toEqual({
      error: "Too Many Requests",
    });
  });

  it("isolates buckets per key", async () => {
    const redis = makeFakeRedis();
    let user = "alice";
    const app = new Hono()
      .use(
        slidingWindowRateLimit(redis, {
          windowMs: 10_000,
          max: 2,
          keyFn: () => user,
        }),
      )
      .get("/", (c) => c.text("ok"));

    expect((await app.request("/")).status).toBe(200);
    expect((await app.request("/")).status).toBe(429);

    user = "bob";
    expect((await app.request("/")).status).toBe(200);
    expect((await app.request("/")).status).toBe(429);
  });
});
