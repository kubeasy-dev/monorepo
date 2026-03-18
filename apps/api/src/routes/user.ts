import { zValidator } from "@hono/zod-validator";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { user } from "../db/schema/auth.js";
import {
  userProgress,
  userXp,
  userXpTransaction,
} from "../db/schema/challenge.js";
import { requireAuth } from "../middleware/session.js";
import { calculateLevel, calculateStreak } from "../services/xp/index.js";

const updateNameSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
});

const userRouter = new Hono();

// GET /user/xp -- get XP earned and rank info
userRouter.get("/xp", requireAuth, async (c) => {
  const sessionUser = c.get("user");
  const userId = sessionUser.id;

  // Get total XP from transactions (source of truth)
  const result = await db
    .select({
      totalXp: sql<number>`COALESCE(SUM(${userXpTransaction.xpAmount}), 0)`,
    })
    .from(userXpTransaction)
    .where(eq(userXpTransaction.userId, userId));

  const xpEarned = result[0]?.totalXp ?? 0;

  // Use calculateLevel to get rank info
  const rankInfo = await calculateLevel(userId);

  return c.json({
    xpEarned,
    rank: rankInfo.name,
    rankInfo,
  });
});

// GET /user/streak -- get current streak count
userRouter.get("/streak", requireAuth, async (c) => {
  const sessionUser = c.get("user");
  const userId = sessionUser.id;

  const streak = await calculateStreak(userId);

  return c.json({
    currentStreak: streak,
    lastActivityDate: null,
  });
});

// PATCH /user/name -- update user name
userRouter.patch(
  "/name",
  requireAuth,
  zValidator("json", updateNameSchema),
  async (c) => {
    const sessionUser = c.get("user");
    const userId = sessionUser.id;
    const { firstName, lastName } = c.req.valid("json");

    const fullName = lastName ? `${firstName} ${lastName}` : firstName;

    await db.update(user).set({ name: fullName }).where(eq(user.id, userId));

    return c.json({ success: true, name: fullName });
  },
);

// DELETE /user/progress -- delete ALL user progress, XP, and transactions
userRouter.delete("/progress", requireAuth, async (c) => {
  const sessionUser = c.get("user");
  const userId = sessionUser.id;

  // Delete all user progress, XP transactions, and XP record in parallel
  const [deletedProgress, deletedTransactions] = await Promise.all([
    db.delete(userProgress).where(eq(userProgress.userId, userId)).returning(),
    db
      .delete(userXpTransaction)
      .where(eq(userXpTransaction.userId, userId))
      .returning(),
    db.delete(userXp).where(eq(userXp.userId, userId)),
  ]);

  const deletedXp = deletedTransactions.reduce((sum, t) => sum + t.xpAmount, 0);

  return c.json({
    success: true,
    deletedChallenges: deletedProgress.length,
    deletedXp,
  });
});

export { userRouter as user };
