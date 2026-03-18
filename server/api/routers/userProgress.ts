import { all } from "better-all";
import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import {
  trackChallengeCompletedServer,
  trackChallengeStartedServer,
  trackChallengeValidationFailedServer,
} from "@/lib/analytics-server";
import { isRealtimeConfigured, realtime } from "@/lib/realtime";
import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import {
  challenge,
  challengeObjective,
  userProgress,
  userSubmission,
  userXp,
  userXpTransaction,
} from "@/server/db/schema";
import {
  calculateLevel,
  calculateStreak,
  calculateXPGain,
} from "@/server/services/xp";
import type { Objective } from "@/types/cli-api";

export const userProgressRouter = createTRPCRouter({
  // Get completion percentage
  getCompletionPercentage: privateProcedure
    .input(
      z
        .object({
          splitByTheme: z.boolean().default(false),
          themeSlug: z.string().optional(),
        })
        .optional()
        .default({ splitByTheme: false }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const splitByTheme = input.splitByTheme;

      // If splitByTheme is true, return progression by theme + global stats
      if (splitByTheme) {
        // Single optimized query: get total and completed counts by theme with theme name
        const byTheme = await ctx.db
          .select({
            themeSlug: challenge.theme,
            totalCount: count(challenge.id),
            completedCount: sql<number>`CAST(COUNT(CASE WHEN ${userProgress.userId} = ${userId} AND ${userProgress.status} = 'completed' THEN 1 END) AS INTEGER)`,
          })
          .from(challenge)
          .leftJoin(userProgress, eq(challenge.id, userProgress.challengeId))
          .groupBy(challenge.theme)
          .then((results) =>
            results.map((theme) => ({
              themeSlug: theme.themeSlug,
              completedCount: theme.completedCount,
              totalCount: theme.totalCount,
              percentageCompleted:
                theme.totalCount > 0
                  ? Math.round((theme.completedCount / theme.totalCount) * 100)
                  : 0,
            })),
          );

        // Calculate global stats from theme stats
        const totalCount = byTheme.reduce(
          (sum, theme) => sum + theme.totalCount,
          0,
        );
        const completedCount = byTheme.reduce(
          (sum, theme) => sum + theme.completedCount,
          0,
        );
        const percentageCompleted =
          totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        return {
          byTheme,
          completedCount,
          totalCount,
          percentageCompleted,
        };
      }

      // Standard mode: single theme or all themes
      const themeSlug = input.themeSlug;
      // Build filter for theme if provided
      const themeFilter = themeSlug
        ? eq(challenge.theme, themeSlug)
        : undefined;

      // Get total challenges (optionally filtered by theme)
      const [totalResult] = await ctx.db
        .select({ count: count() })
        .from(challenge)
        .where(themeFilter);

      // Get completed challenges (optionally filtered by theme)
      const completedQuery = ctx.db
        .select({ count: count() })
        .from(userProgress)
        .innerJoin(challenge, eq(userProgress.challengeId, challenge.id))
        .where(
          and(
            eq(userProgress.userId, userId),
            eq(userProgress.status, "completed"),
            themeFilter,
          ),
        );

      const [completedResult] = await completedQuery;

      const totalCount = totalResult?.count ?? 0;
      const completedCount = completedResult?.count ?? 0;

      return {
        completedCount,
        totalCount,
        percentageCompleted:
          totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      };
    }),

  // Get user XP and rank
  getXpAndRank: privateProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Get total XP from transactions (source of truth)
    const result = await ctx.db
      .select({
        totalXp: sql<number>`COALESCE(SUM(${userXpTransaction.xpAmount}), 0)`,
      })
      .from(userXpTransaction)
      .where(eq(userXpTransaction.userId, userId));

    const xpEarned = result[0]?.totalXp ?? 0;

    // Use calculateLevel from XP service to get rank
    const rankInfo = await calculateLevel(userId);

    return {
      xpEarned,
      rank: rankInfo.name,
      rankInfo, // Include full rank info (progress, nextRankXp, etc.)
    };
  }),

  // Get user streak
  getStreak: privateProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Use calculateStreak from XP service
    // This uses daily_streak transactions as source of truth
    const streak = await calculateStreak(userId);

    return streak;
  }),

  // Complete a challenge and award XP
  completeChallenge: privateProcedure
    .input(
      z.object({
        challengeId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { challengeId } = input;

      // Check if challenge exists and get its difficulty
      const [challengeData] = await ctx.db
        .select({
          id: challenge.id,
          difficulty: challenge.difficulty,
        })
        .from(challenge)
        .where(eq(challenge.id, challengeId));

      if (!challengeData) {
        throw new Error("Challenge not found");
      }

      // Check if user already completed this challenge
      const [existingProgress] = await ctx.db
        .select()
        .from(userProgress)
        .where(
          and(
            eq(userProgress.userId, userId),
            eq(userProgress.challengeId, challengeId),
          ),
        );

      // Fast-path for intentional re-submissions; the atomic write below is the actual race guard
      if (existingProgress?.status === "completed") {
        throw new Error("Challenge already completed");
      }

      // Atomic conditional update/insert (race guard — the SELECT above is only a UX fast-path)
      let progressUpdated: boolean;
      if (existingProgress) {
        const updated = await ctx.db
          .update(userProgress)
          .set({
            status: "completed",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userProgress.id, existingProgress.id),
              ne(userProgress.status, "completed"),
            ),
          )
          .returning({ id: userProgress.id });
        progressUpdated = updated.length > 0;
      } else {
        const inserted = await ctx.db
          .insert(userProgress)
          .values({
            id: nanoid(),
            userId,
            challengeId,
            status: "completed",
            completedAt: new Date(),
          })
          .onConflictDoNothing()
          .returning({ id: userProgress.id });
        progressUpdated = inserted.length > 0;
      }

      if (!progressUpdated) {
        throw new Error("Challenge already completed");
      }

      // Only winners reach here — use xpTransaction count (authoritative source) to detect
      // the first challenge, read after the atomic write to minimise the race window
      const [completedTransactions] = await ctx.db
        .select({ count: count() })
        .from(userXpTransaction)
        .where(
          and(
            eq(userXpTransaction.userId, userId),
            eq(userXpTransaction.action, "challenge_completed"),
          ),
        );
      const isFirstChallenge = (completedTransactions?.count ?? 0) === 0;

      // Get current streak to calculate streak bonus
      const currentStreak = await calculateStreak(userId);

      // Calculate XP using XP service
      const xpGain = calculateXPGain({
        difficulty: challengeData.difficulty,
        isFirstChallenge,
        currentStreak,
      });

      // Atomically increment userXp — avoids lost-update races between concurrent winners
      const [updatedXp] = await ctx.db
        .insert(userXp)
        .values({ userId, totalXp: xpGain.total })
        .onConflictDoUpdate({
          target: userXp.userId,
          set: {
            totalXp: sql`${userXp.totalXp} + ${xpGain.total}`,
            updatedAt: new Date(),
          },
        })
        .returning({ totalXp: userXp.totalXp });
      const _newXp = updatedXp?.totalXp ?? xpGain.total;

      // Record base XP transaction
      await ctx.db.insert(userXpTransaction).values({
        userId,
        action: "challenge_completed",
        xpAmount: xpGain.baseXP,
        challengeId,
        description: `Completed ${challengeData.difficulty} challenge`,
      });

      // Record first challenge bonus transaction if applicable
      if (xpGain.firstChallengeBonus > 0) {
        await ctx.db.insert(userXpTransaction).values({
          userId,
          action: "first_challenge",
          xpAmount: xpGain.firstChallengeBonus,
          challengeId,
          description: "First challenge bonus",
        });
      }

      // Record streak bonus transaction if applicable
      if (xpGain.streakBonus > 0) {
        await ctx.db.insert(userXpTransaction).values({
          userId,
          action: "daily_streak",
          xpAmount: xpGain.streakBonus,
          challengeId,
          description: `${currentStreak} day streak bonus`,
        });
      }

      return {
        success: true,
        xpAwarded: xpGain.total,
        baseXp: xpGain.baseXP,
        bonusXp: xpGain.firstChallengeBonus + xpGain.streakBonus,
        streakBonus: xpGain.streakBonus,
        currentStreak,
        isFirstChallenge,
      };
    }),

  // Get challenge status for CLI
  getStatus: privateProcedure
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { slug } = input;

      // Find challenge by slug
      const [challengeData] = await ctx.db
        .select({ id: challenge.id })
        .from(challenge)
        .where(eq(challenge.slug, slug))
        .limit(1);

      if (!challengeData) {
        throw new Error("Challenge not found");
      }

      // Find user progress
      const [progress] = await ctx.db
        .select({
          status: userProgress.status,
          startedAt: userProgress.startedAt,
          completedAt: userProgress.completedAt,
        })
        .from(userProgress)
        .where(
          and(
            eq(userProgress.userId, userId),
            eq(userProgress.challengeId, challengeData.id),
          ),
        )
        .limit(1);

      if (!progress) {
        return {
          status: "not_started" as const,
        };
      }

      return {
        status: progress.status,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
      };
    }),

  // Start challenge for CLI
  startChallenge: privateProcedure
    .input(
      z.object({
        challengeSlug: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { challengeSlug } = input;

      // Find challenge by slug
      const [challengeData] = await ctx.db
        .select({ id: challenge.id, title: challenge.title })
        .from(challenge)
        .where(eq(challenge.slug, challengeSlug))
        .limit(1);

      if (!challengeData) {
        throw new Error("Challenge not found");
      }

      // Check if user progress already exists
      const [existingProgress] = await ctx.db
        .select({
          id: userProgress.id,
          status: userProgress.status,
          startedAt: userProgress.startedAt,
        })
        .from(userProgress)
        .where(
          and(
            eq(userProgress.userId, userId),
            eq(userProgress.challengeId, challengeData.id),
          ),
        )
        .limit(1);

      const now = new Date();

      if (existingProgress) {
        // Already completed
        if (existingProgress.status === "completed") {
          return {
            status: existingProgress.status,
            startedAt: existingProgress.startedAt,
            message: "Challenge already completed",
          };
        }

        // Update to in_progress if not_started
        if (existingProgress.status === "not_started") {
          await ctx.db
            .update(userProgress)
            .set({
              status: "in_progress",
              startedAt: now,
            })
            .where(eq(userProgress.id, existingProgress.id));

          // Track challenge started event in PostHog
          await trackChallengeStartedServer(
            userId,
            challengeData.id,
            challengeSlug,
            challengeData.title,
          );
        }

        return {
          status: "in_progress" as const,
          startedAt: existingProgress.startedAt,
        };
      }

      // Create new progress record
      await ctx.db.insert(userProgress).values({
        id: nanoid(),
        userId,
        challengeId: challengeData.id,
        status: "in_progress",
        startedAt: now,
      });

      // Track challenge started event in PostHog
      await trackChallengeStartedServer(
        userId,
        challengeData.id,
        challengeSlug,
        challengeData.title,
      );

      // Publish realtime event for onboarding UI update
      if (isRealtimeConfigured && realtime) {
        const channel = realtime.channel(`onboarding:${userId}`);
        await channel.emit("onboarding.stepCompleted", {
          step: "hasStartedChallenge" as const,
          timestamp: new Date(),
        });
      }

      return {
        status: "in_progress" as const,
        startedAt: now,
      };
    }),

  // Submit challenge with validation results from CLI
  // CLI sends raw CRD statuses, backend enriches with metadata from challengeObjective table
  submitChallenge: privateProcedure
    .input(
      z.object({
        challengeSlug: z.string(),
        // Simplified input: just the raw results from CRDs
        results: z.array(
          z.object({
            objectiveKey: z.string(), // CRD metadata.name
            passed: z.boolean(), // CRD status.allPassed
            message: z.string().optional(), // CRD status message
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { challengeSlug, results } = input;

      // Find challenge by slug
      const [challengeData] = await ctx.db
        .select({
          id: challenge.id,
          title: challenge.title,
          difficulty: challenge.difficulty,
        })
        .from(challenge)
        .where(eq(challenge.slug, challengeSlug))
        .limit(1);

      if (!challengeData) {
        throw new Error("Challenge not found");
      }

      // Check if already completed
      const [existingProgress] = await ctx.db
        .select({
          id: userProgress.id,
          status: userProgress.status,
          completedAt: userProgress.completedAt,
        })
        .from(userProgress)
        .where(
          and(
            eq(userProgress.userId, userId),
            eq(userProgress.challengeId, challengeData.id),
          ),
        )
        .limit(1);

      // Fast-path for intentional re-submissions; the atomic write below is the actual race guard
      if (existingProgress?.status === "completed") {
        throw new Error("Challenge already completed");
      }

      // Fetch objective metadata from challengeObjective table
      const objectiveMetadata = await ctx.db
        .select({
          objectiveKey: challengeObjective.objectiveKey,
          title: challengeObjective.title,
          description: challengeObjective.description,
          category: challengeObjective.category,
        })
        .from(challengeObjective)
        .where(eq(challengeObjective.challengeId, challengeData.id));

      // Create a map for quick lookup
      const metadataMap = new Map(
        objectiveMetadata.map((m) => [m.objectiveKey, m]),
      );

      // Security validation: ensure ALL registered objectives are present in the submission
      const expectedKeys = new Set(
        objectiveMetadata.map((m) => m.objectiveKey),
      );
      const submittedKeys = new Set(results.map((r) => r.objectiveKey));

      // Check for missing objectives (objectives in DB but not in submission)
      const missingKeys = [...expectedKeys].filter(
        (key) => !submittedKeys.has(key),
      );
      if (missingKeys.length > 0) {
        throw new Error(
          `Missing required objectives: ${missingKeys.join(", ")}`,
        );
      }

      // Check for unknown objectives (objectives in submission but not in DB)
      const unknownKeys = [...submittedKeys].filter(
        (key) => !expectedKeys.has(key),
      );
      if (unknownKeys.length > 0) {
        throw new Error(
          `Unknown objectives submitted: ${unknownKeys.join(", ")}`,
        );
      }

      // Enrich results with metadata and build objectives array for storage
      const objectives = results.map((result) => {
        const metadata = metadataMap.get(result.objectiveKey);
        return {
          id: result.objectiveKey,
          name: metadata?.title ?? result.objectiveKey,
          description: metadata?.description,
          passed: result.passed,
          category: metadata?.category ?? "status",
          message: result.message ?? "",
        };
      });

      // Determine if all objectives passed
      const validated = results.every((r) => r.passed);

      // Always store the submission (even if validation failed)
      await ctx.db.insert(userSubmission).values({
        id: nanoid(),
        userId,
        challengeId: challengeData.id,
        validated,
        objectives,
      });

      // Publish validation events to Upstash Realtime for real-time updates
      if (isRealtimeConfigured && realtime) {
        const channel = realtime.channel(`${userId}:${challengeSlug}`);
        for (const result of results) {
          await channel.emit("validation.update", {
            objectiveKey: result.objectiveKey,
            passed: result.passed,
            timestamp: new Date(),
          });
        }
      }

      // If validation failed, return with failed objectives info
      if (!validated) {
        const failedObjectives = objectives.filter((obj) => !obj.passed);

        // Track validation failure in PostHog
        await trackChallengeValidationFailedServer(
          userId,
          challengeData.id,
          challengeSlug,
          failedObjectives.length,
          failedObjectives.map((obj) => obj.id),
        );

        return {
          success: false,
          message: "Validation failed",
          failedObjectives: failedObjectives.map((obj) => ({
            id: obj.id,
            name: obj.name,
            message: obj.message,
          })),
        };
      }

      // Atomic conditional update/insert to prevent race conditions (double XP / duplicate analytics)
      let progressUpdated: boolean;
      if (existingProgress) {
        // Only update if not already completed — if RETURNING is empty, race was lost
        const updated = await ctx.db
          .update(userProgress)
          .set({
            status: "completed",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userProgress.id, existingProgress.id),
              ne(userProgress.status, "completed"),
            ),
          )
          .returning({ id: userProgress.id });
        progressUpdated = updated.length > 0;
      } else {
        // onConflictDoNothing + unique index catches concurrent inserts
        const inserted = await ctx.db
          .insert(userProgress)
          .values({
            id: nanoid(),
            userId,
            challengeId: challengeData.id,
            status: "completed",
            completedAt: new Date(),
          })
          .onConflictDoNothing()
          .returning({ id: userProgress.id });
        progressUpdated = inserted.length > 0;
      }

      // If a concurrent request already completed this challenge, skip XP and analytics
      if (!progressUpdated) {
        return {
          success: true,
          xpAwarded: 0,
          totalXp: 0,
          rank: null,
          rankUp: false,
          firstChallenge: false,
          streakBonus: 0,
          currentStreak: 0,
        };
      }

      // Only winners reach here — read isFirstChallenge from xpTransaction count (authoritative
      // source) *after* the atomic write, so concurrent winners for different challenges see each
      // other's committed transaction before awarding the first-challenge bonus
      const [completedTransactions] = await ctx.db
        .select({ count: count() })
        .from(userXpTransaction)
        .where(
          and(
            eq(userXpTransaction.userId, userId),
            eq(userXpTransaction.action, "challenge_completed"),
          ),
        );
      const isFirstChallenge = (completedTransactions?.count ?? 0) === 0;

      // Get current streak to calculate streak bonus
      const currentStreak = await calculateStreak(userId);

      // Calculate XP using XP service
      const xpGain = calculateXPGain({
        difficulty: challengeData.difficulty,
        isFirstChallenge,
        currentStreak,
      });

      // Submission details were already stored before validation check

      // Get old rank before XP update
      const oldRankInfo = await calculateLevel(userId);

      // Atomically increment userXp — avoids lost-update races between concurrent winners
      const [updatedXp] = await ctx.db
        .insert(userXp)
        .values({ userId, totalXp: xpGain.total })
        .onConflictDoUpdate({
          target: userXp.userId,
          set: {
            totalXp: sql`${userXp.totalXp} + ${xpGain.total}`,
            updatedAt: new Date(),
          },
        })
        .returning({ totalXp: userXp.totalXp });
      const newXp = updatedXp?.totalXp ?? xpGain.total;

      // Record base XP transaction
      await ctx.db.insert(userXpTransaction).values({
        userId,
        action: "challenge_completed",
        xpAmount: xpGain.baseXP,
        challengeId: challengeData.id,
        description: `Completed ${challengeData.difficulty} challenge`,
      });

      // Record first challenge bonus transaction if applicable
      if (xpGain.firstChallengeBonus > 0) {
        await ctx.db.insert(userXpTransaction).values({
          userId,
          action: "first_challenge",
          xpAmount: xpGain.firstChallengeBonus,
          challengeId: challengeData.id,
          description: "First challenge bonus",
        });
      }

      // Record streak bonus transaction if applicable
      if (xpGain.streakBonus > 0) {
        await ctx.db.insert(userXpTransaction).values({
          userId,
          action: "daily_streak",
          xpAmount: xpGain.streakBonus,
          challengeId: challengeData.id,
          description: `${currentStreak} day streak bonus`,
        });
      }

      // Get new rank after XP update
      const newRankInfo = await calculateLevel(userId);

      // Track challenge completed event in PostHog
      await trackChallengeCompletedServer(
        userId,
        challengeData.id,
        challengeSlug,
        challengeData.difficulty,
        xpGain.total,
        isFirstChallenge,
      );

      // Publish realtime event for onboarding UI update
      if (isRealtimeConfigured && realtime) {
        const onboardingChannel = realtime.channel(`onboarding:${userId}`);
        await onboardingChannel.emit("onboarding.stepCompleted", {
          step: "hasCompletedChallenge" as const,
          timestamp: new Date(),
        });
      }

      // Invalidate caches after successful completion
      revalidateTag(`user-${userId}-stats`, "max");
      revalidateTag(`user-${userId}-progress`, "max");
      revalidateTag(`user-${userId}-xp`, "max");
      revalidateTag(`user-${userId}-streak`, "max");
      revalidateTag(`challenge-${challengeSlug}`, "max");
      revalidateTag("challenges", "max");
      revalidateTag(`challenge-list-${userId}`, "max");

      return {
        success: true,
        xpAwarded: xpGain.total,
        totalXp: newXp,
        rank: newRankInfo.name,
        rankUp: oldRankInfo.name !== newRankInfo.name,
        firstChallenge: isFirstChallenge,
        streakBonus: xpGain.streakBonus,
        currentStreak,
      };
    }),

  // Reset challenge progress for CLI
  resetChallenge: privateProcedure
    .input(
      z.object({
        challengeSlug: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { challengeSlug } = input;

      // Find challenge by slug
      const [challengeData] = await ctx.db
        .select({
          id: challenge.id,
          title: challenge.title,
        })
        .from(challenge)
        .where(eq(challenge.slug, challengeSlug))
        .limit(1);

      if (!challengeData) {
        throw new Error("Challenge not found");
      }

      // Delete user progress, submissions, and XP transactions in parallel
      // (neon-http doesn't support transactions, but these are independent + idempotent)
      await all({
        async progress() {
          return ctx.db
            .delete(userProgress)
            .where(
              and(
                eq(userProgress.userId, userId),
                eq(userProgress.challengeId, challengeData.id),
              ),
            );
        },
        async submissions() {
          return ctx.db
            .delete(userSubmission)
            .where(
              and(
                eq(userSubmission.userId, userId),
                eq(userSubmission.challengeId, challengeData.id),
              ),
            );
        },
        async xpTransactions() {
          return ctx.db
            .delete(userXpTransaction)
            .where(
              and(
                eq(userXpTransaction.userId, userId),
                eq(userXpTransaction.challengeId, challengeData.id),
              ),
            );
        },
      });

      // Recalculate userXp.totalXp from remaining transactions
      const [xpResult] = await ctx.db
        .select({
          totalXp: sql<number>`COALESCE(SUM(${userXpTransaction.xpAmount}), 0)`,
        })
        .from(userXpTransaction)
        .where(eq(userXpTransaction.userId, userId));

      await ctx.db
        .update(userXp)
        .set({ totalXp: xpResult.totalXp })
        .where(eq(userXp.userId, userId));

      revalidateTag(`challenge-list-${userId}`, "max");
      revalidateTag("challenges", "max");
      revalidateTag(`user-${userId}-xp`, "max");
      revalidateTag(`user-${userId}-stats`, "max");

      return {
        success: true,
        message: "Challenge progress reset successfully",
      };
    }),

  /**
   * Get all submissions for a challenge by the current user
   */
  getSubmissions: privateProcedure
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get challenge ID from slug
      const [challengeData] = await ctx.db
        .select({ id: challenge.id })
        .from(challenge)
        .where(eq(challenge.slug, input.slug))
        .limit(1);

      if (!challengeData) {
        throw new Error("Challenge not found");
      }

      // Get all submissions for this challenge by this user, ordered by most recent first
      const submissions = await ctx.db
        .select()
        .from(userSubmission)
        .where(
          and(
            eq(userSubmission.userId, ctx.user.id),
            eq(userSubmission.challengeId, challengeData.id),
          ),
        )
        .orderBy(desc(userSubmission.timestamp));

      return {
        submissions,
      };
    }),

  /**
   * Get the latest validation status for a challenge
   * Returns the most recent submission's validation details
   */
  getLatestValidationStatus: privateProcedure
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get challenge ID from slug
      const [challengeData] = await ctx.db
        .select({ id: challenge.id })
        .from(challenge)
        .where(eq(challenge.slug, input.slug))
        .limit(1);

      if (!challengeData) {
        throw new Error("Challenge not found");
      }

      // Get the most recent submission for this challenge by this user
      const [latestSubmission] = await ctx.db
        .select({
          id: userSubmission.id,
          timestamp: userSubmission.timestamp,
          validated: userSubmission.validated,
          objectives: userSubmission.objectives,
        })
        .from(userSubmission)
        .where(
          and(
            eq(userSubmission.userId, ctx.user.id),
            eq(userSubmission.challengeId, challengeData.id),
          ),
        )
        .orderBy(desc(userSubmission.timestamp))
        .limit(1);

      if (!latestSubmission) {
        return {
          hasSubmission: false,
          objectives: null,
          timestamp: null,
          validated: false,
        };
      }

      const objectives = latestSubmission.objectives as Objective[] | null;

      return {
        hasSubmission: true,
        validated: latestSubmission.validated,
        objectives,
        timestamp: latestSubmission.timestamp,
      };
    }),
});
