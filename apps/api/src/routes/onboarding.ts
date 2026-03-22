import { queryKeys } from "@kubeasy/api-schemas/query-keys";
import { all } from "better-all";
import { and, count, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/index";
import { apikey } from "../db/schema/auth";
import { userProgress } from "../db/schema/challenge";
import { userOnboarding } from "../db/schema/onboarding";
import {
  trackOnboardingCompletedServer,
  trackOnboardingSkippedServer,
} from "../lib/analytics-server";
import { redis } from "../lib/redis";
import { requireAuth } from "../middleware/session";

const onboarding = new Hono();

// GET /onboarding -- get current onboarding status
onboarding.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const userId = user.id;

  // Run 4 independent DB queries in parallel
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

  // Calculate current step (1-7)
  let currentStep = 1; // Welcome
  if (onboardingResult) currentStep = 2; // CLI Install
  if (hasApiToken) currentStep = 3; // Token created
  if (onboardingResult?.cliAuthenticated) currentStep = 4; // CLI login
  if (onboardingResult?.clusterInitialized) currentStep = 5; // Setup
  if (hasStartedChallenge) currentStep = 6; // Challenge started
  if (hasCompletedChallenge) currentStep = 7; // Challenge completed

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
});

// POST /onboarding/start -- create onboarding row (upsert)
onboarding.post("/start", requireAuth, async (c) => {
  const user = c.get("user");
  const userId = user.id;

  await db
    .insert(userOnboarding)
    .values({ userId })
    .onConflictDoNothing({ target: userOnboarding.userId });

  return c.json({ success: true });
});

// POST /onboarding/complete -- mark onboarding completed
onboarding.post("/complete", requireAuth, async (c) => {
  const user = c.get("user");
  const userId = user.id;

  await db
    .insert(userOnboarding)
    .values({ userId, completedAt: new Date() })
    .onConflictDoUpdate({
      target: userOnboarding.userId,
      set: { completedAt: new Date(), updatedAt: new Date() },
    });

  await trackOnboardingCompletedServer(userId);

  // Publish SSE invalidation for onboarding query
  const channel = `invalidate-cache:${userId}`;
  const payload = JSON.stringify({ queryKey: queryKeys.onboarding() });
  redis.publish(channel, payload).catch((err) => {
    console.error("[onboarding] SSE publish failed", {
      channel,
      error: String(err),
    });
  });

  return c.json({ success: true });
});

// POST /onboarding/skip -- mark onboarding skipped
onboarding.post("/skip", requireAuth, async (c) => {
  const user = c.get("user");
  const userId = user.id;

  await db
    .insert(userOnboarding)
    .values({ userId, skippedAt: new Date() })
    .onConflictDoUpdate({
      target: userOnboarding.userId,
      set: { skippedAt: new Date(), updatedAt: new Date() },
    });

  await trackOnboardingSkippedServer(userId);

  // Publish SSE invalidation for onboarding query
  const channel = `invalidate-cache:${userId}`;
  const payload = JSON.stringify({ queryKey: queryKeys.onboarding() });
  redis.publish(channel, payload).catch((err) => {
    console.error("[onboarding] SSE publish failed", {
      channel,
      error: String(err),
    });
  });

  return c.json({ success: true });
});

export { onboarding };
