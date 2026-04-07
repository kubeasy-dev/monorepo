import { all } from "better-all";
import { count, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { user, userXp } from "../../db/schema";

export const adminUsers = new Hono();

// GET /api/admin/users — paginated user list with metrics
adminUsers.get("/", async (c) => {
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? 50)));
  const offset = (page - 1) * limit;

  const { countRows, users } = await all({
    async countRows() {
      return db.select({ total: count(user.id) }).from(user);
    },
    async users() {
      return db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          createdAt: user.createdAt,
          banned: user.banned,
          banReason: user.banReason,
          totalXp: sql<number>`COALESCE(${userXp.totalXp}, 0)`,
          completedChallenges: sql<number>`(
        SELECT COUNT(*) FROM user_progress
        WHERE user_progress.user_id = ${user.id}
        AND user_progress.status = 'completed'
      )`,
        })
        .from(user)
        .leftJoin(userXp, eq(user.id, userXp.userId))
        .orderBy(user.createdAt)
        .limit(limit)
        .offset(offset);
    },
  });
  const [{ total }] = countRows;

  return c.json({ users, total, page, limit });
});

// GET /api/admin/users/stats — aggregated user counts
adminUsers.get("/stats", async (c) => {
  const [stats] = await db
    .select({
      total: count(user.id),
      banned: sql<number>`COUNT(CASE WHEN ${user.banned} = true THEN 1 END)`,
      admins: sql<number>`COUNT(CASE WHEN ${user.role} = 'admin' THEN 1 END)`,
    })
    .from(user);

  const total = stats?.total ?? 0;
  const banned = Number(stats?.banned ?? 0);
  const admins = Number(stats?.admins ?? 0);

  return c.json({
    total,
    active: total - banned,
    banned,
    admins,
  });
});
