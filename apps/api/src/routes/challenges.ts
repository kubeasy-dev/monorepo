import { zValidator } from "@hono/zod-validator";
import { and, eq, ilike, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/index";
import {
  challenge,
  challengeObjective,
  challengeTheme,
  challengeType,
  userProgress,
} from "../db/schema/index";
import type { AppEnv } from "../middleware/session";
import { challengeFiltersSchema } from "../schemas/index";

const challenges = new Hono<AppEnv>();

// GET /challenges -- list with filters
challenges.get("/", zValidator("query", challengeFiltersSchema), async (c) => {
  const user = c.get("user");
  const userId = user?.id;

  const { difficulty, type, theme, search, showCompleted } =
    c.req.valid("query");

  const filters = [eq(challenge.available, true)];

  if (difficulty) {
    filters.push(eq(challenge.difficulty, difficulty));
  }
  if (type) {
    filters.push(eq(challenge.typeSlug, type));
  }
  if (theme) {
    filters.push(eq(challenge.theme, theme));
  }
  if (search) {
    filters.push(ilike(challenge.title, `%${search}%`));
  }

  // Build conditions for userProgress join
  const userProgressConditions = userId
    ? and(
        eq(challenge.id, userProgress.challengeId),
        eq(userProgress.userId, userId),
      )
    : eq(challenge.id, userProgress.challengeId);

  if (showCompleted === false && userId) {
    const completedChallenges = await db
      .select({ challengeId: userProgress.challengeId })
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.status, "completed"),
        ),
      );

    const completedChallengeIds = completedChallenges.map((r) => r.challengeId);

    if (completedChallengeIds.length > 0) {
      filters.push(
        sql`${challenge.id} NOT IN (${sql.join(
          completedChallengeIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );
    }
  }

  const results = await db
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

  return c.json({ challenges: results, count: results.length });
});

// GET /challenges/:slug -- challenge detail
challenges.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const [challengeItem] = await db
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
      available: challenge.available,
      starterFriendly: challenge.starterFriendly,
      createdAt: challenge.createdAt,
      updatedAt: challenge.updatedAt,
    })
    .from(challenge)
    .innerJoin(challengeTheme, eq(challenge.theme, challengeTheme.slug))
    .innerJoin(challengeType, eq(challenge.typeSlug, challengeType.slug))
    .where(eq(challenge.slug, slug))
    .limit(1);

  if (!challengeItem) {
    return c.json({ challenge: null });
  }

  if (!challengeItem.available) {
    return c.json({ challenge: null });
  }

  return c.json({ challenge: challengeItem });
});

// GET /challenges/:slug/objectives -- challenge objectives ordered by displayOrder
challenges.get("/:slug/objectives", async (c) => {
  const slug = c.req.param("slug");

  const [challengeItem] = await db
    .select({
      id: challenge.id,
      available: challenge.available,
    })
    .from(challenge)
    .where(eq(challenge.slug, slug))
    .limit(1);

  if (!challengeItem || !challengeItem.available) {
    return c.json({ objectives: [] });
  }

  const objectives = await db
    .select({
      id: challengeObjective.id,
      objectiveKey: challengeObjective.objectiveKey,
      title: challengeObjective.title,
      description: challengeObjective.description,
      category: challengeObjective.category,
      displayOrder: challengeObjective.displayOrder,
    })
    .from(challengeObjective)
    .where(eq(challengeObjective.challengeId, challengeItem.id))
    .orderBy(challengeObjective.displayOrder);

  return c.json({ objectives });
});

export { challenges };
