import { Hono } from "hono";
import { generateSyncApiDocument } from "../lib/openapi";

const openapi = new Hono();

const syncDocument = generateSyncApiDocument();

// Intentionally unauthenticated: the sync spec is consumed by the CLI's
// auto-discovery and mirrors what is already visible in the challenges repo.
// The actual /api/admin/challenges/sync route it describes is protected.
openapi.get("/sync.json", (c) => {
  return c.json(syncDocument);
});

export { openapi };
