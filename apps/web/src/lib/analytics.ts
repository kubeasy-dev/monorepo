/**
 * Umami analytics tracking utilities
 *
 * This file provides type-safe wrappers around Umami event tracking
 * to ensure consistent event naming and properties across the application.
 */

/**
 * Umami global object type definition
 */
interface Umami {
  track: (eventName: string, eventData?: Record<string, unknown>) => void;
  identify: {
    (uniqueId: string, data?: Record<string, unknown>): void;
    (data: Record<string, unknown>): void;
  };
}

declare global {
  interface Window {
    umami?: Umami;
  }
}

/**
 * Check if Umami is ready for tracking
 * @returns true if Umami is loaded and available
 */
function isUmamiReady(): boolean {
  return typeof window !== "undefined" && !!window.umami;
}

/**
 * Safe wrapper for Umami track calls with error handling
 * @param eventName - The name of the event to track
 * @param eventData - Event properties
 */
function safeTrack(
  eventName: string,
  eventData?: Record<string, unknown>,
): void {
  if (!isUmamiReady()) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        "[Umami] Event track skipped (not loaded)",
        eventName,
        eventData,
      );
    }
    return;
  }

  try {
    window.umami?.track(eventName, eventData);
  } catch (error) {
    console.error("[Umami] Failed to track event", eventName, error);
  }
}

/**
 * Track API token creation event
 */
export function trackApiTokenCreated() {
  safeTrack("api_token_created");
}

let pendingIdentifyIntervalId: number | null = null;

/**
 * Identify a user in Umami
 * This should be called after successful authentication
 * @param userId - The unique user ID
 * @param properties - Additional user properties
 */
export function identifyUser(
  userId: string,
  properties?: {
    email?: string;
    name?: string;
    provider?: string;
  },
) {
  if (typeof window === "undefined") return;

  const runIdentify = () => {
    try {
      // Umami expects the unique ID as the first positional argument; passing
      // it inside the data object would only set session data without
      // assigning a distinctId.
      window.umami?.identify(userId, properties);
    } catch (error) {
      console.error("[Umami] Failed to identify user", error);
    }
  };

  // Cancel any in-flight poll so the latest call wins and we don't fire
  // identify multiple times with stale arguments.
  if (pendingIdentifyIntervalId !== null) {
    window.clearInterval(pendingIdentifyIntervalId);
    pendingIdentifyIntervalId = null;
  }

  if (isUmamiReady()) {
    runIdentify();
    return;
  }

  // The Umami script is loaded with `defer`, so it may not be ready when the
  // session resolves on first paint. Poll briefly until it's available.
  const startedAt = Date.now();
  const maxWaitMs = 10_000;
  pendingIdentifyIntervalId = window.setInterval(() => {
    if (isUmamiReady()) {
      if (pendingIdentifyIntervalId !== null) {
        window.clearInterval(pendingIdentifyIntervalId);
        pendingIdentifyIntervalId = null;
      }
      runIdentify();
      return;
    }
    if (Date.now() - startedAt > maxWaitMs) {
      if (pendingIdentifyIntervalId !== null) {
        window.clearInterval(pendingIdentifyIntervalId);
        pendingIdentifyIntervalId = null;
      }
      if (process.env.NODE_ENV === "development") {
        console.info("[Umami] User identification skipped (load timeout)");
      }
    }
  }, 100);
}

/**
 * Track sign-in attempt with a social provider
 * Fired when the user clicks a provider button on the login page, before
 * the OAuth redirect.
 * @param provider - The social provider (e.g., "github", "google", "microsoft")
 */
export function trackSignInStarted(provider: string) {
  safeTrack("signin_started", { provider });
}

/**
 * Reset analytics state (call on logout)
 * Umami is session-based and doesn't have a direct reset method.
 * Session ends when the browser is closed or after inactivity.
 */
export function resetAnalytics() {
  if (process.env.NODE_ENV === "development") {
    console.info("[Umami] Reset called (No-op for Umami)");
  }
}

/**
 * Track challenge card click event
 * @param challengeSlug - The slug of the challenge clicked
 * @param difficulty - The difficulty level of the challenge
 * @param fromPage - The page where the click occurred (e.g., "homepage", "challenges_list")
 */
export function trackChallengeCardClicked(
  challengeSlug: string,
  difficulty: string,
  fromPage: string,
) {
  safeTrack("challenge_card_clicked", {
    challengeSlug,
    difficulty,
    fromPage,
  });
}

/**
 * Track CTA button click event
 * @param ctaText - The text of the CTA button
 * @param ctaLocation - Where the CTA is located (e.g., "hero", "footer", "navbar")
 * @param targetUrl - The URL the CTA points to
 */
export function trackCtaClicked(
  ctaText: string,
  ctaLocation: string,
  targetUrl: string,
) {
  safeTrack("cta_clicked", {
    ctaText,
    ctaLocation,
    targetUrl,
  });
}

/**
 * Track CLI command copied event
 * @param command - The command that was copied
 * @param location - Where the copy occurred (e.g., "get_started", "challenge_page")
 * @param stepNumber - Optional step number in a tutorial flow
 */
export function trackCommandCopied(
  command: string,
  location: string,
  stepNumber?: number,
) {
  safeTrack("command_copied", {
    command,
    location,
    ...(stepNumber !== undefined && { stepNumber }),
  });
}

/**
 * Track API token copied event
 * @param tokenName - The name of the token that was copied
 */
export function trackApiTokenCopied(tokenName: string) {
  safeTrack("api_token_copied", {
    tokenName,
  });
}

/**
 * Track outbound link click event
 * @param url - The external URL clicked
 * @param linkType - Type of link (e.g., "github", "docs", "npm")
 * @param location - Where the link is located (e.g., "footer", "header", "cta_section")
 */
export function trackOutboundLinkClicked(
  url: string,
  linkType: "github" | "docs" | "npm" | "twitter" | "other",
  location: string,
) {
  safeTrack("outbound_link_clicked", {
    url,
    linkType,
    location,
  });
}

/**
 * Track demo step completed event
 * @param stepNumber - The demo step number completed
 */
export function trackDemoStepCompleted(stepNumber: number) {
  safeTrack(`demo_step_${stepNumber}_completed`);
}

/**
 * Track demo session created event
 * Called when a user starts the demo flow
 */
export function trackDemoCreated() {
  safeTrack("demo_created");
}

/**
 * Track demo completed event
 * Called when a user successfully completes the demo
 */
export function trackDemoCompleted() {
  safeTrack("demo_completed");
}

// Onboarding step types
export type OnboardingStep =
  | "welcome"
  | "cli_install"
  | "api_token"
  | "cli_login"
  | "cli_setup"
  | "challenge_start"
  | "challenge_complete";

/**
 * Track onboarding started event
 * Called when a user begins the onboarding flow
 */
export function trackOnboardingStarted() {
  safeTrack("onboarding_started");
}

/**
 * Track onboarding step completed event
 * @param step - The step that was completed
 * @param stepNumber - The step number (1-7)
 */
export function trackOnboardingStepCompleted(
  step: OnboardingStep,
  stepNumber: number,
) {
  safeTrack("onboarding_step_completed", {
    step,
    stepNumber,
  });
}

/**
 * Track onboarding completed event
 * Called when a user successfully completes the entire onboarding
 */
export function trackOnboardingCompleted() {
  safeTrack("onboarding_completed");
}

/**
 * Track onboarding skipped event
 * @param atStep - The step where the user skipped
 * @param stepNumber - The step number where they skipped
 */
export function trackOnboardingSkipped(
  atStep: OnboardingStep,
  stepNumber: number,
) {
  safeTrack("onboarding_skipped", {
    atStep,
    stepNumber,
  });
}
