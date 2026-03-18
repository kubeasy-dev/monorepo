import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { createQueue, QUEUE_NAMES } from "@kubeasy/jobs";
import { db } from "../db/index.js";
import * as schema from "../db/schema/auth.js";
import { redis } from "./redis.js";

// Module-level singleton — never instantiate inside a hook callback.
// Pass redis.options directly (ioredis RedisOptions = BullMQ ConnectionOptions).
// This is guaranteed correct regardless of REDIS_URL format — ioredis already
// parses the URL into host/port/password/db fields in redis.options.
const userLifecycleQueue = createQueue(QUEUE_NAMES.USER_LIFECYCLE, redis.options);

export const auth = betterAuth({
  baseURL: process.env.API_URL ?? "http://localhost:3001",
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://kubeasy.dev",
    "https://api.kubeasy.dev",
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins: [
    admin(),
    apiKey({
      rateLimit: {
        enabled: false,
      },
    }),
  ],
  user: {
    additionalFields: {
      resendContactId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: ".kubeasy.dev",
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      redirectURI: `${process.env.API_URL ?? "http://localhost:3001"}/api/auth/callback/github`,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURI: `${process.env.API_URL ?? "http://localhost:3001"}/api/auth/callback/google`,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      redirectURI: `${process.env.API_URL ?? "http://localhost:3001"}/api/auth/callback/microsoft`,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            // Fire-and-forget: do NOT await the result
            userLifecycleQueue.add("user-signup", {
              userId: user.id,
              email: user.email,
            });
          } catch (error) {
            // Never throw — auth must complete regardless of job dispatch failure
            console.error("[auth] user-lifecycle job dispatch failed", error);
          }
        },
      },
    },
  },
});
