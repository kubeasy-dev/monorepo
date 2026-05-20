import {
  StreakOutputSchema,
  XpAndRankOutputSchema,
} from "@kubeasy/api-schemas/progress";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { Resend } from "resend";
import { z } from "zod";
import { db } from "../db/index";
import { user } from "../db/schema/auth";
import {
  userProgress,
  userXp,
  userXpTransaction,
} from "../db/schema/challenge";
import { cacheDelPattern, cached, cacheKey, TTL } from "../lib/cache";
import {
  bearerSecurity,
  sessionOrBearerSecurity,
  sessionSecurity,
} from "../lib/openapi-shared";
import { type AppEnv, requireAuth } from "../middleware/session";
import { calculateStreak, getRankFromXp } from "../services/xp/index";

const updateNameSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
});

const updateTopicSchema = z.object({
  subscribed: z.boolean(),
});

const topicIdParam = z.object({ topicId: z.string() });

const UserMeOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable().optional(),
});

const ResetProgressOutputSchema = z.object({
  success: z.boolean(),
  deletedChallenges: z.number(),
  deletedXp: z.number(),
});

const UpdateNameOutputSchema = z.object({
  success: z.boolean(),
  name: z.string(),
});

const EmailTopicSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  defaultSubscription: z.enum(["opt_in", "opt_out"]),
  subscribed: z.boolean(),
});

const EmailTopicsOutputSchema = z.array(EmailTopicSchema);

export const userRouter = new Hono<AppEnv>()
  .get(
    "/me",
    describeRoute({
      tags: ["CLI", "User"],
      summary: "Get current user profile",
      security: bearerSecurity,
      responses: {
        200: {
          description: "User profile",
          content: {
            "application/json": { schema: resolver(UserMeOutputSchema) },
          },
        },
      },
    }),
    requireAuth,
    async (c) => {
      const sessionUser = c.get("user");
      return c.json({
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        image: sessionUser.image,
      });
    },
  )
  .get(
    "/xp",
    describeRoute({
      tags: ["User"],
      summary: "XP earned and rank info",
      security: sessionOrBearerSecurity,
      responses: {
        200: {
          description: "XP and rank",
          content: {
            "application/json": { schema: resolver(XpAndRankOutputSchema) },
          },
        },
      },
    }),
    requireAuth,
    async (c) => {
      const sessionUser = c.get("user");
      const userId = sessionUser.id;

      const data = await cached(
        cacheKey(`u:${userId}:user:xp`),
        TTL.USER,
        async () => {
          const result = await db
            .select({
              totalXp: sql<number>`COALESCE(SUM(${userXpTransaction.xpAmount}), 0)`,
            })
            .from(userXpTransaction)
            .where(eq(userXpTransaction.userId, userId));

          const xpEarned = result[0]?.totalXp ?? 0;
          const rankInfo = getRankFromXp(xpEarned);

          return { xpEarned, rank: rankInfo.name, rankInfo };
        },
      );

      return c.json(data);
    },
  )
  .get(
    "/streak",
    describeRoute({
      tags: ["User"],
      summary: "Current streak count",
      security: sessionSecurity,
      responses: {
        200: {
          description: "Streak",
          content: {
            "application/json": { schema: resolver(StreakOutputSchema) },
          },
        },
      },
    }),
    requireAuth,
    async (c) => {
      const sessionUser = c.get("user");
      const userId = sessionUser.id;

      const data = await cached(
        cacheKey(`u:${userId}:user:streak`),
        TTL.USER,
        async () => {
          const streak = await calculateStreak(userId);
          return { currentStreak: streak, lastActivityDate: null };
        },
      );

      return c.json(data);
    },
  )
  .patch(
    "/name",
    describeRoute({
      tags: ["User"],
      summary: "Update user name",
      security: sessionSecurity,
      responses: {
        200: {
          description: "Updated",
          content: {
            "application/json": { schema: resolver(UpdateNameOutputSchema) },
          },
        },
      },
    }),
    requireAuth,
    validator("json", updateNameSchema),
    async (c) => {
      const sessionUser = c.get("user");
      const userId = sessionUser.id;
      const { firstName, lastName } = c.req.valid("json");

      const fullName = lastName ? `${firstName} ${lastName}` : firstName;

      await db.update(user).set({ name: fullName }).where(eq(user.id, userId));

      return c.json({ success: true, name: fullName });
    },
  )
  .delete(
    "/progress",
    describeRoute({
      tags: ["User"],
      summary: "Reset all user progress",
      security: sessionSecurity,
      responses: {
        200: {
          description: "Deleted",
          content: {
            "application/json": {
              schema: resolver(ResetProgressOutputSchema),
            },
          },
        },
      },
    }),
    requireAuth,
    async (c) => {
      const sessionUser = c.get("user");
      const userId = sessionUser.id;

      const [deletedProgress, deletedTransactions] = await Promise.all([
        db
          .delete(userProgress)
          .where(eq(userProgress.userId, userId))
          .returning(),
        db
          .delete(userXpTransaction)
          .where(eq(userXpTransaction.userId, userId))
          .returning(),
        db.delete(userXp).where(eq(userXp.userId, userId)),
      ]);

      const deletedXp = deletedTransactions.reduce(
        (sum, t) => sum + t.xpAmount,
        0,
      );

      cacheDelPattern(`cache:u:${userId}:*`).catch((err) => {
        c.get("log").error("cache invalidation failed", { error: String(err) });
      });

      return c.json({
        success: true,
        deletedChallenges: deletedProgress.length,
        deletedXp,
      });
    },
  )
  .get(
    "/email-topics",
    describeRoute({
      tags: ["User"],
      summary: "List Resend email topics with subscription status",
      security: sessionSecurity,
      responses: {
        200: {
          description: "Email topics",
          content: {
            "application/json": { schema: resolver(EmailTopicsOutputSchema) },
          },
        },
      },
    }),
    requireAuth,
    async (c) => {
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
          contactTopics.data.data.map((t) => [
            t.id,
            t.subscription === "opt_in",
          ]),
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
    },
  )
  .patch(
    "/email-topics/:topicId",
    describeRoute({
      tags: ["User"],
      summary: "Update subscription for one email topic",
      security: sessionSecurity,
      responses: {
        200: { description: "Updated" },
        400: { description: "No Resend contact" },
        503: { description: "Resend not configured" },
      },
    }),
    requireAuth,
    validator("param", topicIdParam),
    validator("json", updateTopicSchema),
    async (c) => {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) return c.json({ success: false }, 503);

      const sessionUser = c.get("user");
      const { topicId } = c.req.valid("param");
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
