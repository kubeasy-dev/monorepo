# Split monorepo: Hono API + Vite/React frontend (from Next.js monolith)

The original codebase was a single Next.js app mixing API routes, SSR, and the admin panel in one deployment. We migrated to a pnpm monorepo with a dedicated Hono API (`apps/api`) and a Vite + React frontend (`apps/web`), dropping Next.js entirely for the user-facing app. The split gives the API an independent release cycle, makes the Hono server trivially instrumentable with OpenTelemetry, and avoids Next.js's constraints around background workers (BullMQ) and long-lived SSE connections. The trade-off is two separate deployments to operate instead of one.

## Considered options

- **Keep Next.js with App Router** — API routes would have stayed co-located but BullMQ workers and persistent SSE connections don't fit Next.js's serverless/edge model.
- **Next.js frontend + separate Express/Fastify API** — rejected in favour of Hono, which is lighter and has first-class OpenTelemetry and RPC support.
