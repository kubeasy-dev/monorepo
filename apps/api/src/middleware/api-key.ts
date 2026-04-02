import { createMiddleware } from "hono/factory";
import { lookupUserByApiKey } from "../lib/lookup-user";
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

  // result.key.referenceId is the userId (renamed from userId in better-auth 1.5+)
  const foundUser = await lookupUserByApiKey(key);

  if (!foundUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", foundUser);
  c.set("session", null);
  await next();
});
