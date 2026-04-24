import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/index";
import { userXpTransaction } from "../db/schema/index";
import { hydrateChallenges } from "../lib/registry";
import { requireAuth } from "../middleware/session";

const xp = new Hono();

// GET /xp/history -- get last 20 XP transactions, enriched with challenge title/difficulty from registry
xp.get("/history", requireAuth, async (c) => {
  const user = c.get("user");
  const userId = user.id;

  const transactions = await db
    .select({
      id: userXpTransaction.id,
      action: userXpTransaction.action,
      xpAmount: userXpTransaction.xpAmount,
      description: userXpTransaction.description,
      createdAt: userXpTransaction.createdAt,
      challengeSlug: userXpTransaction.challengeSlug,
    })
    .from(userXpTransaction)
    .where(eq(userXpTransaction.userId, userId))
    .orderBy(desc(userXpTransaction.createdAt))
    .limit(20);

  // Hydrate challenge details from registry (cached)
  const slugs = [
    ...new Set(
      transactions
        .map((t) => t.challengeSlug)
        .filter((s): s is string => s !== null),
    ),
  ];
  const challengeMap = await hydrateChallenges(slugs);

  const recentGains = transactions.map((t) => {
    const ch = t.challengeSlug ? challengeMap.get(t.challengeSlug) : null;
    return {
      id: t.id,
      action: t.action,
      xpAmount: t.xpAmount,
      description: t.description,
      createdAt: t.createdAt,
      challengeSlug: t.challengeSlug,
      challengeTitle: ch?.title ?? null,
      challengeDifficulty: ch?.difficulty ?? null,
    };
  });

  return c.json(recentGains);
});

export { xp };
