import path from "node:path";
import { fileURLToPath } from "node:url";
import { createOpenAPI } from "fumadocs-openapi/server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const openapi = createOpenAPI({
  input: [path.resolve(__dirname, "../../../apps/api/openapi.json")],
  proxyUrl: "/docs/api/proxy",
});
