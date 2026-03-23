import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createQueue, QUEUE_NAMES } from "@kubeasy/jobs";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { db } from "../db/index";
import * as schema from "../db/schema/auth";
import { allowedOrigins } from "./cors";
import { env } from "./env";
import { redisConfig } from "./redis";

const userSigninQueue = createQueue(QUEUE_NAMES.USER_SIGNIN, redisConfig);

export const auth = betterAuth({
  baseURL: env.API_URL,
  trustedOrigins: allowedOrigins,
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
      // Only enable when API runs on kubeasy.dev (prod + v2 subdomain).
      // Disabled on Railway .up.railway.app URLs (Public Suffix List).
      enabled:
        env.NODE_ENV === "production" && env.API_URL.includes("kubeasy.dev"),
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
            userSigninQueue.add("user-signin", {
              userId: user.id,
              email: user.email,
              provider: "unknown",
            });
          } catch (error) {
            // Never throw — auth must complete regardless of job dispatch failure
            console.error("[auth] user-signin job dispatch failed", error);
          }
        },
      },
    },
  },
});
