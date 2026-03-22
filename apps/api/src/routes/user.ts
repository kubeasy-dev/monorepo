import { zValidator } from "@hono/zod-validator";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { Resend } from "resend";
import { z } from "zod";
import { db } from "../db/index";
import { user } from "../db/schema/auth";
import {
  userProgress,
  userXp,
  userXpTransaction,
} from "../db/schema/challenge";
import { requireAuth } from "../middleware/session";
import { calculateLevel, calculateStreak } from "../services/xp/index";

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

// GET /user/email-topics -- list Resend topics with per-user subscription status
userRouter.get("/email-topics", requireAuth, async (c) => {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return c.json([]);

  const resend = new Resend(resendKey);
  const topicsResponse = await resend.topics.list();
  if (!topicsResponse.data?.data || topicsResponse.error) return c.json([]);

  const topics = topicsResponse.data.data.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description ?? null,
    defaultSubscription: t.default_subscription,
    subscribed: t.default_subscription === "opt_in",
  }));

  if (topics.length === 0) return c.json([]);

  const sessionUser = c.get("user");
  const rows = await db
    .select({ resendContactId: user.resendContactId })
    .from(user)
    .where(eq(user.id, sessionUser.id));
  const resendContactId = rows[0]?.resendContactId;

  if (!resendContactId) return c.json(topics);

  try {
    const contactTopics = await resend.contacts.topics.list({
      id: resendContactId,
    });
    if (!contactTopics.data?.data) return c.json(topics);

    const subMap = new Map(
      contactTopics.data.data.map((t) => [t.id, t.subscription === "opt_in"]),
    );
    return c.json(
      topics.map((t) => ({
        ...t,
        subscribed: subMap.has(t.id)
          ? (subMap.get(t.id) ?? t.subscribed)
          : t.subscribed,
      })),
    );
  } catch {
    return c.json(topics);
  }
});

const updateTopicSchema = z.object({
  subscribed: z.boolean(),
});

// PATCH /user/email-topics/:topicId -- update subscription for one topic
userRouter.patch(
  "/email-topics/:topicId",
  requireAuth,
  zValidator("json", updateTopicSchema),
  async (c) => {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return c.json({ success: false }, 503);

    const sessionUser = c.get("user");
    const topicId = c.req.param("topicId");
    const { subscribed } = c.req.valid("json");

    const rows = await db
      .select({ resendContactId: user.resendContactId })
      .from(user)
      .where(eq(user.id, sessionUser.id));
    const resendContactId = rows[0]?.resendContactId;

    if (!resendContactId)
      return c.json({ success: false, error: "No Resend contact" }, 400);

    const resend = new Resend(resendKey);
    await resend.contacts.topics.update({
      id: resendContactId,
      topics: [
        { id: topicId, subscription: subscribed ? "opt_in" : "opt_out" },
      ],
    });

    return c.json({ success: true });
  },
);

export { userRouter as user };
