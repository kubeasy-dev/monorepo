import { ChallengeDifficultySchema } from "@kubeasy/api-schemas/challenges";
import type { Objective } from "@kubeasy/api-schemas/objectives";
import { ObjectiveSchema } from "@kubeasy/api-schemas/objectives";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db/index";
import {
  challenge,
  challengeObjective,
  challengeTheme,
  challengeType,
} from "../../db/schema/index";
import { captureServerException } from "../../lib/analytics-server";

// Schema for a single challenge in the sync request
const challengeSyncSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  theme: z.string().min(1),
  difficulty: ChallengeDifficultySchema,
  type: z.string().min(1),
  estimatedTime: z.number().int().positive(),
  initialSituation: z.string().min(1),
  objectives: z.array(ObjectiveSchema),
});

const syncRequestSchema = z.object({
  challenges: z.array(challengeSyncSchema),
});

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
