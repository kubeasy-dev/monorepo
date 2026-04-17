import { metrics } from "@opentelemetry/api";
import { redis } from "./redis";

const meter = metrics.getMeter("kubeasy-api-cache");
const cacheCounter = meter.createCounter("cache.operations", {
  description: "Count of cache operations (hits, misses, errors)",
});

export const TTL = {
  STATIC: 3600, // 1 hour  — themes, types
  PUBLIC: 300, // 5 min   — challenge list, detail, objectives
  USER: 120, // 2 min   — xp, streak, progress, completion
} as const;

const PREFIX = "cache:";

/**
 * Build a deterministic cache key from a base name and optional params.
 * Params are sorted alphabetically to avoid key duplication from ordering.
 *
 * Examples:
 *   cacheKey("themes:list")                           → "cache:themes:list"
 *   cacheKey("themes:detail", { slug: "networking" }) → "cache:themes:detail:slug=networking"
 *   cacheKey("u:abc:challenges:list", { difficulty: "easy", theme: "networking" })
 *     → "cache:u:abc:challenges:list:difficulty=easy&theme=networking"
 */
export function cacheKey(
  base: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  let key = `${PREFIX}${base}`;
  if (params) {
    const sorted = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    if (sorted) key += `:${sorted}`;
  }
  return key;
}

/** Get a cached value. Returns null on miss or parse error. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const base = key.split(":")[1] || "unknown";
  try {
    const raw = await redis.get(key);
    if (!raw) {
      cacheCounter.add(1, { status: "miss", key_prefix: base });
      return null;
    }
    cacheCounter.add(1, { status: "hit", key_prefix: base });
    return JSON.parse(raw) as T;
  } catch (_error) {
    cacheCounter.add(1, { status: "error", key_prefix: base });
    return null;
  }
}

/** Set a cached value with a mandatory TTL in seconds. */
export async function cacheSet(
  key: string,
  data: unknown,
  ttlSeconds: number,
): Promise<void> {
  const base = key.split(":")[1] || "unknown";
  await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
  cacheCounter.add(1, { status: "set", key_prefix: base });
}

/** Delete a single cache key. */
export async function cacheDel(key: string): Promise<void> {
  const base = key.split(":")[1] || "unknown";
  await redis.del(key);
  cacheCounter.add(1, { status: "del", key_prefix: base });
}

/**
 * Delete all keys matching a glob pattern using SCAN (non-blocking).
 * Example: cacheDelPattern("cache:u:abc123:*")
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100,
    );
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== "0");
}

/**
 * Cache-or-fetch: check cache first, call fetchFn on miss, store result with TTL.
 *
 * Note: flow() from better-all cannot be used here — when $end() is called after
 * an await (async $end), the resolver for dependent tasks is never settled, causing
 * a permanent hang. Simple sequential logic is the correct approach.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const data = await fetchFn();
  await cacheSet(key, data, ttlSeconds);
  return data;
}
