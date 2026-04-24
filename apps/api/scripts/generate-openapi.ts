import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateApiDocument } from "@/lib/openapi";

const __dirname = dirname(fileURLToPath(import.meta.url));

const apiDoc = generateApiDocument();
const cliOutputPath = resolve(__dirname, "..", "openapi.json");
writeFileSync(cliOutputPath, JSON.stringify(apiDoc, null, 2));
console.log(`CLI OpenAPI spec written to ${cliOutputPath}`);
