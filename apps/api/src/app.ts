import { logger as kubeasyLogger } from "@kubeasy/logger";
import { context, trace } from "@opentelemetry/api";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { auth } from "./lib/auth";
import { isAllowedOrigin } from "./lib/cors";
import { sessionMiddleware } from "./middleware/session";
import { routes } from "./routes/index";

const app = new Hono();

// Custom OTel Middleware for better correlation
app.use("*", async (c, next) => {
  const span = trace.getSpan(context.active());
  if (span) {
    // Annotate existing span with Hono info
    span.setAttribute("http.route", c.req.path);
  }
  await next();
});

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

app.use(
  "*",
  honoLogger((str) => kubeasyLogger.info(str)),
);

// Session middleware on all /api routes (sets c.var.user, c.var.session)
app.use("/api/*", sessionMiddleware);

// Mount Better Auth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// Mount API routes
app.route("/api", routes);

export { app };
export type AppType = typeof app;
