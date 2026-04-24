import { httpInstrumentationMiddleware } from "@hono/otel";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { auth } from "./lib/auth";
import { isAllowedOrigin } from "./lib/cors";
import { RegistryError } from "./lib/registry";
import { sessionMiddleware } from "./middleware/session";
import { routes } from "./routes/index";

const app = new Hono();

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

app.use("*", honoLogger());

// Session middleware on all /api routes (sets c.var.user, c.var.session)
app.use("/api/*", sessionMiddleware);

// Mount Better Auth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// Mount API routes
app.route("/api", routes);

app.onError((err, c) => {
  if (err instanceof RegistryError) {
    return c.json({ error: "Registry unavailable" }, 502);
  }
  throw err;
});

export { app };
export type AppType = typeof app;
