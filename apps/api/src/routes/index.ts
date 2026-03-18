import { Hono } from "hono";

// Route groups will be added in Plans 02-02 and 02-03
const routes = new Hono();

// Health check
routes.get("/health", (c) => c.json({ status: "ok" }));

export { routes };
