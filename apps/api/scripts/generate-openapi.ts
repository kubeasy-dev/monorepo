import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "@/app";
import { generateApiDocument } from "@/lib/openapi";

async function main() {
  const apiDoc = await generateApiDocument(app);
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const cliOutputPath = resolve(__dirname, "..", "openapi.json");
  writeFileSync(cliOutputPath, JSON.stringify(apiDoc, null, 2));
  console.log(`OpenAPI spec written to ${cliOutputPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
