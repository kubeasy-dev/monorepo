import { queryKeys } from "@kubeasy/api-schemas/query-keys";
import { all } from "better-all";
import { and, count, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { db } from "../db/index";
import { apikey } from "../db/schema/auth";
import { userProgress } from "../db/schema/challenge";
import { userOnboarding } from "../db/schema/onboarding";
import { sessionSecurity } from "../lib/openapi-shared";
import { redis } from "../lib/redis";
import { type AppEnv, requireAuth } from "../middleware/session";

const OnboardingStatusSchema = z.object({
  steps: z.object({
    hasApiToken: z.boolean(),
    cliAuthenticated: z.boolean(),
    clusterInitialized: z.boolean(),
    hasStartedChallenge: z.boolean(),
    hasCompletedChallenge: z.boolean(),
  }),
  currentStep: z.number(),
  isComplete: z.boolean(),
  isSkipped: z.boolean(),
});

const SuccessSchema = z.object({ success: z.boolean() });

export const onboarding = new Hono<AppEnv>()
  .get(
    "/",
    describeRoute({
      tags: ["Onboarding"],
      summary: "Get onboarding status",
      security: sessionSecurity,
      responses: {
        200: {
          description: "Onboarding status",
          content: {
            "application/json": { schema: resolver(OnboardingStatusSchema) },
          },
        },
      },
    }),
    requireAuth,
    async (c) => {
      const user = c.get("user");
      const userId = user.id;

      const {
        onboardingResult,
        hasApiToken,
        hasStartedChallenge,
        hasCompletedChallenge,
      } = await all({
        async onboardingResult() {
          const [row] = await db
            .select()
            .from(userOnboarding)
            .where(eq(userOnboarding.userId, userId));
          return row ?? null;
        },
        async hasApiToken() {
          const [tokenResult] = await db
            .select({ count: count() })
            .from(apikey)
            .where(eq(apikey.referenceId, userId));
          return (tokenResult?.count ?? 0) > 0;
        },
        async hasStartedChallenge() {
          const [startedResult] = await db
            .select({ count: count() })
            .from(userProgress)
            .where(
              and(
                eq(userProgress.userId, userId),
                inArray(userProgress.status, ["in_progress", "completed"]),
              ),
            );
          return (startedResult?.count ?? 0) > 0;
        },
        async hasCompletedChallenge() {
          const [completedResult] = await db
            .select({ count: count() })
            .from(userProgress)
            .where(
              and(
                eq(userProgress.userId, userId),
                eq(userProgress.status, "completed"),
              ),
            );
          return (completedResult?.count ?? 0) > 0;
        },
      });

      let currentStep = 1;
      if (onboardingResult) currentStep = 2;
      if (hasApiToken) currentStep = 3;
      if (onboardingResult?.cliAuthenticated) currentStep = 4;
      if (onboardingResult?.clusterInitialized) currentStep = 5;
      if (hasStartedChallenge) currentStep = 6;
      if (hasCompletedChallenge) currentStep = 7;

      return c.json({
        steps: {
          hasApiToken,
          cliAuthenticated: onboardingResult?.cliAuthenticated ?? false,
          clusterInitialized: onboardingResult?.clusterInitialized ?? false,
          hasStartedChallenge,
          hasCompletedChallenge,
        },
        currentStep,
        isComplete: !!onboardingResult?.completedAt,
        isSkipped: !!onboardingResult?.skippedAt,
      });
    },
  )
  .post(
    "/start",
    describeRoute({
      tags: ["Onboarding"],
      summary: "Create onboarding row (upsert)",
      security: sessionSecurity,
      responses: {
        200: {
          description: "Started",
          content: { "application/json": { schema: resolver(SuccessSchema) } },
        },
      },
    }),
    requireAuth,
    async (c) => {
      const user = c.get("user");
      await db
        .insert(userOnboarding)
        .values({ userId: user.id })
        .onConflictDoNothing({ target: userOnboarding.userId });
      return c.json({ success: true });
    },
  )
  .post(
    "/complete",
    describeRoute({
      tags: ["Onboarding"],
      summary: "Mark onboarding completed",
      security: sessionSecurity,
      responses: {
        200: {
          description: "Completed",
          content: { "application/json": { schema: resolver(SuccessSchema) } },
        },
      },
    }),
    requireAuth,
    async (c) => {
      const user = c.get("user");
      const userId = user.id;

      await db
        .insert(userOnboarding)
        .values({ userId, completedAt: new Date() })
        .onConflictDoUpdate({
          target: userOnboarding.userId,
          set: { completedAt: new Date(), updatedAt: new Date() },
        });

      const channel = `invalidate-cache:${userId}`;
      const payload = JSON.stringify({ queryKey: queryKeys.onboarding() });
      redis.publish(channel, payload).catch((err) => {
        c.get("log").error("SSE publish failed", {
          channel,
          error: String(err),
        });
      });

      return c.json({ success: true });
    },
  )
  .post(
    "/skip",
    describeRoute({
      tags: ["Onboarding"],
      summary: "Mark onboarding skipped",
      security: sessionSecurity,
      responses: {
        200: {
          description: "Skipped",
          content: { "application/json": { schema: resolver(SuccessSchema) } },
        },
      },
    }),
    requireAuth,
    async (c) => {
      const user = c.get("user");
      const userId = user.id;

      await db
        .insert(userOnboarding)
        .values({ userId, skippedAt: new Date() })
        .onConflictDoUpdate({
          target: userOnboarding.userId,
          set: { skippedAt: new Date(), updatedAt: new Date() },
        });

      const channel = `invalidate-cache:${userId}`;
      const payload = JSON.stringify({ queryKey: queryKeys.onboarding() });
      redis.publish(channel, payload).catch((err) => {
        c.get("log").error("SSE publish failed", {
          channel,
          error: String(err),
        });
      });

      return c.json({ success: true });
    },
  );
