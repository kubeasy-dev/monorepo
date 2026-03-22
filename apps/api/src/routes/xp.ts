import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/index";
import { challenge, userXpTransaction } from "../db/schema/index";
import { requireAuth } from "../middleware/session";

const xp = new Hono();

// GET /xp/history -- get last 20 XP transactions with challenge details
xp.get("/history", requireAuth, async (c) => {
  const user = c.get("user");
  const userId = user.id;

  const recentGains = await db
    .select({
      id: userXpTransaction.id,
      action: userXpTransaction.action,
      xpAmount: userXpTransaction.xpAmount,
      description: userXpTransaction.description,
      createdAt: userXpTransaction.createdAt,
      // Challenge details (may be null if transaction not related to a challenge)
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      challengeSlug: challenge.slug,
      challengeDifficulty: challenge.difficulty,
    })
    .from(userXpTransaction)
    .leftJoin(challenge, eq(userXpTransaction.challengeId, challenge.id))
    .where(eq(userXpTransaction.userId, userId))
    .orderBy(desc(userXpTransaction.createdAt))
    .limit(20);

  return c.json(recentGains);
});

export { xp };
