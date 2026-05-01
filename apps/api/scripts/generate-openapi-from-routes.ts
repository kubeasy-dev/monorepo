/**
 * POC: generate the OpenAPI spec directly from the live Hono app via
 * `hono-openapi`'s `generateSpecs`. This replaces the hand-maintained stub
 * in `src/lib/openapi-cli.ts` for routes that have been migrated to use
 * `describeRoute` (currently: only `progress`).
 *
 * Once every route group is migrated, this script supersedes
 * `scripts/generate-openapi.ts`.
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateSpecs } from "hono-openapi";
import { app } from "@/app";

async function main() {
  console.log("[openapi:poc] generating spec…");
  const spec = await generateSpecs(app, {
    documentation: {
      info: {
        title: "Kubeasy CLI API",
        version: "1.0.0",
        description:
          "Public API for the Kubeasy platform consumed by the CLI. " +
          "Web routes use session cookie authentication; CLI routes also accept Bearer token authentication.",
      },
      servers: [
        { url: "https://kubeasy.dev", description: "Production" },
        { url: "http://localhost:3024", description: "Development" },
      ],
      components: {
        securitySchemes: {
          SessionAuth: {
            type: "apiKey",
            in: "cookie",
            name: "better-auth.session_token",
            description: "Session cookie set after login via better-auth",
          },
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            description:
              "API key obtained via `kubeasy login`. Used by the CLI and accepted on all public API routes.",
          },
        },
      },
      tags: [
        { name: "CLI", description: "Routes consumed by the Kubeasy CLI" },
      ],
    },
    excludeMethods: ["OPTIONS", "HEAD"],
  });

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const out = resolve(__dirname, "..", "openapi-from-routes.json");
  writeFileSync(out, JSON.stringify(spec, null, 2));
  console.log(`[openapi:poc] spec written to ${out}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
