import { zValidator } from "@hono/zod-validator";
import { ChallengeFiltersSchema } from "@kubeasy/api-schemas/challenges";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/index";
import { challengeMetadata, userProgress } from "../db/schema/index";
import { cached, cacheKey, TTL } from "../lib/cache";
import {
  getChallenge,
  getChallengeManifests,
  getChallengeYaml,
  getMeta,
  listChallenges,
} from "../lib/registry";
import type { AppEnv } from "../middleware/session";

const challenges = new Hono<AppEnv>();

// GET /challenges -- list with filters (proxied from registry, enriched with DB progress + metadata)
challenges.get("/", zValidator("query", ChallengeFiltersSchema), async (c) => {
  const user = c.get("user");
  const userId = user?.id;
  const { difficulty, type, theme, search, showCompleted } =
    c.req.valid("query");

  const key = cacheKey(`u:${userId ?? "anon"}:challenges:list`, {
    difficulty,
    type,
    theme,
    search,
    showCompleted: String(showCompleted),
  });

  const result = await cached(key, TTL.PUBLIC, async () => {
    const [registryList, meta, metadataRows, completedCountRows] =
      await Promise.all([
        listChallenges(),
        getMeta(),
        db.select().from(challengeMetadata),
        db
          .select({
            challengeSlug: userProgress.challengeSlug,
            count: sql<number>`CAST(COUNT(DISTINCT ${userProgress.userId}) AS INTEGER)`,
          })
          .from(userProgress)
          .where(eq(userProgress.status, "completed"))
          .groupBy(userProgress.challengeSlug),
      ]);

    const userProgressRows = userId
      ? await db
          .select({
            challengeSlug: userProgress.challengeSlug,
            status: userProgress.status,
          })
          .from(userProgress)
          .where(eq(userProgress.userId, userId))
      : [];

    const themeMap = new Map(meta.themes.map((t) => [t.slug, t]));
    const typeMap = new Map(meta.types.map((t) => [t.slug, t]));
    const metadataMap = new Map(metadataRows.map((m) => [m.slug, m]));
    const userStatusMap = new Map(
      userProgressRows.map((p) => [p.challengeSlug, p.status]),
    );
    const completedCountMap = new Map(
      completedCountRows.map((r) => [r.challengeSlug, r.count]),
    );

    const list = registryList
      .filter((ch) => {
        const m = metadataMap.get(ch.slug);
        if (m && !m.available) return false;
        if (difficulty && ch.difficulty !== difficulty) return false;
        if (type && ch.type !== type) return false;
        if (theme && ch.theme !== theme) return false;
        if (search && !ch.title.toLowerCase().includes(search.toLowerCase()))
          return false;
        if (
          showCompleted === false &&
          userStatusMap.get(ch.slug) === "completed"
        )
          return false;
        return true;
      })
      .map((ch) => {
        const themeDef = themeMap.get(ch.theme);
        const typeDef = typeMap.get(ch.type);
        const m = metadataMap.get(ch.slug);
        return {
          slug: ch.slug,
          title: ch.title,
          description: ch.description,
          theme: themeDef?.name ?? ch.theme,
          themeSlug: ch.theme,
          difficulty: ch.difficulty,
          type: typeDef?.name ?? ch.type,
          typeSlug: ch.type,
          estimatedTime: ch.estimatedTime,
          initialSituation: ch.initialSituation,
          ofTheWeek: m?.ofTheWeek ?? false,
          completedCount: completedCountMap.get(ch.slug) ?? 0,
          userStatus: userId
            ? (userStatusMap.get(ch.slug) ?? "not_started")
            : null,
        };
      });

    return { challenges: list, count: list.length };
  });

  return c.json(result);
});

// GET /challenges/meta -- registry meta (themes, types)
challenges.get("/meta", async (c) => {
  return c.json(await getMeta());
});

// GET /challenges/:slug -- challenge detail
challenges.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const challengeItem = await cached(
    cacheKey("challenges:detail", { slug }),
    TTL.PUBLIC,
    async () => {
      const [detail, meta, rows] = await Promise.all([
        getChallenge(slug),
        getMeta(),
        db
          .select()
          .from(challengeMetadata)
          .where(eq(challengeMetadata.slug, slug))
          .limit(1),
      ]);
      if (!detail) return null;
      const m = rows[0] ?? null;
      const available = m?.available ?? true;
      if (!available) return null;
      const themeDef = meta.themes.find((t) => t.slug === detail.theme);
      const typeDef = meta.types.find((t) => t.slug === detail.type);
      return {
        slug: detail.slug,
        title: detail.title,
        description: detail.description,
        theme: themeDef?.name ?? detail.theme,
        themeSlug: detail.theme,
        difficulty: detail.difficulty,
        type: typeDef?.name ?? detail.type,
        typeSlug: detail.type,
        estimatedTime: detail.estimatedTime,
        initialSituation: detail.initialSituation,
        ofTheWeek: m?.ofTheWeek ?? false,
        available,
        starterFriendly: m?.starterFriendly ?? false,
      };
    },
  );

  return c.json({ challenge: challengeItem });
});

// GET /challenges/:slug/objectives -- challenge objectives from registry
challenges.get("/:slug/objectives", async (c) => {
  const slug = c.req.param("slug");

  const result = await cached(
    cacheKey("challenges:objectives", { slug }),
    TTL.PUBLIC,
    async () => {
      const [detail, rows] = await Promise.all([
        getChallenge(slug),
        db
          .select()
          .from(challengeMetadata)
          .where(eq(challengeMetadata.slug, slug))
          .limit(1),
      ]);
      const m = rows[0] ?? null;
      const available = m?.available ?? true;
      if (!detail || !available) {
        return { objectives: [] as any[] };
      }
      const objectives = (detail.objectives ?? []).map((o) => ({
        objectiveKey: o.key,
        title: o.title,
        description: o.description,
        category: o.type,
        displayOrder: o.order,
      }));
      return { objectives };
    },
  );

  return c.json(result);
});

// GET /challenges/:slug/yaml -- proxy challenge.yaml from registry
challenges.get("/:slug/yaml", async (c) => {
  const slug = c.req.param("slug");
  try {
    const yaml = await getChallengeYaml(slug);
    return c.text(yaml);
  } catch (_err) {
    return c.json({ error: "Challenge not found" }, 404);
  }
});

// GET /challenges/:slug/manifests -- proxy manifests tar.gz from registry
challenges.get("/:slug/manifests", async (c) => {
  const slug = c.req.param("slug");
  try {
    const res = await getChallengeManifests(slug);
    if (!res.body) {
      return c.json({ error: "Empty response from registry" }, 502);
    }
    // Forward the content-type and body
    c.header(
      "Content-Type",
      res.headers.get("Content-Type") || "application/gzip",
    );
    return c.body(res.body);
  } catch (_err) {
    return c.json({ error: "Challenge manifests not found" }, 404);
  }
});

export { challenges };
