import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createQueue, QUEUE_NAMES } from "@kubeasy/jobs";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { db } from "../db/index";
import * as schema from "../db/schema/auth";
import { allowedOrigins } from "./cors";
import { redisConfig } from "./redis";

const userSigninQueue = createQueue(QUEUE_NAMES.USER_SIGNIN, redisConfig);

export const auth = betterAuth({
  baseURL: process.env.API_URL ?? "http://localhost:3001",
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
      // Disabled on Railway: .up.railway.app is in the Public Suffix List,
      // so cross-subdomain cookies can't be shared across Railway services.
      enabled:
        process.env.NODE_ENV === "production" &&
        !process.env.RAILWAY_ENVIRONMENT_NAME,
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
