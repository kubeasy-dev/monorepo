import { Redis } from "ioredis";

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");

export const redisConfig = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
  lazyConnect: process.env.SKIP_ENV_CHECK === "true",
};

export const redis = new Redis(redisConfig);
