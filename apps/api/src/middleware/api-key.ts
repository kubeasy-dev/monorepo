import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { db } from "../db/index";
import { user as userTable } from "../db/schema/auth";
import { auth } from "../lib/auth";
import type { SessionUser } from "./session";

/**
 * Middleware that validates API keys from Authorization: Bearer headers.
 * Used on CLI routes (/api/cli/*) as an alternative to session cookie auth.
 * On valid key: fetches user from DB and injects into c.var (same shape as sessionMiddleware).
 * On missing/invalid key: returns 401.
 */
export const apiKeyMiddleware = createMiddleware<{
  Variables: {
    user: SessionUser;
    session: null;
  };
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const key = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (!key) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const result = await auth.api.verifyApiKey({ body: { key } });

  if (!result.valid || !result.key) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // result.key.referenceId is the userId (renamed from userId in better-auth 1.5+)
  const [foundUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, result.key.referenceId))
    .limit(1);

  if (!foundUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", foundUser as SessionUser);
  c.set("session", null);
  await next();
});
