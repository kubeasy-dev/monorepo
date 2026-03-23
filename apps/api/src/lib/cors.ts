/**
 * Allowed origins for CORS and Better Auth trusted origins.
 * Better Auth supports wildcard patterns natively (https://*.up.railway.app).
 * Hono's cors() does not — use `isAllowedOrigin` for Hono.
 */
export const allowedOrigins = [
  "http://localhost:3000",
  "https://kubeasy.dev",
  "https://*.up.railway.app",
];

export function isAllowedOrigin(origin: string): boolean {
  return allowedOrigins.some((allowed) => {
    if (allowed.includes("*")) {
      const prefix = allowed.split("*")[0];
      const suffix = allowed.split("*")[1];
      return origin.startsWith(prefix) && origin.endsWith(suffix ?? "");
    }
    return origin === allowed;
  });
}
