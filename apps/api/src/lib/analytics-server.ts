/**
 * PostHog server-side analytics tracking utilities
 *
 * This file provides server-side tracking for events triggered from API routes
 * (especially for CLI interactions).
 */

import { logger } from "@kubeasy/logger";
import { PostHog } from "posthog-node";

// Initialize PostHog client for server-side tracking
const posthogKey = process.env.POSTHOG_KEY;
const posthogHost = process.env.POSTHOG_HOST;
const isDevelopment = process.env.NODE_ENV === "development";

// Only initialize PostHog if credentials are available
let posthogClient: PostHog | null = null;

if (posthogKey && posthogHost) {
  try {
    posthogClient = new PostHog(posthogKey, {
      host: posthogHost,
      flushAt: 1, // Send events immediately (useful for CLI interactions)
      flushInterval: 0, // Disable automatic flushing
      // Disable in development
      disabled: isDevelopment,
    });

    if (isDevelopment) {
      logger.info("PostHog Server disabled in development mode");
    }
  } catch (error) {
    logger.error("PostHog Server failed to initialize", {
      error: String(error),
    });
  }
} else if (isDevelopment) {
  logger.info("PostHog Server not initialized: missing environment variables");
}

/**
 * Flatten a properties object into scalar-only log attributes.
 * Arrays are joined as comma-separated strings; nested objects are stringified.
 * Per PostHog best practices, only scalar values (string, number, boolean) are allowed.
 */
function toScalarAttributes(
  props?: Record<string, unknown>,
): Record<string, string | number | boolean> | undefined {
  if (!props || Object.keys(props).length === 0) return undefined;
  const attrs: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      attrs[key] = value;
    } else if (Array.isArray(value)) {
      attrs[key] = value.join(", ");
    } else if (value !== null && value !== undefined) {
      attrs[key] = String(value);
    }
  }
  return Object.keys(attrs).length > 0 ? attrs : undefined;
}

/**
 * Safe wrapper for PostHog server-side operations
 * In development, logs the event details to the console instead of sending to PostHog
 */
async function safePostHogOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  devLog?: { event: string; properties?: Record<string, unknown> },
): Promise<void> {
  // Log in dev regardless of whether posthogClient exists:
  // - First branch: client is null (missing env vars in dev)
  // - Second branch: client exists but is disabled (disabled: true in dev config)
  if (!posthogClient) {
    if (isDevelopment && devLog) {
      logger.debug(`PostHog Server: ${devLog.event}`, {
        event: devLog.event,
        ...toScalarAttributes(devLog.properties),
      });
    }
    return;
  }

  if (isDevelopment && devLog) {
    logger.debug(`PostHog Server: ${devLog.event}`, {
      event: devLog.event,
      ...toScalarAttributes(devLog.properties),
    });
    return;
  }

  try {
    await fn();
  } catch (error) {
    // Log but don't throw - analytics failures shouldn't break the application
    logger.error(`PostHog Server: ${operation} failed`, {
      error: String(error),
    });
  }
}

/**
 * Track user signup event (server-side)
 * @param userId - The user ID
 * @param provider - The authentication provider used (github, google, microsoft)
 * @param email - User email (optional)
 */
export async function trackUserSignupServer(
  userId: string,
  provider: "github" | "google" | "microsoft",
  email?: string,
) {
  const properties = { provider, ...(email && { email }) };
  await safePostHogOperation(
    "trackUserSignupServer",
    async () => {
      posthogClient?.capture({
        distinctId: userId,
        event: "user_signup",
        properties,
      });
      await posthogClient?.flush();
    },
    { event: "user_signup", properties },
  );
}

/**
 * Track API token creation event (server-side)
 * @param userId - The user ID who created the token
 */
export async function trackApiTokenCreatedServer(userId: string) {
  await safePostHogOperation(
    "trackApiTokenCreatedServer",
    async () => {
      posthogClient?.capture({
        distinctId: userId,
        event: "api_token_created",
        properties: { source: "server" },
      });
      await posthogClient?.flush();
    },
    { event: "api_token_created", properties: { source: "server" } },
  );
}

/**
 * Track challenge start event (server-side)
 * @param userId - The user ID
 * @param challengeId - The ID of the challenge being started
 * @param challengeSlug - The slug of the challenge
 * @param challengeTitle - The title of the challenge
 */
export async function trackChallengeStartedServer(
  userId: string,
  challengeId: number,
  challengeSlug: string,
  challengeTitle: string,
) {
  const properties = {
    challengeId,
    challengeSlug,
    challengeTitle,
    source: "cli",
  };
  await safePostHogOperation(
    "trackChallengeStartedServer",
    async () => {
      posthogClient?.capture({
        distinctId: userId,
        event: "challenge_started",
        properties,
      });
      await posthogClient?.flush();
    },
    { event: "challenge_started", properties },
  );
}

/**
 * Track challenge completion event (server-side)
 * @param userId - The user ID
 * @param challengeId - The ID of the challenge that was completed
 * @param challengeSlug - The slug of the challenge
 * @param difficulty - The difficulty level of the challenge
 * @param xpAwarded - XP awarded for completion
 * @param isFirstChallenge - Whether this was the user's first challenge
 */
export async function trackChallengeCompletedServer(
  userId: string,
  challengeId: number,
  challengeSlug: string,
  difficulty: string,
  xpAwarded: number,
  isFirstChallenge: boolean,
) {
  const properties = {
    challengeId,
    challengeSlug,
    difficulty,
    xpAwarded,
    isFirstChallenge,
    source: "cli",
  };
  await safePostHogOperation(
    "trackChallengeCompletedServer",
    async () => {
      posthogClient?.capture({
        distinctId: userId,
        event: "challenge_completed",
        properties,
      });
      await posthogClient?.flush();
    },
    { event: "challenge_completed", properties },
  );
}

/**
 * Track challenge submission sent event (server-side)
 * Fired on every submission attempt, regardless of pass/fail outcome
 * @param userId - The user ID
 * @param challengeId - The ID of the challenge
 * @param challengeSlug - The slug of the challenge
 */
export async function trackChallengeSubmissionSentServer(
  userId: string,
  challengeId: number,
  challengeSlug: string,
) {
  const properties = { challengeId, challengeSlug, source: "cli" };
  await safePostHogOperation(
    "trackChallengeSubmissionSentServer",
    async () => {
      posthogClient?.capture({
        distinctId: userId,
        event: "challenge_submission_sent",
        properties,
      });
      await posthogClient?.flush();
    },
    { event: "challenge_submission_sent", properties },
  );
}

/**
 * Identify a user in PostHog (server-side)
 * @param userId - The unique user ID
 * @param properties - User properties
 */
export async function identifyUserServer(
  userId: string,
  properties?: {
    email?: string;
    name?: string;
    provider?: string;
  },
) {
  await safePostHogOperation(
    "identifyUserServer",
    async () => {
      posthogClient?.identify({
        distinctId: userId,
        properties,
      });
      await posthogClient?.flush();
    },
    { event: "identify", properties: { userId, ...properties } },
  );
}

/**
 * Track challenge validation failure (server-side)
 * @param userId - The user ID
 * @param challengeId - The ID of the challenge
 * @param challengeSlug - The slug of the challenge
 * @param failedObjectiveCount - Number of failed objectives
 * @param failedObjectiveIds - List of failed objective IDs
 */
export async function trackChallengeValidationFailedServer(
  userId: string,
  challengeId: number,
  challengeSlug: string,
  failedObjectiveCount: number,
  failedObjectiveIds: string[],
) {
  const properties = {
    challengeId,
    challengeSlug,
    failedObjectiveCount,
    failedObjectiveIds,
    source: "cli",
  };
  await safePostHogOperation(
    "trackChallengeValidationFailedServer",
    async () => {
      posthogClient?.capture({
        distinctId: userId,
        event: "challenge_validation_failed",
        properties,
      });
      await posthogClient?.flush();
    },
    { event: "challenge_validation_failed", properties },
  );
}

/**
 * Track CLI login event (server-side)
 * @param userId - The user ID
 * @param metadata - CLI metadata (version, os, arch)
 */
export async function trackCliLoginServer(
  userId: string,
  metadata: { cliVersion: string; os: string; arch: string },
) {
  const properties = {
    cliVersion: metadata.cliVersion,
    os: metadata.os,
    arch: metadata.arch,
    source: "cli",
  };
  await safePostHogOperation(
    "trackCliLoginServer",
    async () => {
      posthogClient?.capture({
        distinctId: userId,
        event: "cli_login",
        properties,
      });
      await posthogClient?.flush();
    },
    { event: "cli_login", properties },
  );
}

/**
 * Track CLI setup event (server-side)
 * @param userId - The user ID
 * @param metadata - CLI metadata (version, os, arch)
 */
export async function trackCliSetupServer(
  userId: string,
  metadata: { cliVersion: string; os: string; arch: string },
) {
  const properties = {
    cliVersion: metadata.cliVersion,
    os: metadata.os,
    arch: metadata.arch,
    source: "cli",
  };
  await safePostHogOperation(
    "trackCliSetupServer",
    async () => {
      posthogClient?.capture({
        distinctId: userId,
        event: "cli_setup",
        properties,
      });
      await posthogClient?.flush();
    },
    { event: "cli_setup", properties },
  );
}

/**
 * Track onboarding completed event (server-side)
 * @param userId - The user ID
 */
export async function trackOnboardingCompletedServer(userId: string) {
  await safePostHogOperation(
    "trackOnboardingCompletedServer",
    async () => {
      posthogClient?.capture({
        distinctId: userId,
        event: "onboarding_completed",
        properties: { source: "server" },
      });
      await posthogClient?.flush();
    },
    { event: "onboarding_completed", properties: { source: "server" } },
  );
}

/**
 * Track onboarding skipped event (server-side)
 * @param userId - The user ID
 */
export async function trackOnboardingSkippedServer(userId: string) {
  await safePostHogOperation(
    "trackOnboardingSkippedServer",
    async () => {
      posthogClient?.capture({
        distinctId: userId,
        event: "onboarding_skipped",
        properties: { source: "server" },
      });
      await posthogClient?.flush();
    },
    { event: "onboarding_skipped", properties: { source: "server" } },
  );
}

/**
 * Capture an exception in PostHog Error Tracking (server-side)
 * @param error - The error to capture
 * @param distinctId - Optional user ID for attribution
 * @param additionalProperties - Optional extra properties for context
 */
export async function captureServerException(
  error: unknown,
  distinctId?: string,
  additionalProperties?: Record<string, unknown>,
): Promise<void> {
  if (isDevelopment) {
    logger.debug("PostHog Server: $exception", {
      error: error instanceof Error ? error.message : String(error),
      ...toScalarAttributes(additionalProperties),
    });
    return;
  }

  if (!posthogClient) {
    return;
  }

  try {
    posthogClient.captureException(error, distinctId, additionalProperties);
    await posthogClient.flush();
  } catch (captureError) {
    logger.error("PostHog Server: captureServerException failed", {
      error: String(captureError),
    });
  }
}

/**
 * Get the PostHog server client instance (for instrumentation.ts)
 */
export function getPostHogClient(): PostHog | null {
  return posthogClient;
}

/**
 * Shutdown PostHog client (call on server shutdown)
 */
export async function shutdownPostHog() {
  if (!posthogClient) {
    return;
  }

  try {
    await posthogClient.shutdown();
  } catch (error) {
    logger.error("PostHog Server: failed to shutdown", {
      error: String(error),
    });
  }
}
