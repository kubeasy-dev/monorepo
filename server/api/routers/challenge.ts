import { and, eq, ilike, sql } from "drizzle-orm";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { z } from "zod";
import type { ChallengeFilters } from "@/schemas/challengeFilters";
import { challengeFiltersSchema } from "@/schemas/challengeFilters";
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "@/server/api/trpc";
import db from "@/server/db";
import { getChallengeBySlug, getThemeBySlug } from "@/server/db/queries";
import {
  challenge,
  challengeDifficultyEnum,
  challengeObjective,
  challengeTheme,
  challengeType,
  userProgress,
  userSubmission,
} from "@/server/db/schema";

async function fetchChallengeList(
  userId: string | undefined,
  input: ChallengeFilters,
) {
  "use cache";
  cacheLife("hours");
  cacheTag("challenges");
  if (userId) {
    cacheTag(`challenge-list-${userId}`);
  }

  const filters = [eq(challenge.available, true)];
  if (input.difficulty) {
    filters.push(eq(challenge.difficulty, input.difficulty));
  }
  if (input.type) {
    filters.push(eq(challenge.typeSlug, input.type));
  }
  if (input.theme) {
    filters.push(eq(challenge.theme, input.theme));
  }
  if (input.search) {
    filters.push(ilike(challenge.title, `%${input.search}%`));
  }

  // Build conditions for userProgress join
  const userProgressConditions = userId
    ? and(
        eq(challenge.id, userProgress.challengeId),
        eq(userProgress.userId, userId),
      )
    : eq(challenge.id, userProgress.challengeId);

  if (input.showCompleted === false && userId) {
    const completedChallenges = await db
      .select({ challengeId: userProgress.challengeId })
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.status, "completed"),
        ),
      );

    const completedChallengeIds = completedChallenges.map((c) => c.challengeId);

    if (completedChallengeIds.length > 0) {
      filters.push(
        sql`${challenge.id} NOT IN (${sql.join(
          completedChallengeIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );
    }
  }

  const challenges = await db
    .select({
      id: challenge.id,
      slug: challenge.slug,
      title: challenge.title,
      description: challenge.description,
      theme: challengeTheme.name,
      themeSlug: challenge.theme,
      difficulty: challenge.difficulty,
      type: challengeType.name,
      typeSlug: challenge.typeSlug,
      estimatedTime: challenge.estimatedTime,
      initialSituation: challenge.initialSituation,
      ofTheWeek: challenge.ofTheWeek,
      createdAt: challenge.createdAt,
      updatedAt: challenge.updatedAt,
      completedCount: sql<number>`CAST(COUNT(CASE WHEN ${userProgress.status} = 'completed' THEN 1 END) AS INTEGER)`,
      userStatus: userId
        ? sql<string>`COALESCE(MAX(CASE WHEN ${userProgress.userId} = ${userId} THEN ${userProgress.status} END), 'not_started')`
        : sql<null>`NULL`,
    })
    .from(challenge)
    .innerJoin(challengeTheme, eq(challenge.theme, challengeTheme.slug))
    .innerJoin(challengeType, eq(challenge.typeSlug, challengeType.slug))
    .leftJoin(userProgress, userProgressConditions)
    .where(and(...filters))
    .groupBy(challenge.id, challengeTheme.name, challengeType.name);

  return {
    challenges,
    count: challenges.length,
  };
}

export const challengeRouter = createTRPCRouter({
  list: publicProcedure
    .input(challengeFiltersSchema)
    .query(async ({ ctx, input }) => {
      return fetchChallengeList(ctx.user?.id, input);
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const challengeData = await getChallengeBySlug(input.slug);
      // Return null for unavailable challenges so the page 404s
      if (challengeData && !challengeData.available) {
        return { challenge: null };
      }
      return { challenge: challengeData };
    }),

  create: adminProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1),
        theme: z.string().min(1),
        difficulty: z.enum(challengeDifficultyEnum.enumValues),
        estimatedTime: z.number().int().positive(),
        initialSituation: z.string().min(1),
        ofTheWeek: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if theme exists
      const themeExists = await getThemeBySlug(input.theme);

      if (!themeExists) {
        throw new Error(`Theme with slug "${input.theme}" does not exist`);
      }

      // Check if a challenge with this slug already exists
      const existing = await getChallengeBySlug(input.slug);

      if (existing) {
        // Upsert: Update existing challenge
        const [updated] = await ctx.db
          .update(challenge)
          .set({
            title: input.title,
            description: input.description,
            theme: input.theme,
            difficulty: input.difficulty,
            estimatedTime: input.estimatedTime,
            initialSituation: input.initialSituation,
            ofTheWeek: input.ofTheWeek,
          })
          .where(eq(challenge.slug, input.slug))
          .returning();

        revalidateTag("challenges", "max");

        return {
          success: true,
          challenge: updated,
          action: "updated" as const,
        };
      }

      // Insert new challenge
      const [created] = await ctx.db
        .insert(challenge)
        .values({
          slug: input.slug,
          title: input.title,
          description: input.description,
          theme: input.theme,
          difficulty: input.difficulty,
          estimatedTime: input.estimatedTime,
          initialSituation: input.initialSituation,
          ofTheWeek: input.ofTheWeek,
        })
        .returning();

      revalidateTag("challenges", "max");

      return {
        success: true,
        challenge: created,
        action: "created" as const,
      };
    }),

  delete: adminProcedure
    .input(
      z.object({
        slug: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if challenge exists
      const existing = await getChallengeBySlug(input.slug);

      if (!existing) {
        throw new Error(`Challenge with slug "${input.slug}" does not exist`);
      }

      // Delete the challenge (cascading will handle related records)
      await ctx.db.delete(challenge).where(eq(challenge.slug, input.slug));

      revalidateTag("challenges", "max");

      return {
        success: true,
        message: `Challenge "${input.slug}" has been deleted`,
      };
    }),

  adminList: adminProcedure.query(async ({ ctx }) => {
    const challenges = await ctx.db
      .select({
        id: challenge.id,
        slug: challenge.slug,
        title: challenge.title,
        difficulty: challenge.difficulty,
        theme: challengeTheme.name,
        type: challengeType.name,
        available: challenge.available,
        ofTheWeek: challenge.ofTheWeek,
        createdAt: challenge.createdAt,
        starts: sql<number>`CAST(COUNT(DISTINCT CASE WHEN ${userProgress.status} != 'not_started' THEN ${userProgress.userId} END) AS INTEGER)`,
        completions: sql<number>`CAST(COUNT(DISTINCT CASE WHEN ${userProgress.status} = 'completed' THEN ${userProgress.userId} END) AS INTEGER)`,
        totalSubmissions: sql<number>`CAST(COUNT(DISTINCT ${userSubmission.id}) AS INTEGER)`,
        successfulSubmissions: sql<number>`CAST(COUNT(DISTINCT CASE WHEN ${userSubmission.validated} = true THEN ${userSubmission.id} END) AS INTEGER)`,
      })
      .from(challenge)
      .innerJoin(challengeTheme, eq(challenge.theme, challengeTheme.slug))
      .innerJoin(challengeType, eq(challenge.typeSlug, challengeType.slug))
      .leftJoin(userProgress, eq(challenge.id, userProgress.challengeId))
      .leftJoin(userSubmission, eq(challenge.id, userSubmission.challengeId))
      .groupBy(challenge.id, challengeTheme.name, challengeType.name)
      .orderBy(challenge.createdAt);

    return { challenges };
  }),

  adminStats: adminProcedure.query(async ({ ctx }) => {
    const [submissionStats] = await ctx.db
      .select({
        total: sql<number>`CAST(COUNT(*) AS INTEGER)`,
        successful: sql<number>`CAST(COUNT(CASE WHEN ${userSubmission.validated} = true THEN 1 END) AS INTEGER)`,
      })
      .from(userSubmission);

    const [progressStats] = await ctx.db
      .select({
        totalStarts: sql<number>`CAST(COUNT(CASE WHEN ${userProgress.status} != 'not_started' THEN 1 END) AS INTEGER)`,
        totalCompletions: sql<number>`CAST(COUNT(CASE WHEN ${userProgress.status} = 'completed' THEN 1 END) AS INTEGER)`,
      })
      .from(userProgress);

    const totalSubmissions = submissionStats?.total ?? 0;
    const successfulSubmissions = submissionStats?.successful ?? 0;
    const totalStarts = progressStats?.totalStarts ?? 0;
    const totalCompletions = progressStats?.totalCompletions ?? 0;

    return {
      totalSubmissions,
      successfulSubmissions,
      successRate:
        totalSubmissions > 0
          ? Math.round((successfulSubmissions / totalSubmissions) * 100)
          : 0,
      totalStarts,
      totalCompletions,
      completionRate:
        totalStarts > 0
          ? Math.round((totalCompletions / totalStarts) * 100)
          : 0,
    };
  }),

  setAvailability: adminProcedure
    .input(z.object({ slug: z.string(), available: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(challenge)
        .set({ available: input.available })
        .where(eq(challenge.slug, input.slug));

      revalidateTag("challenges", "max");

      return { success: true };
    }),

  /**
   * Get objectives for a challenge by its slug.
   * Returns the list of validation objectives that must be completed.
   * Used by frontend to display the "todo list" checklist.
   */
  getObjectives: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      // First get the challenge to ensure it exists and get its ID
      const challengeData = await getChallengeBySlug(input.slug);

      if (!challengeData || !challengeData.available) {
        return { objectives: [] };
      }

      // Fetch objectives ordered by displayOrder
      const objectives = await ctx.db
        .select({
          id: challengeObjective.id,
          objectiveKey: challengeObjective.objectiveKey,
          title: challengeObjective.title,
          description: challengeObjective.description,
          category: challengeObjective.category,
          displayOrder: challengeObjective.displayOrder,
        })
        .from(challengeObjective)
        .where(eq(challengeObjective.challengeId, challengeData.id))
        .orderBy(challengeObjective.displayOrder);

      return { objectives };
    }),
});
