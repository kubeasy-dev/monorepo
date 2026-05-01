import type { Hono } from "hono";
import type { GenerateSpecOptions } from "hono-openapi";
import { generateSpecs } from "hono-openapi";

/**
 * OpenAPI metadata used by both:
 *   - the runtime endpoint `GET /api/openapi.json` (mounted in `app.ts`)
 *   - the build-time `pnpm openapi:generate` script
 *
 * Single source of truth so the served spec and the committed `openapi.json`
 * never drift.
 */
export const openApiConfig: Partial<GenerateSpecOptions> = {
  documentation: {
    info: {
      title: "Kubeasy API",
      version: "1.0.0",
      description:
        "Public API for the Kubeasy platform consumed by the web app and the CLI. " +
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
    tags: [{ name: "CLI", description: "Routes consumed by the Kubeasy CLI" }],
  },
  excludeMethods: ["OPTIONS", "HEAD"],
  // Don't document the documentation endpoint itself.
  exclude: ["/api/openapi.json"],
};

export async function generateApiDocument(app: Hono<any, any, any>) {
  return generateSpecs(app, openApiConfig);
}
