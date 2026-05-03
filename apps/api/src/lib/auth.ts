import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createQueue, QUEUE_NAMES } from "@kubeasy/jobs";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { log } from "evlog";
import { db } from "../db/index";
import * as schema from "../db/schema/auth";
import { allowedOrigins } from "./cors";
import { env } from "./env";
import { redis, redisConfig } from "./redis";

const userSignupQueue = createQueue(QUEUE_NAMES.USER_SIGNUP, redisConfig);

export const auth = betterAuth({
  baseURL: `${env.API_URL}/api/auth`,
  trustedOrigins: allowedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secondaryStorage: {
    get: async (key) => {
      return await redis.get(key);
    },
    set: async (key, value, ttl) => {
      if (ttl) {
        await redis.set(key, value, "EX", ttl);
      } else {
        await redis.set(key, value);
      }
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },
  plugins: [
    admin(),
    apiKey({
      rateLimit: {
        enabled: false,
      },
      enableSessionForAPIKeys: true,
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
  session: {
    cookieCache: {
      enabled: false,
    },
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      redirectURI: `${env.API_URL}/api/auth/callback/github`,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectURI: `${env.API_URL}/api/auth/callback/google`,
    },
    microsoft: {
      clientId: env.MICROSOFT_CLIENT_ID,
      clientSecret: env.MICROSOFT_CLIENT_SECRET,
      redirectURI: `${env.API_URL}/api/auth/callback/microsoft`,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            userSignupQueue.add("user-signup", {
              userId: user.id,
              email: user.email,
            });
          } catch (error) {
            // Never throw — auth must complete regardless of job dispatch failure
            log.error({
              message: "user-signup job dispatch failed",
              error: String(error),
            });
          }
        },
      },
    },
  },
});
