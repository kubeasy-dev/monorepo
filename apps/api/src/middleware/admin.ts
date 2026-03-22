import { createMiddleware } from "hono/factory";
import type { SessionUser } from "./session";

/**
 * Middleware that enforces admin role.
 * Must be used AFTER an auth middleware (sessionMiddleware + requireAuth, or apiKeyMiddleware)
 * that has already set c.var.user.
 *
 * Better Auth's admin() plugin adds a `role` field to the user object.
 * This middleware rejects requests where role !== 'admin'.
 */
export const requireAdmin = createMiddleware<{
  Variables: {
    user: SessionUser;
    session: unknown;
  };
}>(async (c, next) => {
  const user = c.get("user") as (SessionUser & { role?: string | null }) | null;

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (user.role !== "admin") {
    return c.json({ error: "Forbidden - Admin access only" }, 403);
  }

  await next();
});
