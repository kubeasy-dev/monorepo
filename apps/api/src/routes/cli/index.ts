import { CliMetadataSchema } from "@kubeasy/api-schemas/cli";
import { queryKeys } from "@kubeasy/api-schemas/query-keys";
import { and, eq } from "drizzle-orm";
import type { RequestLogger } from "evlog";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { z } from "zod";
import { z as zod } from "zod";
import { db } from "../../db/index";
import { userOnboarding } from "../../db/schema/onboarding";
import { trackCliLogin, trackCliSetup } from "../../lib/analytics-server";
import { bearerSecurity } from "../../lib/openapi-shared";
import { redis } from "../../lib/redis";
import type { AppEnv } from "../../middleware/session";
import { requireAuth } from "../../middleware/session";
import { submit } from "../submit";

const CliUserOutputSchema = zod.object({
  firstName: zod.string(),
  lastName: zod.string().nullable(),
});

const CliUserPostOutputSchema = CliUserOutputSchema.extend({
  firstLogin: zod.boolean(),
});

const TrackLoginOutputSchema = zod.object({ firstLogin: zod.boolean() });

const TrackSetupOutputSchema = zod.object({
  success: zod.boolean(),
  firstTime: zod.boolean(),
});

function parseUserName(fullName: string | null) {
  const name = fullName || "";
  const nameParts = name.trim().split(" ");
  return {
    firstName: nameParts[0] || "",
    lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : null,
  };
}

async function handleCliOnboarding(
  log: RequestLogger,
  userId: string,
  metadata: z.infer<typeof CliMetadataSchema>,
  _source: string,
) {
  const { cliVersion, os, arch } = metadata;

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

  await trackCliLogin(userId, { cliVersion, os, arch });

  const channel = `invalidate-cache:${userId}`;
  const payload = JSON.stringify({ queryKey: queryKeys.onboarding() });
  redis.publish(channel, payload).catch((err) => {
    log.error("SSE publish failed", { userId, channel, error: String(err) });
  });

  return firstLogin;
}

export const cli = new Hono<AppEnv>()
  .use("/*", requireAuth)
  .route("/challenges", submit)
  .get(
    "/user",
    describeRoute({
      tags: ["CLI"],
      summary: "Get user (deprecated)",
      security: bearerSecurity,
      responses: {
        200: {
          description: "User",
          content: {
            "application/json": { schema: resolver(CliUserOutputSchema) },
          },
        },
      },
    }),
    async (c) => {
      const user = c.get("user");
      const { firstName, lastName } = parseUserName(user.name);
      return c.json({ firstName, lastName }, 200);
    },
  )
  .post(
    "/user",
    describeRoute({
      tags: ["CLI"],
      summary: "Returns user info and tracks CLI login",
      security: bearerSecurity,
      responses: {
        200: {
          description: "User",
          content: {
            "application/json": { schema: resolver(CliUserPostOutputSchema) },
          },
        },
      },
    }),
    validator("json", CliMetadataSchema),
    async (c) => {
      const user = c.get("user");
      const metadata = c.req.valid("json");

      const firstLogin = await handleCliOnboarding(
        c.get("log"),
        user.id,
        metadata,
        "cli/user",
      );

      const { firstName, lastName } = parseUserName(user.name);
      return c.json({ firstName, lastName, firstLogin });
    },
  )
  .post(
    "/track/login",
    describeRoute({
      tags: ["CLI"],
      summary: "Track CLI login and metadata",
      security: bearerSecurity,
      responses: {
        200: {
          description: "Login tracked",
          content: {
            "application/json": { schema: resolver(TrackLoginOutputSchema) },
          },
        },
      },
    }),
    validator("json", CliMetadataSchema),
    async (c) => {
      const user = c.get("user");
      const metadata = c.req.valid("json");

      const firstLogin = await handleCliOnboarding(
        c.get("log"),
        user.id,
        metadata,
        "cli/track/login",
      );

      return c.json({ firstLogin });
    },
  )
  .post(
    "/track/setup",
    describeRoute({
      tags: ["CLI"],
      summary: "Track CLI cluster initialization",
      security: bearerSecurity,
      responses: {
        200: {
          description: "Setup tracked",
          content: {
            "application/json": { schema: resolver(TrackSetupOutputSchema) },
          },
        },
      },
    }),
    validator("json", CliMetadataSchema),
    async (c) => {
      const user = c.get("user");
      const userId = user.id;
      const { cliVersion, os, arch } = c.req.valid("json");

      const [existing] = await db
        .select({ clusterInitialized: userOnboarding.clusterInitialized })
        .from(userOnboarding)
        .where(eq(userOnboarding.userId, userId));

      const firstTime = !existing?.clusterInitialized;

      await db
        .insert(userOnboarding)
        .values({ userId, clusterInitialized: true })
        .onConflictDoUpdate({
          target: userOnboarding.userId,
          set: { clusterInitialized: true, updatedAt: new Date() },
        });

      await trackCliSetup(userId, { cliVersion, os, arch });

      const channel = `invalidate-cache:${userId}`;
      const payload = JSON.stringify({ queryKey: queryKeys.onboarding() });
      redis.publish(channel, payload).catch((err) => {
        c.get("log").error("SSE publish failed", {
          userId,
          channel,
          error: String(err),
        });
      });

      return c.json({ success: true, firstTime });
    },
  );
