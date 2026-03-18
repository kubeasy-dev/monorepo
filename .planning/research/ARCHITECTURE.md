# Architecture Research

**Domain:** TypeScript monorepo — Hono API + Tanstack Start web app
**Researched:** 2026-03-18
**Confidence:** HIGH (Turborepo, Hono, Better Auth official docs + verified examples)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser / CLI (Go)                          │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
               ┌─────────────────┴─────────────────┐
               ▼                                   ▼
┌──────────────────────────┐       ┌───────────────────────────────┐
│      apps/web             │       │         apps/api               │
│  (Tanstack Start)         │       │         (Hono)                 │
│                           │  REST │                                │
│  SSG: landing, blog       │ ────► │  REST + SSE endpoints          │
│  SSR: challenges, dash    │ ◄──── │  Better Auth (sessions)        │
│  Tanstack Query (client)  │  SSE  │  Drizzle ORM → PostgreSQL      │
│  Better Auth client       │       │  BullMQ → Redis (jobs)         │
│                           │       │  Redis pub/sub → SSE           │
└──────────────────────────┘       └───────────────────────────────┘
                                                 │
                              ┌──────────────────┴──────────────────┐
                              │                                      │
                    ┌─────────▼────────┐              ┌─────────────▼────┐
                    │   PostgreSQL      │              │      Redis        │
                    │  (data + auth)    │              │  (jobs + pub/sub) │
                    └──────────────────┘              └──────────────────┘
                              │
                    ┌─────────▼────────┐
                    │  OTel Collector   │
                    │  (receives OTLP   │
                    │   from all apps)  │
                    └──────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `apps/web` | UI rendering (SSG/SSR), user-facing pages, auth client | `apps/api` via HTTP/SSE |
| `apps/api` | HTTP REST endpoints, auth sessions, business logic, job dispatch | PostgreSQL, Redis, OTel Collector |
| `packages/api-schemas` | Zod request/response contracts shared between web and api | None (pure definitions) |
| `packages/jobs` | BullMQ queue + job definitions | Redis (at runtime, imported by `apps/api`) |
| PostgreSQL | All persistent data: users, challenges, submissions, XP | `apps/api` only |
| Redis | BullMQ job queues + pub/sub for SSE | `apps/api` only |
| OTel Collector | Receives OTLP from all apps, forwards to external backend | Grafana Cloud / Honeycomb / etc. |

---

## Recommended Project Structure

```
kubeasy/website/                   # Repo root (in-place refactor)
├── apps/
│   ├── web/                       # Tanstack Start frontend
│   │   ├── src/
│   │   │   ├── routes/            # File-based routes (TanStack Router)
│   │   │   │   ├── __root.tsx     # Root layout, providers
│   │   │   │   ├── index.tsx      # Landing page (SSG)
│   │   │   │   ├── challenges/
│   │   │   │   │   ├── index.tsx  # Challenge listing (SSR)
│   │   │   │   │   └── $slug.tsx  # Challenge detail (SSR)
│   │   │   │   ├── blog/
│   │   │   │   │   ├── index.tsx  # Blog listing (SSG)
│   │   │   │   │   └── $slug.tsx  # Blog article (SSG)
│   │   │   │   └── dashboard/
│   │   │   │       └── index.tsx  # User dashboard (SSR, auth-gated)
│   │   │   ├── components/        # React components
│   │   │   │   ├── ui/            # shadcn/ui primitives
│   │   │   │   ├── challenge/     # Challenge-specific
│   │   │   │   └── layout/        # header, footer
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts  # Typed fetch client (consumes @kubeasy/api-schemas)
│   │   │   │   ├── auth-client.ts # Better Auth client
│   │   │   │   └── query-client.ts
│   │   │   └── styles/
│   │   ├── app.config.ts          # Tanstack Start config (Vite/Nitro)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/                       # Hono API server
│       ├── src/
│       │   ├── index.ts           # Entry point: mount routes, start server
│       │   ├── routes/            # Hono route modules (app.route())
│       │   │   ├── auth.ts        # Better Auth handler (/api/auth/*)
│       │   │   ├── challenges.ts  # Challenge CRUD + listing
│       │   │   ├── submissions.ts # CLI submission endpoint
│       │   │   ├── progress.ts    # User progress + XP
│       │   │   ├── sse.ts         # SSE endpoint for realtime updates
│       │   │   └── admin.ts       # Admin endpoints
│       │   ├── middleware/
│       │   │   ├── auth.ts        # Session extraction middleware
│       │   │   ├── cors.ts        # CORS config (web + CLI origins)
│       │   │   └── logger.ts      # OTel request logging
│       │   ├── db/                # Drizzle (migrated from server/db)
│       │   │   ├── index.ts       # PostgreSQL connection (node-postgres)
│       │   │   └── schema/        # Same schema, no functional changes
│       │   ├── services/          # Business logic
│       │   │   ├── xp.ts          # XP calculation (migrated from server/services)
│       │   │   └── submissions.ts # Submission validation logic
│       │   ├── lib/
│       │   │   ├── auth.ts        # Better Auth server config
│       │   │   ├── redis.ts       # Redis client (ioredis)
│       │   │   └── logger.ts      # OTel structured logger
│       │   └── jobs/              # BullMQ workers (runs jobs from @kubeasy/jobs)
│       │       └── worker.ts      # Worker registration
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── api-schemas/               # @kubeasy/api-schemas
│   │   ├── src/
│   │   │   ├── challenges.ts      # Challenge request/response schemas
│   │   │   ├── submissions.ts     # CLI submission payload schema
│   │   │   ├── progress.ts        # User progress schemas
│   │   │   └── index.ts           # Re-exports all schemas
│   │   ├── package.json           # JIT package — no build step
│   │   └── tsconfig.json
│   │
│   ├── jobs/                      # @kubeasy/jobs
│   │   ├── src/
│   │   │   ├── queues.ts          # Queue definitions (BullMQ Queue instances)
│   │   │   ├── jobs/              # Job payload type definitions + processors
│   │   │   │   └── email.ts       # Email job definition
│   │   │   └── index.ts
│   │   ├── package.json           # JIT package — no build step
│   │   └── tsconfig.json
│   │
│   └── typescript-config/         # @kubeasy/typescript-config
│       ├── base.json              # Shared tsconfig base
│       ├── web.json               # Web app tsconfig extends base
│       └── api.json               # API tsconfig extends base (no DOM lib)
│
├── turbo.json                     # Task pipeline config
├── pnpm-workspace.yaml            # Workspace roots: apps/*, packages/*
├── package.json                   # Root: devDeps only (turbo, biome)
├── biome.json                     # Shared lint/format config
├── docker-compose.yml             # Local dev: postgres, redis, otel-collector
└── drizzle/                       # Migrations (stays at root or moves to apps/api)
```

### Structure Rationale

- **`apps/`**: Only deployable services. Each has its own `package.json`, Dockerfile, and runtime concern.
- **`packages/api-schemas`**: Zod-only, no framework imports. JIT (no build step) — both Vite (web) and esbuild/tsx (api) understand TypeScript natively.
- **`packages/jobs`**: Exports BullMQ queue and job definitions only. `apps/api` instantiates workers. Future `apps/worker` would import the same package. No import from `apps/*` — strictly unidirectional.
- **`packages/typescript-config`**: Shared tsconfig bases. Prevents divergence between web (React JSX, DOM) and api (Node.js, no DOM).
- **JIT packages**: Both `packages/` packages use direct TypeScript exports (no `dist/`). The consuming bundler handles transpilation. Valid because Vite (web) and tsx/esbuild (api dev) both understand TypeScript. Build is only needed if ever published externally.

---

## Package Dependency Graph

Direction: `app → package` only. Never `package → app`. Never circular.

```
apps/web
  ├── @kubeasy/api-schemas  (request/response types, fetch call shapes)
  └── (dev) @kubeasy/typescript-config

apps/api
  ├── @kubeasy/api-schemas  (validates incoming requests against same schemas)
  ├── @kubeasy/jobs         (dispatches jobs, runs workers)
  └── (dev) @kubeasy/typescript-config

packages/api-schemas
  └── zod (external only)

packages/jobs
  └── bullmq (external only)
  └── (optionally) @kubeasy/api-schemas (job payload types)

packages/typescript-config
  └── (no runtime deps)
```

**Critical:** `packages/jobs` must NOT import from `apps/api`. The API imports jobs, not the reverse. This is the constraint that enables future worker extraction.

---

## Architectural Patterns

### Pattern 1: Hono Route Modules via `app.route()`

**What:** Each resource domain is a separate Hono instance, mounted at a prefix.
**When to use:** Always — this is the idiomatic Hono scaling pattern.
**Trade-offs:** Clean separation; type inference is preserved when using Hono RPC; avoids Rails-like controller indirection.

```typescript
// apps/api/src/routes/challenges.ts
import { Hono } from "hono";
const challenges = new Hono();
challenges.get("/", async (c) => { /* list challenges */ });
challenges.get("/:slug", async (c) => { /* get by slug */ });
export default challenges;

// apps/api/src/index.ts
import { Hono } from "hono";
import challenges from "./routes/challenges";
import submissions from "./routes/submissions";
const app = new Hono();
app.route("/challenges", challenges);
app.route("/submissions", submissions);
```

### Pattern 2: Session Middleware in Hono Context

**What:** Better Auth session extracted once per request in a global middleware, stored in Hono's typed context variables. Downstream route handlers read `c.get("user")` — no repetition.
**When to use:** All authenticated routes.
**Trade-offs:** Single extraction point; type-safe via Hono generics; same pattern as current Next.js tRPC context.

```typescript
// apps/api/src/middleware/auth.ts
import type { auth } from "../lib/auth";

type Variables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

export const sessionMiddleware = createMiddleware<{ Variables: Variables }>(
  async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    c.set("user", session?.user ?? null);
    c.set("session", session?.session ?? null);
    await next();
  }
);
```

### Pattern 3: SSE + Redis Pub/Sub for Realtime

**What:** Hono SSE endpoint subscribes to a Redis channel scoped to `userId:challengeSlug`. When `apps/api` processes a CLI submission, it publishes to that channel. The SSE handler streams the event to the connected browser.
**When to use:** Validation status updates (replaces Upstash Realtime).
**Trade-offs:** No WebSocket overhead; stateless (Redis is the broker, not the Node.js process); scales across multiple API replicas.

```typescript
// apps/api/src/routes/sse.ts
import { streamSSE } from "hono/streaming";
import { redis } from "../lib/redis";

sse.get("/validation/:challengeSlug", sessionRequired, async (c) => {
  const userId = c.get("user")!.id;
  const channel = `validation:${userId}:${c.req.param("challengeSlug")}`;
  const subscriber = redis.duplicate(); // dedicated connection for subscribe

  return streamSSE(c, async (stream) => {
    await subscriber.subscribe(channel);
    subscriber.on("message", async (_, message) => {
      await stream.writeSSE({ data: message, event: "validation-update" });
    });
    stream.onAbort(() => {
      subscriber.unsubscribe(channel);
      subscriber.disconnect();
    });
  });
});
```

### Pattern 4: Zod-First API Contracts via `@kubeasy/api-schemas`

**What:** Shared Zod schemas define the exact shape of HTTP request bodies and responses. `apps/api` validates incoming data with `@hono/zod-validator`. `apps/web` uses the same types for its fetch client — no code generation, no tRPC, no OpenAPI runtime.
**When to use:** All endpoints that both web and CLI consume.
**Trade-offs:** Simpler than tRPC; Go CLI can consume independently; web and api always agree on shapes.

```typescript
// packages/api-schemas/src/submissions.ts
export const SubmitChallengeBody = z.object({
  challengeSlug: z.string(),
  results: z.array(ObjectiveResultSchema),
});
export type SubmitChallengeBody = z.infer<typeof SubmitChallengeBody>;

// apps/api — validates at the edge
import { zValidator } from "@hono/zod-validator";
import { SubmitChallengeBody } from "@kubeasy/api-schemas/submissions";
submissions.post("/", zValidator("json", SubmitChallengeBody), async (c) => { ... });

// apps/web — typed fetch
import type { SubmitChallengeBody } from "@kubeasy/api-schemas/submissions";
async function submitChallenge(body: SubmitChallengeBody) {
  return fetch(`${API_URL}/submissions`, { method: "POST", body: JSON.stringify(body) });
}
```

### Pattern 5: Turborepo Task Pipeline with `dependsOn`

**What:** `turbo.json` encodes that apps cannot build until their package dependencies have built. For JIT packages (no build), Turborepo's graph still resolves order correctly — it just has no output to cache for the package.
**When to use:** Always defined. Especially important for `dev` tasks using the `with` key.

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", ".output/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

For `dev`, run both apps together: `turbo run dev --filter=apps/web --filter=apps/api`

---

## Data Flow

### REST Request (Web → API)

```
Browser
  ↓ fetch("/challenges?difficulty=easy")
apps/web (Tanstack Query loader or route loader)
  ↓ HTTP GET to $API_URL/challenges
apps/api (Hono route)
  ↓ sessionMiddleware extracts session from cookie
  ↓ challengeRoute handler
  ↓ Drizzle query → PostgreSQL
  ↓ returns JSON matching @kubeasy/api-schemas shape
apps/web
  ↓ Tanstack Query caches response
React renders
```

### CLI Submission → SSE Update

```
kubeasy-cli (Go)
  ↓ POST $API_URL/submissions  {challengeSlug, results:[...]}
apps/api
  ↓ zValidator validates body against SubmitChallengeBody
  ↓ sessionMiddleware: API key auth (not cookie)
  ↓ submissionService: validate objectives, award XP
  ↓ Redis PUBLISH validation:{userId}:{slug} {payload}
  ↓ responds to CLI with enriched results

Redis pub/sub channel
  ↓ (simultaneously)
apps/api SSE handler (browser already connected)
  ↓ receives Redis message
  ↓ streamSSE writes event to browser

Browser
  ↓ Tanstack Query invalidates validation status query
  ↓ UI re-renders with pass/fail indicators
```

### Authentication Flow (Web ↔ API)

```
Browser
  ↓ clicks "Login with GitHub"
apps/web
  ↓ redirects to $API_URL/api/auth/signin/github
apps/api (Better Auth handler on /api/auth/*)
  ↓ OAuth exchange with GitHub
  ↓ creates session in PostgreSQL
  ↓ sets cookie (SameSite=Lax, domain shared between web and api if same domain)
Browser
  ↓ subsequent requests include cookie automatically
apps/api middleware
  ↓ auth.api.getSession() reads session from PostgreSQL
  ↓ c.set("user", session.user)
```

**Cross-origin note:** In local dev, web runs on port 3000 and api on port 3001. Better Auth CORS must be configured with `credentials: true` for the web origin. Cookies must be `SameSite=None; Secure` for truly different origins, or use a local proxy (e.g., Caddy) to serve both under the same domain — the latter is simpler and recommended.

---

## Build Order (Phase Dependency Implications)

The dependency graph below determines which components must be built first and which phases can be developed independently.

```
Phase order by dependency depth:

1. packages/typescript-config    (no deps — build first, trivial)
2. packages/api-schemas          (depends on: zod only — can be built in isolation)
3. packages/jobs                 (depends on: bullmq, optionally api-schemas)
4. apps/api                      (depends on: api-schemas, jobs — needs infra running)
5. apps/web                      (depends on: api-schemas — needs apps/api running for SSR data)
```

**Implication for roadmap phases:**
- Scaffold packages before apps (packages are pure TypeScript, low risk)
- Migrate DB + Hono API before touching Tanstack Start web (web depends on API being available)
- SSE/realtime can be added after basic REST API is working (Redis pub/sub is additive)
- OTel Collector setup is infrastructure-only, can be done in parallel with any app phase

---

## Docker Compose Layout (Local Dev)

```yaml
# docker-compose.yml (root of repo)
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: kubeasy
      POSTGRES_USER: kubeasy
      POSTGRES_PASSWORD: kubeasy
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
    depends_on:
      - postgres      # not a real dep, just ensures collector starts after stable services

volumes:
  postgres_data:
```

**Note:** `apps/api` and `apps/web` run with `pnpm dev` on the host (not in Docker). Docker only manages stateful services. This avoids volume mount performance issues and preserves hot reload.

**OTel Collector config** (`otel-collector-config.yaml`) receives OTLP from `apps/api` (and optionally `apps/web` SSR) and exports to a configured destination (Grafana Cloud, Honeycomb, etc.). In local dev, the exporter can be set to `debug` (logs to stdout) to avoid requiring a real backend.

---

## Railway Production Layout

```
Railway Project: kubeasy

Services:
├── api          → apps/api Dockerfile, root dir: apps/api
│                  Watch path: apps/api/**, packages/**
│                  Env: DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, ...
│
├── web          → apps/web Dockerfile, root dir: apps/web
│                  Watch path: apps/web/**, packages/**
│                  Env: API_URL=https://api.kubeasy.dev, ...
│
├── otel         → otel/opentelemetry-collector-contrib image
│                  Config via env or mounted config
│
├── postgres     → Railway PostgreSQL plugin
│
└── redis        → Railway Redis plugin
```

**Watch paths** are critical: changing `packages/api-schemas` must trigger redeploy of both `api` and `web`. Railway supports gitignore-style watch patterns per service.

**Dockerfiles:** Both apps need multi-stage Dockerfiles that:
1. Install all workspace deps at root (pnpm needs all `packages/` to resolve)
2. Build only the target app (`turbo run build --filter=apps/api`)
3. Prune to production deps with `turbo prune --scope=apps/api --docker`

**`turbo prune` is critical** for Docker builds in monorepos. It generates a minimal subset of the repo containing only the files and deps needed for the target app, reducing image size significantly.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| PostgreSQL | Drizzle ORM + node-postgres driver (replaces Neon serverless driver) | Same schema, driver change only |
| Redis | ioredis (two instances: one for jobs, one dedicated subscriber for SSE) | Dedicated subscriber connection required for pub/sub |
| Better Auth | Mounted on Hono at `/api/auth/*`, Drizzle adapter | CORS must precede auth routes |
| OTel Collector | OTLP HTTP export from `apps/api` and `apps/web` (server-side) | Replace direct PostHog OTLP export |
| Notion API | Stays in `apps/web` server functions (blog content) | No change needed |
| PostHog | Retained for product analytics (not OTel logs) | Client-side in web, server-side optional |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `apps/web` ↔ `apps/api` | HTTP REST + SSE | No tRPC; typed via `@kubeasy/api-schemas` |
| `apps/api` ↔ `packages/jobs` | Direct import (same process) | Worker runs inside api process initially |
| `apps/web` ↔ `packages/api-schemas` | TypeScript import (JIT) | Web bundle includes schema types |
| `apps/api` ↔ `packages/api-schemas` | TypeScript import (JIT) | API validates with zValidator |
| `kubeasy-cli` (Go) ↔ `apps/api` | HTTP REST | Same contracts as before; schemas are the source of truth |

---

## Anti-Patterns

### Anti-Pattern 1: Cross-Package Relative Imports

**What people do:** Write `import { schema } from "../../packages/api-schemas/src/index"` from within an app.
**Why it's wrong:** Bypasses package.json resolution, breaks Turborepo's dependency graph, breaks pruning for Docker.
**Do this instead:** Declare `"@kubeasy/api-schemas": "workspace:*"` in the app's `package.json` and import as `import { schema } from "@kubeasy/api-schemas"`.

### Anti-Pattern 2: Package Importing from App

**What people do:** `packages/jobs` imports a DB client or auth helper from `apps/api` to avoid duplication.
**Why it's wrong:** Creates circular dependency. Prevents extracting `apps/worker` later. Turborepo cannot build cleanly.
**Do this instead:** Move shared concerns (Redis client config, types) into a `packages/` layer, or pass them as constructor arguments at runtime.

### Anti-Pattern 3: Running All Services in Docker

**What people do:** Add `apps/api` and `apps/web` to docker-compose alongside postgres and redis.
**Why it's wrong:** Volume mounts for `node_modules` in a pnpm workspace are complex. Hot reload is unreliable. Adds ~30s to each code change cycle.
**Do this instead:** Run stateful services (postgres, redis, otel) in Docker; run apps on the host with `turbo run dev`.

### Anti-Pattern 4: Single Compiled Build Step for JIT Packages

**What people do:** Add `"build": "tsc"` to `packages/api-schemas` and make apps wait for it to compile.
**Why it's wrong:** Adds unnecessary build latency; JIT packages don't need a build step when all consumers use bundlers or tsx.
**Do this instead:** Export TypeScript source directly from `packages/api-schemas/src/*.ts`. Only add a build step if the package needs to be published to npm or consumed by a non-bundler tool.

### Anti-Pattern 5: Shared Cookie Domain Without Proxy in Local Dev

**What people do:** Configure `SameSite=None; Secure` cookies for `localhost:3000` ↔ `localhost:3001`.
**Why it's wrong:** Browsers do not enforce `Secure` on localhost reliably; this configuration is for cross-origin prod, not local dev. Results in confusing auth failures.
**Do this instead:** Use a local reverse proxy (Caddy or nginx) to serve both web (`localhost:3000`) and api (`localhost:3001`) under `api.localhost` and `app.localhost`, or configure Better Auth trusted origins to include `http://localhost:3000` and use standard session cookies.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (< 10k users) | Single `apps/api` process handles REST, SSE, BullMQ workers, and auth. Redis pub/sub scales SSE horizontally if needed. |
| 10k–100k users | Extract `packages/jobs` workers into `apps/worker` (already prepared). Add read replicas for PostgreSQL. API remains stateless. |
| 100k+ users | Horizontal scaling of `apps/api` is natural (stateless + Redis broker). SSE scales because any replica handles any channel via Redis. Consider dedicated auth service if Better Auth becomes bottleneck. |

**First bottleneck:** PostgreSQL connection pool exhaustion. Hono on Node.js holds connections. Use PgBouncer or connection pooling built into Railway/Neon if this becomes a problem before extracting the worker.

---

## Sources

- [Turborepo Structuring a Repository](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository) — HIGH confidence
- [Turborepo Internal Packages (JIT vs Compiled)](https://turborepo.dev/docs/core-concepts/internal-packages) — HIGH confidence
- [Turborepo Configuring Tasks (dependsOn, persistent)](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks) — HIGH confidence
- [Hono Best Practices (route modules, app.route())](https://hono.dev/docs/guides/best-practices) — HIGH confidence
- [Hono Streaming Helper (streamSSE)](https://hono.dev/docs/helpers/streaming) — HIGH confidence
- [Better Auth Hono Integration](https://better-auth.com/docs/integrations/hono) — HIGH confidence
- [Railway Monorepo Deployment](https://docs.railway.com/guides/monorepo) — HIGH confidence
- [Turborepo + Hono template (mono-f7)](https://github.com/makyinmars/mono-f7) — MEDIUM confidence (community example)
- [TanStack Start Overview](https://tanstack.com/start/latest/docs/framework/react/overview) — HIGH confidence

---

*Architecture research for: Turborepo monorepo — Hono API + Tanstack Start*
*Researched: 2026-03-18*
