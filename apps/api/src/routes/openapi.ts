import { Hono } from "hono";
import { generateApiDocument } from "../lib/openapi";

const openapi = new Hono();

const apiDocument = generateApiDocument();

openapi.get("/openapi.json", (c) => {
  return c.json(apiDocument);
});

export { openapi };
