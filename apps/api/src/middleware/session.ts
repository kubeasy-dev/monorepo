import { createMiddleware } from "hono/factory";
import { auth } from "../lib/auth.js";

type SessionUser = typeof auth.$Infer.Session.user;
type SessionData = typeof auth.$Infer.Session.session;

export const sessionMiddleware = createMiddleware<{
  Variables: {
    user: SessionUser | null;
    session: SessionData | null;
  };
}>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (session) {
    c.set("user", session.user);
    c.set("session", session.session);
  } else {
    c.set("user", null);
    c.set("session", null);
  }
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
