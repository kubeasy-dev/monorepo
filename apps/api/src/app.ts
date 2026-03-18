import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./lib/auth.js";
import { sessionMiddleware } from "./middleware/session.js";
import { routes } from "./routes/index.js";

const app = new Hono();

// CORS before everything (Better Auth reads Origin header)
app.use(
  "/api/*",
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://kubeasy.dev",
      "https://api.kubeasy.dev",
    ],
    allowHeaders: ["Content-Type", "Authorization", "User-Agent"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.use("*", logger());

// Session middleware on all /api routes (sets c.var.user, c.var.session)
app.use("/api/*", sessionMiddleware);

// Mount Better Auth handler
app.on(["GET", "POST"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

// Mount API routes
app.route("/api", routes);

export { app };
export type AppType = typeof app;
