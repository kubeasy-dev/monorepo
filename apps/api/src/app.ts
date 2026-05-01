import { httpInstrumentationMiddleware } from "@hono/otel";
import { parseError } from "evlog";
import { identifyUser } from "evlog/better-auth";
import { evlog } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { auth } from "./lib/auth";
import { isAllowedOrigin } from "./lib/cors";
import { RegistryError } from "./lib/registry";
import type { AppEnv } from "./middleware/session";
import { sessionMiddleware } from "./middleware/session";
import { routes } from "./routes/index";

const app = new Hono<AppEnv>();

// Official @hono/otel middleware for framework-native instrumentation
app.use("*", httpInstrumentationMiddleware());

// CORS before everything (Better Auth reads Origin header)
app.use(
  "/api/*",
  cors({
    origin: (origin) => (isAllowedOrigin(origin) ? origin : null),
    allowHeaders: ["Content-Type", "Authorization", "User-Agent"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.use("*", evlog());

// Session middleware on all /api routes (sets c.var.user, c.var.session)
app.use("/api/*", sessionMiddleware);

// Identify user for evlog using already-resolved session (avoids a second getSession call)
app.use("/api/*", async (c, next) => {
  const session = c.get("session");
  const user = c.get("user");
  if (session && user) {
    identifyUser(c.get("log"), {
      user: user as Record<string, unknown>,
      session: session as Record<string, unknown>,
    });
  }
  await next();
});

// Mount Better Auth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// Mount API routes — capture the chained return so the RPC client can infer
// every sub-route below /api/*.
const apiRoutes = app.route("/api", routes);

app.onError((err, c) => {
  const log = c.get("log");

  if (err instanceof RegistryError) {
    log.warn("registry unavailable", { error: String(err) });
    return c.json({ error: "Registry unavailable" }, 502);
  }

  log.error(err);

  const parsed = parseError(err);
  return c.json(
    {
      message: parsed.message,
      why: parsed.why,
      fix: parsed.fix,
      link: parsed.link,
    },
    parsed.status as ContentfulStatusCode,
  );
});

export { app };
export type AppType = typeof apiRoutes;
