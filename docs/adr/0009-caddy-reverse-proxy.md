# Caddy as the reverse proxy (after nginx and Traefik iterations)

`apps/caddy/` runs Caddy as the reverse proxy in front of all services. The history matters here: we started with Caddy, replaced it with nginx to get OpenTelemetry tracing at the proxy layer (via `nginx-module-otel`), then migrated to Traefik v3 to simplify Railway's single-`PORT` constraint, then reverted back to Caddy. The revert happened because:

1. Traefik's Railway integration required complex envsubst templating to work around Railway's single-port model, and the config was brittle.
2. nginx's OTel module (`nginx-module-otel 0.1.2`) had unstable syntax and added operational complexity.
3. Caddy handles SSE (Server-Sent Events) correctly without extra configuration — nginx and Traefik both required explicit buffering/flush settings.
4. Caddy's Caddyfile syntax is far simpler to maintain.

OTel tracing at the proxy layer was dropped; the API and web apps instrument their own traces via the OTel SDK.

## Consequence

Do not re-introduce nginx or Traefik without a concrete reason that Caddy cannot address. The proxy evolution cost significant debugging time.
