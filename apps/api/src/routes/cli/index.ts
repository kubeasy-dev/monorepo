import { zValidator } from "@hono/zod-validator";
import { CliMetadataSchema } from "@kubeasy/api-schemas/cli";
import { queryKeys } from "@kubeasy/api-schemas/query-keys";
import { logger } from "@kubeasy/logger";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { z } from "zod";
import { db } from "../../db/index";
import { userOnboarding } from "../../db/schema/onboarding";
import { trackCliLogin, trackCliSetup } from "../../lib/analytics-server";
import { redis } from "../../lib/redis";
import { apiKeyMiddleware } from "../../middleware/api-key";
import type { SessionUser } from "../../middleware/session";
import { submit } from "../submit";
import { legacyCli } from "./legacy";

type CliEnv = { Variables: { user: SessionUser; session: null } };

const cli = new Hono<CliEnv>();

// API key auth required for all CLI routes (replaces session cookie auth)
cli.use("/*", apiKeyMiddleware);

// Current paths (plural)
cli.route("/challenges", submit); // POST /api/cli/challenges/:slug/submit

// Legacy paths (singular) — aliases for old CLI compatibility
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

// Helper to handle CLI login onboarding logic
async function handleCliOnboarding(
  userId: string,
  metadata: z.infer<typeof CliMetadataSchema>,
  source: string,
) {
  const { cliVersion, os, arch } = metadata;

  // Atomically determine firstLogin and set cliAuthenticated = true
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
    const insertResult = await db
      .insert(userOnboarding)
      .values({ userId, cliAuthenticated: true })
      .onConflictDoNothing({ target: userOnboarding.userId })
      .returning({ userId: userOnboarding.userId });
    firstLogin = insertResult.length > 0;
  }

  // Track in PostHog
  await trackCliLogin(userId, { cliVersion, os, arch });

  // Publish SSE invalidation for onboarding query
  const channel = `invalidate-cache:${userId}`;
  const payload = JSON.stringify({ queryKey: queryKeys.onboarding() });
  redis.publish(channel, payload).catch((err) => {
    logger.error(`[${source}] SSE publish failed`, {
      userId,
      channel,
      error: String(err),
    });
  });

  return firstLogin;
}

// GET /cli/user -- deprecated, returns first/last name
cli.get("/user", async (c) => {
  const user = c.get("user");
  const { firstName, lastName } = parseUserName(user.name);
  return c.json({ firstName, lastName }, 200);
});

// POST /cli/user -- returns user info + tracks CLI login for onboarding
cli.post("/user", zValidator("json", CliMetadataSchema), async (c) => {
  const user = c.get("user");
  const metadata = c.req.valid("json");

  const firstLogin = await handleCliOnboarding(user.id, metadata, "cli/user");

  const { firstName, lastName } = parseUserName(user.name);
  return c.json({ firstName, lastName, firstLogin });
});

// POST /cli/track/login -- tracks CLI login for onboarding
cli.post("/track/login", zValidator("json", CliMetadataSchema), async (c) => {
  const user = c.get("user");
  const metadata = c.req.valid("json");

  const firstLogin = await handleCliOnboarding(
    user.id,
    metadata,
    "cli/track/login",
  );

  return c.json({ firstLogin });
});

// POST /cli/track/setup -- tracks cluster initialization for onboarding
cli.post("/track/setup", zValidator("json", CliMetadataSchema), async (c) => {
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
  await trackCliSetup(userId, { cliVersion, os, arch });

  // Publish SSE invalidation for onboarding query
  const channel = `invalidate-cache:${userId}`;
  const payload = JSON.stringify({ queryKey: queryKeys.onboarding() });
  redis.publish(channel, payload).catch((err) => {
    logger.error("[cli/track/setup] SSE publish failed", {
      userId,
      channel,
      error: String(err),
    });
  });

  return c.json({ success: true, firstTime });
});

export { cli };
