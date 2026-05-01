import {
  CompletionPercentageOutputSchema,
  CompletionPercentageQuerySchema,
  GetStatusOutputSchema,
  ResetChallengeOutputSchema,
  StartChallengeOutputSchema,
} from "@kubeasy/api-schemas/progress";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "../db/index";
import {
  userProgress,
  userSubmission,
  userXp,
  userXpTransaction,
} from "../db/schema/index";
import { trackChallengeStarted } from "../lib/analytics-server";
import { cacheDel, cacheDelPattern, cached, cacheKey, TTL } from "../lib/cache";
import { getChallenge, listChallenges } from "../lib/registry";
import { type AppEnv, requireAuth } from "../middleware/session";

const slugParam = z.object({ slug: z.string() });

const cliSecurity: { [k: string]: string[] }[] = [
  { SessionAuth: [] },
  { BearerAuth: [] },
];

export const progress = new Hono<AppEnv>()
  // GET /progress/completion -- get completion percentage (global or by theme)
  .get(
    "/completion",
    describeRoute({
      tags: ["Progress"],
      summary: "Get user completion percentage",
      responses: {
        200: {
          description: "Completion percentage",
          content: {
            "application/json": {
              schema: resolver(CompletionPercentageOutputSchema),
            },
          },
        },
      },
    }),
    requireAuth,
    validator("query", CompletionPercentageQuerySchema),
    async (c) => {
      const user = c.get("user");
      const userId = user.id;
      const { splitByTheme, themeSlug } = c.req.valid("query");

      const key = cacheKey(`u:${userId}:progress:completion`, {
        splitByTheme: String(splitByTheme),
        themeSlug,
      });

      const data = await cached(key, TTL.USER, async () => {
        if (splitByTheme) {
          const [registryList, completedSlugs] = await Promise.all([
            listChallenges(),
            db
              .select({ challengeSlug: userProgress.challengeSlug })
              .from(userProgress)
              .where(
                and(
                  eq(userProgress.userId, userId),
                  eq(userProgress.status, "completed"),
                ),
              ),
          ]);

          const completedSet = new Set(
            completedSlugs.map((r) => r.challengeSlug),
          );

          const themeStats = new Map<
            string,
            { totalCount: number; completedCount: number }
          >();
          for (const ch of registryList) {
            const s = themeStats.get(ch.theme) ?? {
              totalCount: 0,
              completedCount: 0,
            };
            s.totalCount += 1;
            if (completedSet.has(ch.slug)) s.completedCount += 1;
            themeStats.set(ch.theme, s);
          }

          const byTheme = [...themeStats.entries()].map(
            ([themeSlug, { totalCount, completedCount }]) => ({
              themeSlug,
              completedCount,
              totalCount,
              percentageCompleted:
                totalCount > 0
                  ? Math.round((completedCount / totalCount) * 100)
                  : 0,
            }),
          );

          const totalCount = registryList.length;
          const completedCount = completedSet.size;
          const percentageCompleted =
            totalCount > 0
              ? Math.round((completedCount / totalCount) * 100)
              : 0;

          return { byTheme, completedCount, totalCount, percentageCompleted };
        }

        const registryList = await listChallenges();
        const filteredSlugs = themeSlug
          ? registryList
              .filter((ch) => ch.theme === themeSlug)
              .map((ch) => ch.slug)
          : registryList.map((ch) => ch.slug);

        const totalCount = filteredSlugs.length;

        const [completedResult] = await db
          .select({ count: count() })
          .from(userProgress)
          .where(
            and(
              eq(userProgress.userId, userId),
              eq(userProgress.status, "completed"),
              themeSlug && filteredSlugs.length > 0
                ? inArray(userProgress.challengeSlug, filteredSlugs)
                : undefined,
            ),
          );

        const completedCount = completedResult?.count ?? 0;

        return {
          completedCount,
          totalCount,
          percentageCompleted:
            totalCount > 0
              ? Math.round((completedCount / totalCount) * 100)
              : 0,
        };
      });

      return c.json(data);
    },
  )
  // GET /progress/:slug -- get challenge status for authenticated user
  .get(
    "/:slug",
    describeRoute({
      tags: ["CLI", "Progress"],
      summary: "Get challenge progress",
      security: cliSecurity,
      responses: {
        200: {
          description: "Challenge progress",
          content: {
            "application/json": { schema: resolver(GetStatusOutputSchema) },
          },
        },
      },
    }),
    requireAuth,
    validator("param", slugParam),
    async (c) => {
      const user = c.get("user");
      const userId = user.id;
      const { slug } = c.req.valid("param");

      const data = await cached(
        cacheKey(`u:${userId}:progress:status`, { slug }),
        TTL.USER,
        async () => {
          const [progressRecord] = await db
            .select({
              status: userProgress.status,
              startedAt: userProgress.startedAt,
              completedAt: userProgress.completedAt,
            })
            .from(userProgress)
            .where(
              and(
                eq(userProgress.userId, userId),
                eq(userProgress.challengeSlug, slug),
              ),
            )
            .limit(1);

          return progressRecord
            ? {
                status: progressRecord.status,
                startedAt: progressRecord.startedAt,
                completedAt: progressRecord.completedAt,
              }
            : { status: "not_started" as const };
        },
      );

      return c.json(data);
    },
  )
  // POST /progress/:slug/start -- create or update user progress to in_progress
  .post(
    "/:slug/start",
    describeRoute({
      tags: ["CLI", "Progress"],
      summary: "Start a challenge",
      security: cliSecurity,
      responses: {
        200: {
          description: "Challenge started",
          content: {
            "application/json": {
              schema: resolver(StartChallengeOutputSchema),
            },
          },
        },
        404: { description: "Challenge not found" },
      },
    }),
    requireAuth,
    validator("param", slugParam),
    async (c) => {
      const user = c.get("user");
      const userId = user.id;
      const { slug } = c.req.valid("param");

      const detail = await getChallenge(slug);
      if (!detail) {
        return c.json({ error: "Challenge not found" }, 404);
      }

      const [existingProgress] = await db
        .select({
          id: userProgress.id,
          status: userProgress.status,
          startedAt: userProgress.startedAt,
        })
        .from(userProgress)
        .where(
          and(
            eq(userProgress.userId, userId),
            eq(userProgress.challengeSlug, slug),
          ),
        )
        .limit(1);

      const now = new Date();

      if (existingProgress) {
        if (existingProgress.status === "completed") {
          return c.json({
            status: existingProgress.status,
            startedAt: existingProgress.startedAt,
            message: "Challenge already completed",
          });
        }
        if (existingProgress.status === "not_started") {
          await db
            .update(userProgress)
            .set({ status: "in_progress", startedAt: now })
            .where(eq(userProgress.id, existingProgress.id));
        }
        return c.json({
          status: "in_progress" as const,
          startedAt: existingProgress.startedAt,
        });
      }

      await db.insert(userProgress).values({
        id: nanoid(),
        userId,
        challengeSlug: slug,
        status: "in_progress",
        startedAt: now,
      });

      trackChallengeStarted(userId, slug, detail.title).catch((err) => {
        c.get("log").error("challenge started tracking failed", {
          userId,
          slug,
          error: String(err),
        });
      });

      Promise.all([
        cacheDel(cacheKey(`u:${userId}:progress:status`, { slug })),
        cacheDelPattern(`cache:u:${userId}:progress:completion:*`),
        cacheDelPattern(`cache:u:${userId}:challenges:list:*`),
      ]).catch((err) => {
        c.get("log").error("cache invalidation failed", {
          userId,
          slug,
          error: String(err),
        });
      });

      return c.json({ status: "in_progress" as const, startedAt: now });
    },
  )
  // DELETE|POST /progress/:slug/reset
  .on(
    ["DELETE", "POST"],
    "/:slug/reset",
    describeRoute({
      tags: ["CLI", "Progress"],
      summary: "Reset challenge progress",
      security: cliSecurity,
      responses: {
        200: {
          description: "Progress reset",
          content: {
            "application/json": {
              schema: resolver(ResetChallengeOutputSchema),
            },
          },
        },
        404: { description: "Challenge not found" },
      },
    }),
    requireAuth,
    validator("param", slugParam),
    async (c) => {
      const user = c.get("user");
      const userId = user.id;
      const { slug } = c.req.valid("param");

      const detail = await getChallenge(slug);
      if (!detail) {
        return c.json({ error: "Challenge not found" }, 404);
      }

      const [progress] = await db
        .select({ status: userProgress.status })
        .from(userProgress)
        .where(
          and(
            eq(userProgress.userId, userId),
            eq(userProgress.challengeSlug, slug),
          ),
        )
        .limit(1);

      if (!progress) {
        return c.json({
          success: true,
          message: "No progress to reset.",
        });
      }

      const isReplay = progress.status === "completed";

      await Promise.all([
        db
          .delete(userProgress)
          .where(
            and(
              eq(userProgress.userId, userId),
              eq(userProgress.challengeSlug, slug),
            ),
          ),
        db
          .delete(userSubmission)
          .where(
            and(
              eq(userSubmission.userId, userId),
              eq(userSubmission.challengeSlug, slug),
            ),
          ),
        ...(isReplay
          ? []
          : [
              db
                .delete(userXpTransaction)
                .where(
                  and(
                    eq(userXpTransaction.userId, userId),
                    eq(userXpTransaction.challengeSlug, slug),
                  ),
                ),
            ]),
      ]);

      if (!isReplay) {
        const [xpResult] = await db
          .select({
            totalXp: sql<number>`COALESCE(SUM(${userXpTransaction.xpAmount}), 0)`,
          })
          .from(userXpTransaction)
          .where(eq(userXpTransaction.userId, userId));

        await db
          .update(userXp)
          .set({ totalXp: xpResult?.totalXp ?? 0 })
          .where(eq(userXp.userId, userId));
      }

      cacheDelPattern(`cache:u:${userId}:*`).catch((err) => {
        c.get("log").error("cache invalidation failed", {
          userId,
          error: String(err),
        });
      });

      return c.json({
        success: true,
        isReplay,
        previousStatus: progress.status,
        message: isReplay
          ? "Challenge reset. Your XP from the previous completion has been preserved."
          : "Challenge progress reset successfully.",
      });
    },
  );
