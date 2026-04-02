import type { Objective } from "@kubeasy/api-schemas/objectives";
import { and, asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db/index";
import {
  challenge,
  challengeObjective,
  challengeTheme,
  challengeType,
  userProgress,
} from "../../db/schema/index";
import { captureServerException } from "../../lib/analytics-server";
import { cacheDelPattern, cacheKey, cacheSet, TTL } from "../../lib/cache";
import { syncRequestSchema } from "../../schemas/sync";

/**
 * Syncs objectives for a challenge.
 * Strategy: delete all existing objectives and insert new ones.
 */
async function syncChallengeObjectives(
  challengeId: number,
  objectives: Objective[],
): Promise<void> {
  await db
    .delete(challengeObjective)
    .where(eq(challengeObjective.challengeId, challengeId));

  if (objectives.length > 0) {
    await db.insert(challengeObjective).values(
      objectives.map((obj) => ({
        challengeId,
        objectiveKey: obj.key,
        title: obj.title,
        description: obj.description,
        category: obj.type,
        displayOrder: obj.order,
      })),
    );
  }
}

/**
 * Re-populates the Redis cache after a sync.
 * Runs fire-and-forget so it doesn't block the sync response.
 */
async function warmCacheAfterSync(): Promise<void> {
  // Warm themes list + per-slug
  const allThemes = await db
    .select()
    .from(challengeTheme)
    .orderBy(asc(challengeTheme.name));
  await Promise.all([
    cacheSet(cacheKey("themes:list"), allThemes, TTL.STATIC),
    ...allThemes.map((t) =>
      cacheSet(cacheKey("themes:detail", { slug: t.slug }), t, TTL.STATIC),
    ),
  ]);

  // Warm types list + per-slug
  const allTypes = await db
    .select()
    .from(challengeType)
    .orderBy(asc(challengeType.name));
  await Promise.all([
    cacheSet(cacheKey("types:list"), allTypes, TTL.STATIC),
    ...allTypes.map((t) =>
      cacheSet(cacheKey("types:detail", { slug: t.slug }), t, TTL.STATIC),
    ),
  ]);

  // Warm challenge detail + objectives for all available challenges
  const availableChallenges = await db
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
    .where(eq(challenge.available, true));

  await Promise.all(
    availableChallenges.map(async (ch) => {
      await cacheSet(
        cacheKey("challenges:detail", { slug: ch.slug }),
        ch,
        TTL.PUBLIC,
      );

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
        .where(eq(challengeObjective.challengeId, ch.id))
        .orderBy(challengeObjective.displayOrder);

      await cacheSet(
        cacheKey("challenges:objectives", { slug: ch.slug }),
        { objectives },
        TTL.PUBLIC,
      );
    }),
  );

  // Warm the anonymous challenge list (no filters, all challenges)
  const anonList = await db
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
      userStatus: sql<null>`NULL`,
    })
    .from(challenge)
    .innerJoin(challengeTheme, eq(challenge.theme, challengeTheme.slug))
    .innerJoin(challengeType, eq(challenge.typeSlug, challengeType.slug))
    .leftJoin(userProgress, eq(challenge.id, userProgress.challengeId))
    .where(and(eq(challenge.available, true)))
    .groupBy(challenge.id, challengeTheme.name, challengeType.name)
    .orderBy(asc(challenge.createdAt));

  await cacheSet(
    cacheKey("u:anon:challenges:list", { showCompleted: "undefined" }),
    { challenges: anonList, count: anonList.length },
    TTL.PUBLIC,
  );
}

export const challengesSync = new Hono();

/**
 * POST /admin/challenges/sync
 * Synchronizes challenges from the request body.
 * Requires API key auth + admin role (enforced by parent router).
 */
challengesSync.post("/", async (c) => {
  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON in request body" }, 400);
    }

    const parsed = syncRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid request body", details: parsed.error.issues },
        400,
      );
    }

    const { challenges: incomingChallenges } = parsed.data;

    // Validate themes exist
    const uniqueThemes = [...new Set(incomingChallenges.map((c) => c.theme))];
    const existingThemes = await db
      .select({ slug: challengeTheme.slug })
      .from(challengeTheme);
    const existingThemeSlugs = new Set(existingThemes.map((t) => t.slug));
    const missingThemes = uniqueThemes.filter(
      (theme) => !existingThemeSlugs.has(theme),
    );
    if (missingThemes.length > 0) {
      return c.json(
        {
          error: "Invalid themes",
          details: `The following themes do not exist: ${missingThemes.join(", ")}`,
        },
        400,
      );
    }

    // Validate types exist
    const uniqueTypes = [...new Set(incomingChallenges.map((c) => c.type))];
    const existingTypes = await db
      .select({ slug: challengeType.slug })
      .from(challengeType);
    const existingTypeSlugs = new Set(existingTypes.map((t) => t.slug));
    const missingTypes = uniqueTypes.filter(
      (type) => !existingTypeSlugs.has(type),
    );
    if (missingTypes.length > 0) {
      return c.json(
        {
          error: "Invalid types",
          details: `The following types do not exist: ${missingTypes.join(", ")}`,
        },
        400,
      );
    }

    const existingChallenges = await db.select().from(challenge);
    const existingChallengeMap = new Map(
      existingChallenges.map((c) => [c.slug, c]),
    );
    const incomingChallengeMap = new Map(
      incomingChallenges.map((c) => [c.slug, c]),
    );

    const created: string[] = [];
    const updated: string[] = [];
    const deleted: string[] = [];

    for (const incoming of incomingChallenges) {
      const existing = existingChallengeMap.get(incoming.slug);

      if (!existing) {
        const [inserted] = await db
          .insert(challenge)
          .values({
            slug: incoming.slug,
            title: incoming.title,
            description: incoming.description,
            theme: incoming.theme,
            difficulty: incoming.difficulty,
            typeSlug: incoming.type,
            estimatedTime: incoming.estimatedTime,
            initialSituation: incoming.initialSituation,
          })
          .returning({ id: challenge.id });

        await syncChallengeObjectives(inserted.id, incoming.objectives);
        created.push(incoming.slug);
      } else {
        const needsUpdate =
          existing.title !== incoming.title ||
          existing.description !== incoming.description ||
          existing.theme !== incoming.theme ||
          existing.difficulty !== incoming.difficulty ||
          existing.typeSlug !== incoming.type ||
          existing.estimatedTime !== incoming.estimatedTime ||
          existing.initialSituation !== incoming.initialSituation;

        if (needsUpdate) {
          await db
            .update(challenge)
            .set({
              title: incoming.title,
              description: incoming.description,
              theme: incoming.theme,
              difficulty: incoming.difficulty,
              typeSlug: incoming.type,
              estimatedTime: incoming.estimatedTime,
              initialSituation: incoming.initialSituation,
            })
            .where(eq(challenge.slug, incoming.slug));
          updated.push(incoming.slug);
        }

        // Always re-sync objectives (source of truth)
        await syncChallengeObjectives(existing.id, incoming.objectives);
      }
    }

    for (const existing of existingChallenges) {
      if (!incomingChallengeMap.has(existing.slug)) {
        await db.delete(challenge).where(eq(challenge.slug, existing.slug));
        deleted.push(existing.slug);
      }
    }

    // Flush stale caches then warm up immediately (fire-and-forget)
    Promise.all([
      cacheDelPattern("cache:challenges:*"),
      cacheDelPattern("cache:themes:*"),
      cacheDelPattern("cache:types:*"),
    ])
      .then(() => warmCacheAfterSync())
      .catch((err) => {
        console.error("[challenges-sync] cache warm-up failed", err);
      });

    return c.json({
      success: true,
      created: created.length,
      updated: updated.length,
      deleted: deleted.length,
      details: { created, updated, deleted },
    });
  } catch (error) {
    await captureServerException(error, undefined, {
      operation: "admin.challenge.sync",
    });
    return c.json({ error: "Internal server error" }, 500);
  }
});
