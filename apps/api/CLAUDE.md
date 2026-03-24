# apps/api — CLAUDE.md

Kubeasy REST API backend.

## Stack

- **Hono.js** — lightweight HTTP framework (Node.js via `@hono/node-server`)
- **Drizzle ORM** + **PostgreSQL** (`pg`) — database access and migrations
- **BullMQ** + **Redis** (`ioredis`) — background job queue
- **Better Auth** — authentication (OAuth: GitHub, Google, Microsoft)
- **Zod** + `@hono/zod-validator` — request/response validation
- **OpenTelemetry** — distributed tracing and structured logging

## Commands

```bash
pnpm dev         # Start dev server with hot-reload (http://localhost:3001)
pnpm build       # Compile to dist/index.js via tsup
pnpm start       # Run compiled server
pnpm typecheck   # Type-check without emitting

pnpm test        # Run tests in watch mode
pnpm test:run    # Run tests once

pnpm db:generate  # Generate Drizzle migration files
pnpm db:migrate   # Apply migrations to the database
pnpm db:push      # Push schema directly (dev only, no migration file)
pnpm db:studio    # Open Drizzle Studio (DB browser)
```

## Entry Point & Bootstrap

`src/index.ts` — startup sequence:
1. Runs pending DB migrations (`drizzle-orm/node-postgres/migrator`)
2. Starts the HTTP server on port `PORT` (default `3001`)
3. Instantiates BullMQ workers
4. Registers graceful shutdown on `SIGTERM` / `SIGINT`

`src/app.ts` — Hono app setup:
- OpenTelemetry HTTP instrumentation middleware
- CORS (origin allowlist via `src/lib/cors.ts`)
- Session middleware on all `/api/*` routes
- Better Auth handler at `/api/auth/*`
- Route groups mounted at `/api`

## Directory Structure

```
src/
  index.ts          # Entry point (server bootstrap + workers)
  app.ts            # Hono app definition (middleware + routes)
  instrumentation.ts  # OpenTelemetry SDK setup

  routes/           # Hono route groups (all mounted under /api)
    index.ts          # Aggregates all route groups
    challenges.ts     # GET /challenges, GET /challenges/:slug
    submit.ts         # POST /challenges/:slug/submit
    submissions.ts    # GET /submissions
    themes.ts         # GET /themes
    types.ts          # GET /types
    progress.ts       # GET /progress
    xp.ts             # GET /xp
    user.ts           # GET/PATCH /user
    sse.ts            # GET /sse (Server-Sent Events)
    onboarding.ts     # POST /onboarding
    cli/              # Routes used by the Kubeasy CLI
    admin/            # Admin-only routes

  db/
    index.ts          # Drizzle client (pg Pool)
    schema/
      auth.ts         # Better Auth tables (user, session, account, etc.)
      challenge.ts    # Challenge tables (challenge, userProgress, userSubmission, xpTransaction, etc.)
      email.ts        # Email-related tables
      onboarding.ts   # Onboarding tables
      index.ts        # Re-exports all schemas

  workers/
    challenge-submission.worker.ts  # Processes challenge validation results
    user-lifecycle.worker.ts        # Handles user sign-in events
    xp-award.worker.ts              # Awards XP after challenge completion

  services/         # Business logic (XP calculation, etc.)
  middleware/
    session.ts        # Sets c.var.user and c.var.session from Better Auth
    admin.ts          # Enforces admin role (compose after session middleware)
    api-key.ts        # API key authentication (used by CLI routes)
    rate-limit.ts     # Rate limiting
  lib/
    auth.ts               # Better Auth server config
    cors.ts               # Allowed origins list
    redis.ts              # Shared ioredis client
    analytics-server.ts   # PostHog server-side event tracking
    resend.ts             # Resend email client
    env.ts                # Environment variable validation
  schemas/          # Zod schemas for request/response bodies
  __tests__/        # Vitest test files (8 files: api-key, auth, challenges, cli, cookie, middleware, oauth, submit)
```

## Adding a New Route

```typescript
// src/routes/myRoute.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db";
import { myTable } from "../db/schema";

const myRoute = new Hono();

myRoute.get("/", async (c) => {
  const rows = await db.select().from(myTable);
  return c.json(rows);
});

myRoute.post("/", zValidator("json", z.object({ name: z.string() })), async (c) => {
  const { name } = c.req.valid("json");
  // ...
  return c.json({ success: true });
});

export { myRoute };
```

Then register in `src/routes/index.ts`:
```typescript
import { myRoute } from "./myRoute";
routes.route("/my-resource", myRoute);
```

## Protected Routes

Access the authenticated user via `c.var.user` (set by session middleware):

```typescript
myRoute.get("/me", async (c) => {
  const user = c.var.user;
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json(user);
});
```

## Database Migrations

Migrations are stored in `drizzle/` and applied automatically on server startup.

To add a new column or table:
1. Edit schema in `src/db/schema/`
2. Run `pnpm db:generate` to create a migration file
3. Restart the dev server (migrations apply on boot) or run `pnpm db:migrate`

## Background Jobs

Jobs are defined in `@kubeasy/jobs`. Workers live in `src/workers/`:

```typescript
// src/workers/myJob.worker.ts
import { Worker } from "bullmq";
import { QUEUE_NAMES } from "@kubeasy/jobs/queue-names";
import { redis } from "../lib/redis";

export function createMyWorker() {
  return new Worker(QUEUE_NAMES.MY_QUEUE, async (job) => {
    // process job.data
  }, { connection: redis });
}
```

Register in `src/index.ts`:
```typescript
const workers = [
  createMyWorker(),
  // ...
];
```

## Shared Packages Used

| Package | Purpose |
|---|---|
| `@kubeasy/api-schemas` | Shared Zod schemas and inferred types |
| `@kubeasy/jobs` | Queue names, job payloads, factory functions |
| `@kubeasy/logger` | Structured logging (`import { logger } from "@kubeasy/logger"`) |

## Environment Variables

```bash
DATABASE_URL=          # PostgreSQL connection string
REDIS_URL=             # Redis connection URL
BETTER_AUTH_SECRET=    # Better Auth secret
API_URL=               # API base URL (Better Auth baseURL, OAuth redirect base — defaults to http://localhost:3001)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
RESEND_API_KEY=        # Transactional email
POSTHOG_KEY=           # PostHog project API key (analytics disabled if missing)
POSTHOG_HOST=          # PostHog host (e.g. https://eu.i.posthog.com)
OTEL_EXPORTER_OTLP_ENDPOINT=  # OpenTelemetry collector endpoint (traces/metrics/logs)
PORT=3001              # HTTP server port (optional, defaults to 3001)
```
