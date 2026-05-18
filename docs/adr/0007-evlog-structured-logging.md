# evlog for structured logging (replacing custom @kubeasy/logger)

All apps use [evlog](https://github.com/nicholasgasior/evlog) for structured logging instead of a hand-rolled `@kubeasy/logger` package built on Pino. The switch was made because evlog provides framework-native integrations (Hono, Nitro/TanStack Start, Next.js, Vite) out of the box, request-scoped loggers attached to the request context, and a drain abstraction that lets us write to the filesystem in dev and export via OTLP in production — without any per-app configuration glue. The custom logger was removed entirely; `evlog` is now the only logging dependency across the monorepo.

## Consequence

Logs and OTel traces share the same correlation context automatically. Do not add `console.log` calls or import `pino` directly — use `evlog`'s framework accessor (e.g. `c.get("log")` in Hono routes).
