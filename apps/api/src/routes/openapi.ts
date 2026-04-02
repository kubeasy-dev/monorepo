import { Hono } from "hono";
import { generateSyncApiDocument } from "../lib/openapi";

const openapi = new Hono();

const syncDocument = generateSyncApiDocument();

openapi.get("/sync.json", (c) => {
  return c.json(syncDocument);
});

export { openapi };
