import { zValidator } from "@hono/zod-validator";
import { queryKeys } from "@kubeasy/api-schemas/query-keys";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db/index";
import { userOnboarding } from "../../db/schema/onboarding";
import {
  trackCliLoginServer,
  trackCliSetupServer,
} from "../../lib/analytics-server";
import { redis } from "../../lib/redis";
import { apiKeyMiddleware } from "../../middleware/api-key";
import type { SessionUser } from "../../middleware/session";
import { cliMetadataSchema } from "../../schemas/index";
import { submit } from "../submit";
import { legacyCli } from "./legacy";

type CliEnv = { Variables: { user: SessionUser; session: null } };

const cli = new Hono<CliEnv>();

// API key auth required for all CLI routes (replaces session cookie auth)
cli.use("/*", apiKeyMiddleware);

// Current paths (plural)
cli.route("/challenges", submit); // POST /api/cli/challenges/:slug/submit

// Legacy paths (singular) — aliases for old CLI compatibility
// GET  /api/cli/challenge/:slug          → challenge detail
// GET  /api/cli/challenge/:slug/status   → challenge status
// POST /api/cli/challenge/:slug/start    → start challenge
// POST /api/cli/challenge/:slug/reset    → reset challenge
// POST /api/cli/challenge/:slug/submit   → submit challenge
cli.route("/challenge", legacyCli);

// Helper to parse user name
function parseUserName(fullName: string | null) {
  const name = fullName || "";
  const nameParts = name.trim().split(" ");
  return {
    firstName: nameParts[0] || "",
    lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : null,
  };
}

// GET /cli/user -- deprecated, returns first/last name
cli.get("/user", async (c) => {
  const user = c.get("user");
  const { firstName, lastName } = parseUserName(user.name);
  return c.json({ firstName, lastName }, 200);
});

// POST /cli/user -- returns user info + tracks CLI login for onboarding
cli.post("/user", zValidator("json", cliMetadataSchema), async (c) => {
  const user = c.get("user");
  const userId = user.id;
  const { cliVersion, os, arch } = c.req.valid("json");

  // Atomically determine firstLogin and set cliAuthenticated = true
  // Try to update existing record where cliAuthenticated = false
  const updateResult = await db
    .update(userOnboarding)
    .set({ cliAuthenticated: true, updatedAt: new Date() })
    .where(
      and(
        eq(userOnboarding.userId, userId),
        eq(userOnboarding.cliAuthenticated, false),
      ),
    )
    .returning({ userId: userOnboarding.userId });

  let firstLogin: boolean;

  if (updateResult.length > 0) {
    firstLogin = true;
  } else {
    // Either record doesn't exist, or cliAuthenticated was already true
    const insertResult = await db
      .insert(userOnboarding)
      .values({ userId, cliAuthenticated: true })
      .onConflictDoNothing({ target: userOnboarding.userId })
      .returning({ userId: userOnboarding.userId });
    firstLogin = insertResult.length > 0;
  }

  // Track in PostHog
  await trackCliLoginServer(userId, { cliVersion, os, arch });

  // Publish SSE invalidation for onboarding query
  const channel = `invalidate-cache:${userId}`;
  const payload = JSON.stringify({ queryKey: queryKeys.onboarding() });
  redis.publish(channel, payload).catch((err) => {
    console.error("[cli/user] SSE publish failed", {
      channel,
      error: String(err),
    });
  });

  const { firstName, lastName } = parseUserName(user.name);
  return c.json({ firstName, lastName, firstLogin });
});

// POST /cli/track/setup -- tracks cluster initialization for onboarding
cli.post("/track/setup", zValidator("json", cliMetadataSchema), async (c) => {
  const user = c.get("user");
  const userId = user.id;
  const { cliVersion, os, arch } = c.req.valid("json");

  // Check if first time
  const [existing] = await db
    .select({ clusterInitialized: userOnboarding.clusterInitialized })
    .from(userOnboarding)
    .where(eq(userOnboarding.userId, userId));

  const firstTime = !existing?.clusterInitialized;

  // Upsert clusterInitialized = true
  await db
    .insert(userOnboarding)
    .values({ userId, clusterInitialized: true })
    .onConflictDoUpdate({
      target: userOnboarding.userId,
      set: { clusterInitialized: true, updatedAt: new Date() },
    });

  // Track in PostHog
  await trackCliSetupServer(userId, { cliVersion, os, arch });

  // Publish SSE invalidation for onboarding query
  const channel = `invalidate-cache:${userId}`;
  const payload = JSON.stringify({ queryKey: queryKeys.onboarding() });
  redis.publish(channel, payload).catch((err) => {
    console.error("[cli/track/setup] SSE publish failed", {
      channel,
      error: String(err),
    });
  });

  return c.json({ success: true, firstTime });
});

export { cli };
