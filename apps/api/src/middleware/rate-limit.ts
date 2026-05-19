import type { MiddlewareHandler } from "hono";
import type { Redis } from "ioredis";

interface RateLimitOptions {
  /** Sliding window duration in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  max: number;
  /** Function to derive the rate limit key from the request context */
  keyFn: (c: Parameters<MiddlewareHandler>[0]) => string;
}

/**
 * Sliding window rate limiter using Redis sorted sets.
 *
 * Algorithm:
 * 1. Remove entries older than the window
 * 2. Add current request with timestamp as score
 * 3. Count entries in the window
 * 4. Set TTL on the key for auto-cleanup
 *
 * If count >= max, return 429 Too Many Requests.
 */
export function slidingWindowRateLimit(
  redis: Redis,
  options: RateLimitOptions,
): MiddlewareHandler {
  return async (c, next) => {
    const now = Date.now();
    const windowStart = now - options.windowMs;
    const key = `rate_limit:${options.keyFn(c)}`;

    const pipeline = redis.multi();
    pipeline.zremrangebyscore(key, 0, windowStart); // Remove old entries
    pipeline.zadd(key, now, `${now}-${Math.random()}`); // Add current request
    pipeline.zcard(key); // Count requests in window
    pipeline.expire(key, Math.ceil(options.windowMs / 1000)); // TTL cleanup

    const results = await pipeline.exec();

    // results[2] is the ZCARD result: [error, count]
    const requestCount = (results?.[2]?.[1] as number) ?? 0;

    if (requestCount >= options.max) {
      c.header("Retry-After", String(Math.ceil(options.windowMs / 1000)));
      return c.json({ error: "Too Many Requests" }, 429);
    }

    await next();
  };
}
