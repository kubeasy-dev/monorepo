import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { db } from "../db/index";
import { user as userTable } from "../db/schema/auth";
import { auth } from "../lib/auth";

export type SessionUser = typeof auth.$Infer.Session.user;
export type SessionData = typeof auth.$Infer.Session.session;

export type AppEnv = {
  Variables: {
    user: SessionUser | null;
    session: SessionData | null;
  };
};

export const sessionMiddleware = createMiddleware<{
  Variables: {
    user: SessionUser | null;
    session: SessionData | null;
  };
}>(async (c, next) => {
  // 1. Try session cookie (web)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (session) {
    c.set("user", session.user);
    c.set("session", session.session);
    await next();
    return;
  }

  // 2. Fallback: try Bearer API key (CLI)
  const authHeader = c.req.header("Authorization");
  const key = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (key) {
    const result = await auth.api.verifyApiKey({ body: { key } });
    if (result.valid && result.key) {
      const [foundUser] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, result.key.referenceId))
        .limit(1);

      if (foundUser) {
        c.set("user", foundUser as SessionUser);
        c.set("session", null);
        await next();
        return;
      }
    }
  }

  c.set("user", null);
  c.set("session", null);
  await next();
});

export const requireAuth = createMiddleware<{
  Variables: {
    user: SessionUser;
    session: SessionData;
  };
}>(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});
