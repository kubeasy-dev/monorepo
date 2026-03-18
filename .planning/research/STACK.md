# Stack Research

**Domain:** TypeScript monorepo — Hono API + TanStack Start frontend + BullMQ + OpenTelemetry
**Researched:** 2026-03-18
**Confidence:** MEDIUM-HIGH (versions verified via npm/official docs; TanStack Start maturity is MEDIUM)

---

## Context: What This Replaces

| Current (monolith) | New (monorepo) | Why |
|--------------------|----------------|-----|
| Next.js 16 + App Router | TanStack Start (apps/web) | Vendor-lock-free, no Vercel coupling |
| tRPC 11 | REST + Zod schemas (@kubeasy/api-schemas) | Standard HTTP, consumable by Go CLI |
| Neon serverless | postgres.js + pg (Railway Postgres) | Self-hosted, no serverless constraints |
| Upstash Redis REST | ioredis + native Redis | BullMQ requires ioredis; no REST overhead |
| Upstash Realtime | Hono streamSSE + Redis pub/sub | Self-hosted SSE, same architectural pattern |
| PostHog OTel exporter | OTel Collector (OTLP) | Vendor-agnostic, centralized, standard |
| Vercel deployment | Railway | Supports long-lived processes (Hono, workers) |

---

## Recommended Stack

### Monorepo Orchestration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Turborepo | 2.8.x (latest) | Task orchestration, build cache, pipeline | De facto standard for TS monorepos; Rust-based speed; pairs natively with pnpm workspaces; Railway has documented support |
| pnpm workspaces | 10.x (current: 10.32.1) | Package management, hoisting, symlinks | Already in use; required for Turborepo symlink resolution; monorepo-first design |

**Configuration:** `pnpm-workspace.yaml` declares `apps/*` and `packages/*`. Root `turbo.json` defines task pipeline (`build`, `dev`, `lint`, `typecheck`). Each package owns its own `tsconfig.json` extending from `packages/typescript-config`.

**Package naming:** Use `@kubeasy/` scope prefix for all packages (e.g., `@kubeasy/api-schemas`, `@kubeasy/jobs`).

**Confidence:** HIGH — verified against Turborepo 2.7/2.8 release notes and pnpm docs.

---

### apps/api — Hono HTTP Server

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| hono | 4.12.8 | Core HTTP framework | Web-standard API, native SSE support, 14KB bundle, 3.5x faster than Express; first-class Node.js adapter |
| @hono/node-server | 1.19.x | Node.js adapter | Required for long-lived Node.js process (Railway); enables serve() from Hono |
| @hono/zod-openapi | latest | Route definitions with Zod schema validation | Auto-generates OpenAPI spec from the same Zod schemas used in @kubeasy/api-schemas; enables Hono RPC type inference |
| @hono/cors | (bundled with hono) | CORS middleware | Must be registered before Better Auth routes when web and api are on different origins |

**Pattern for REST + type safety:**
Use `@hono/zod-openapi` to define routes. Schemas come from `@kubeasy/api-schemas` workspace package. This gives: (1) runtime validation, (2) OpenAPI spec for Go CLI contract documentation, (3) type-safe Hono RPC client for use in `apps/web` if needed.

**SSE for real-time validation status:**
Use `streamSSE()` from `hono/streaming`. Subscribe to a Redis channel (ioredis) per user session. On CLI submission, the API publishes to Redis; the SSE handler receives and streams to the browser. Clean teardown via the abort signal.

**Confidence:** HIGH — Hono 4.x is stable and actively maintained (published 13 days ago as of research date).

---

### apps/web — TanStack Start Frontend

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @tanstack/react-start | 1.166.x (latest: 1.166.11) | Full-stack React framework | SSG for landing/blog, hybrid for authenticated challenge pages; Vite-based, Railway-deployable, no Vercel dependency |
| @tanstack/react-router | (bundled) | File-based routing | Type-safe routes; built into TanStack Start |
| @tanstack/react-query | 5.x | Server state management | Built into TanStack Start; replaces tRPC's React Query usage |
| vinxi | (bundled) | Vite + Nitro bundler underpinning | Managed by TanStack Start, not configured directly |

**Maturity note:** TanStack Start RC was announced September 2025. As of March 2026, `@tanstack/react-start` is at v1.166.11 and published daily — the API is stable but still pre-1.0 in its original semver sense. Production use is viable but expect occasional API surface changes. The older `@tanstack/start` package (v1.120.20, stale 9 months) is **not** what to use — the active package is `@tanstack/react-start`.

**API consumption pattern:**
TanStack Start fetches from `apps/api` via standard `fetch()` using Zod-validated response types from `@kubeasy/api-schemas`. Use TanStack Query's `queryOptions` for type-safe data fetching. No tRPC; no Hono RPC client required (though the latter is possible if desired).

**SSG strategy:** Use TanStack Start's static prerendering for `/` (landing), `/blog/*`, `/challenges` (public listing). Use server rendering + hydration for `/challenges/[slug]` (authenticated, real-time). TanStack Start supports per-route rendering mode selection.

**Confidence:** MEDIUM — Framework is actively developed and published daily. API surface is settling but the RC designation introduces some risk. Verify prerendering documentation before the SSG phase.

---

### packages/api-schemas — Shared Zod Contracts

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| zod | 4.x (current: 4.3.6) | Schema definition, validation, inference | Already in use; zero-runtime-overhead types via `z.infer`; compatible with @hono/zod-openapi |

**Pattern:** This package exports Zod schemas for every API request/response shape. Both `apps/api` and `apps/web` depend on it. The Go CLI uses the JSON wire format — schemas serve as the authoritative contract documentation. No runtime dependency on Hono or TanStack.

**Exports pattern:** Use TypeScript `exports` field in `package.json` with proper source/types entries for clean imports across workspaces.

**Confidence:** HIGH.

---

### packages/jobs — BullMQ Job Definitions

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| bullmq | 5.71.x (latest: 5.71.0) | Job queue definitions and types | TypeScript-native, Redis-backed; actively maintained (published 6 days ago); purpose-built for Node.js |
| ioredis | 5.x | Redis connection client | Required by BullMQ — BullMQ is built on ioredis's interface; the official `redis` package is incompatible with BullMQ |

**Architecture:** `packages/jobs` defines job types (interfaces), queue names, and job schemas. It does NOT import from `apps/api`. `apps/api` imports from `packages/jobs` to dispatch jobs. Workers (currently in `apps/api`, future: `apps/worker`) import the same package to process jobs. This one-directional dependency allows future extraction of workers without API refactoring.

**Redis connection sharing:** BullMQ recommends separate ioredis connections per Queue/Worker instance (blocking commands conflict). For SSE pub/sub, use a third dedicated connection. Total: 1 BullMQ queue connection + 1 BullMQ worker connection + 1 SSE subscriber connection + 1 general Redis connection = 4 connections. This is normal and expected.

**Confidence:** HIGH — BullMQ is the established Node.js queue solution; ioredis requirement is documented.

---

### Database Layer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| drizzle-orm | 0.45.x (latest: 0.45.1) | TypeScript ORM | Already in use; schema stays unchanged (migration constraint); excellent type inference |
| drizzle-kit | 0.31.x | Schema migration tooling | Paired with drizzle-orm |
| postgres (postgres.js) | 3.x | PostgreSQL driver | Recommended by Drizzle for non-serverless Node.js; faster than `pg` for most workloads; prepared statements by default |

**Migration note:** Current stack uses `@neondatabase/serverless` (Neon-optimized HTTP client for Vercel). For Railway/long-lived Node.js, switch to `postgres` (postgres.js). Drizzle supports both with identical schema API — only `drizzle()` constructor call changes. Schema itself is untouched.

**Do NOT use:** `@neondatabase/serverless` in the new stack. It wraps HTTP transport optimized for Vercel's serverless runtime. In a long-lived Node.js process, use the native TCP driver.

**Confidence:** HIGH.

---

### Authentication

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| better-auth | 1.5.5 | Authentication framework | Already in use; Hono integration is first-class (no adapter needed — Hono uses Web Standard Request/Response); OAuth, sessions, API keys all preserved |
| @better-auth/drizzle-adapter | 1.5.5 | Drizzle ORM adapter | Already in use; works identically in Hono context |

**Migration:** Move `lib/auth.ts` from Next.js into `apps/api`. Mount handler at `app.on(["POST", "GET"], "/api/auth/*", c => auth.handler(c.req.raw))`. Add CORS middleware before auth routes. Inject session into Hono context via middleware for downstream route access. `apps/web` uses `better-auth` client with `baseURL` pointing to `apps/api`.

**Confidence:** HIGH — official Hono integration documented by Better Auth.

---

### Observability — OpenTelemetry

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @opentelemetry/sdk-node | 0.213.0 | Unified Node.js SDK (traces + metrics + logs) | Single entry point; auto-instruments http, pg, redis; SDK 2.x released Feb 2025 |
| @opentelemetry/api | 1.x | OTel API (stable semver separate from SDK) | Stable API contract for instrumenting application code |
| @opentelemetry/exporter-trace-otlp-http | 0.213.0 | OTLP HTTP trace exporter | Sends to local OTel Collector via OTLP/HTTP; collector handles final destination |
| @opentelemetry/exporter-metrics-otlp-http | 0.213.0 | OTLP HTTP metrics exporter | Same pattern |
| @opentelemetry/exporter-logs-otlp-http | 0.213.0 | OTLP HTTP logs exporter | Replaces direct PostHog log export |
| @opentelemetry/auto-instrumentations-node | latest | Auto-instrumentation for common Node.js libs | Instruments http, net, dns, pg, ioredis, bullmq automatically |
| otelcol (docker image) | latest | OpenTelemetry Collector | Receives OTLP from all services; exports to Grafana Cloud/Honeycomb/etc; runs in docker-compose and Railway |

**SDK version note:** OTel JS SDK 2.x uses a split versioning scheme: stable packages are `>=2.0.0`, unstable (pre-GA) packages are `>=0.200.0`. The `sdk-node` package at `0.213.0` is the unstable channel — this is correct and expected, not a downgrade. The API package (1.x) is separately versioned and stable.

**Initialization pattern:** Create `apps/api/src/instrumentation.ts`, import and start `NodeSDK` before any other imports. In Node.js 18+, use `--import ./instrumentation.js` flag or register via `register()`. Configure exporters to point to `http://localhost:4318` (OTel Collector OTLP/HTTP endpoint) in development.

**Replacing PostHog OTel:** Remove `@opentelemetry/exporter-logs-otlp-http` pointing to PostHog. Keep PostHog for product analytics (posthog-js, posthog-node) but route operational telemetry through the Collector. PostHog analytics events (feature flags, user behavior) remain separate from observability signals.

**Confidence:** MEDIUM — SDK 2.x is recent (Feb 2025); migration guide exists but breaking changes require validation. The `0.2xx` versioning for unstable packages can be confusing but is intentional.

---

### Infrastructure

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Railway | — | Production hosting | Native support for Turborepo monorepos; supports long-lived processes, TCP services, private networking; PostgreSQL and Redis as plugins; Watch Paths for selective deployment triggers |
| PostgreSQL 16 | — | Primary database | Via Railway plugin; same schema, no changes |
| Redis 7.x | — | Cache, pub/sub, BullMQ backing | Via Railway plugin; replace Upstash entirely |
| Docker Compose | — | Local development | PostgreSQL + Redis + OTel Collector; ensures parity with production |

**Railway monorepo pattern:** Set Root Directory per service (e.g., `apps/api`), or use `turbo prune --scope=@kubeasy/api` in a Dockerfile for pruned builds. Use Watch Paths to trigger `apps/api` deployment only when `apps/api/**` or `packages/**` changes.

**Confidence:** MEDIUM — Railway monorepo support is documented but has known rough edges (environment variable access during build); verify Watch Paths behavior during deployment phase.

---

### Development Tooling (Preserved)

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| TypeScript | 5.9.x | Type checking | Strict mode; each package has its own tsconfig extending shared base |
| Biome | 2.4.x | Lint + format | Already in use; configure at repo root with per-package overrides |
| Vitest | 4.x | Unit testing | Already in use; works in monorepo with shared config |
| Husky + lint-staged | 9.x / 16.x | Pre-commit hooks | Already in use; hooks run at repo root |
| knip | 5.x | Dead code detection | Already in use; configure workspace-aware |

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| TanStack Start | Next.js 16 (keep current) | Vendor lock to Vercel; tRPC coupling; entire migration rationale |
| TanStack Start | Remix / React Router 7 | Less SSG-native; Shopify stewardship uncertainty; smaller ecosystem for our use case |
| Hono | Express 5 / Fastify | Express: no native SSE helpers, older patterns; Fastify: heavier, plugin ecosystem overhead for this scope |
| Hono | ElysiaJS | Bun-first; less Node.js ecosystem maturity; team unfamiliarity |
| postgres.js | node-postgres (pg) | Both are valid; postgres.js has slightly better TypeScript ergonomics and performance; Drizzle recommends both equally |
| ioredis | node-redis (official) | BullMQ is architecturally incompatible with node-redis; not a preference — a hard requirement |
| BullMQ | Inngest / Trigger.dev | External SaaS; contradicts self-hosted architecture goal; Railway + Redis makes BullMQ simpler |
| OTel Collector | Direct export to Grafana/Honeycomb | Collector provides vendor flexibility, retry/batching, and a single configuration point; avoids SDK changes when switching observability backend |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@neondatabase/serverless` | HTTP transport designed for serverless/Vercel edge; unnecessary overhead in long-lived Node.js; drops when used with native TCP poolers | `postgres` (postgres.js) via drizzle |
| `@upstash/redis` | REST-based Redis; no pub/sub; no BullMQ compatibility; serverless-only value | `ioredis` |
| `@upstash/realtime` | Proprietary Upstash streaming; being fully replaced by SSE | Hono `streamSSE` + ioredis pub/sub |
| `@tanstack/start` (old package) | Stale (9 months old, last version 1.120.20); the active package is `@tanstack/react-start` | `@tanstack/react-start` |
| `node-redis` (official redis package) | Architecturally incompatible with BullMQ; BullMQ requires ioredis connection interface | `ioredis` |
| tRPC | Being removed from the stack; couples web/api at the framework level; not consumable by Go CLI | `@hono/zod-openapi` + `@kubeasy/api-schemas` |
| Vercel Analytics | Vercel-specific; being removed with Vercel departure | Keep PostHog for product analytics |

---

## Version Compatibility

| Package | Requires | Notes |
|---------|----------|-------|
| bullmq 5.x | ioredis 5.x | Hard dependency; do not substitute node-redis |
| better-auth 1.5.x | hono 4.x | Compatible; uses Web Standard Request/Response interface |
| drizzle-orm 0.45.x | postgres.js 3.x OR pg 8.x | Either driver works; schemas are driver-agnostic |
| @opentelemetry/sdk-node 0.213.x | Node.js >=18.19.0 OR >=20.6.0 | SDK 2.x dropped Node 14/16; current stack uses Node 24 — no issue |
| @tanstack/react-start 1.166.x | React 19.x | TanStack Start targets React 19; aligned with current React version |
| turbo 2.8.x | pnpm 9+ or 10+ | Works with pnpm 10.32.x currently in use |

---

## Installation Sketch

```bash
# Root
pnpm add -D turbo typescript @biomejs/biome

# apps/api
pnpm add hono @hono/node-server @hono/zod-openapi \
  better-auth @better-auth/drizzle-adapter \
  drizzle-orm postgres ioredis bullmq \
  @opentelemetry/sdk-node @opentelemetry/api \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/exporter-logs-otlp-http \
  @opentelemetry/auto-instrumentations-node \
  zod

# apps/web
pnpm add @tanstack/react-start @tanstack/react-router \
  @tanstack/react-query react react-dom \
  better-auth zod

# packages/api-schemas
pnpm add zod

# packages/jobs
pnpm add bullmq ioredis zod
```

---

## Sources

- [Hono npm releases](https://github.com/honojs/hono/releases) — v4.12.8 confirmed current
- [Hono Node.js adapter](https://github.com/honojs/node-server) — v1.19.11 confirmed
- [Hono Node.js getting started](https://hono.dev/docs/getting-started/nodejs) — Node.js >=18 requirement
- [Better Auth Hono integration](https://better-auth.com/docs/integrations/hono) — Pattern verified HIGH confidence
- [TanStack Start overview](https://tanstack.com/start/latest/docs/framework/react/overview) — RC status, SSG support
- [@tanstack/react-start npm](https://www.npmjs.com/package/@tanstack/react-start) — v1.166.11 active package
- [TanStack Start v1 RC announcement](https://tanstack.com/blog/announcing-tanstack-start-v1) — September 2025 RC
- [BullMQ npm](https://www.npmjs.com/package/bullmq) — v5.71.0 verified
- [BullMQ connections docs](https://docs.bullmq.io/guide/connections) — ioredis requirement confirmed
- [OTel JS SDK 2.0 announcement](https://opentelemetry.io/blog/2025/otel-js-sdk-2-0/) — February 2025 release
- [@opentelemetry/sdk-node npm](https://www.npmjs.com/package/@opentelemetry/sdk-node) — v0.213.0 confirmed
- [Turborepo 2.7 blog](https://turborepo.dev/blog/turbo-2-7) — v2.8.x current
- [Turborepo structuring docs](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository) — apps/ + packages/ pattern
- [Railway monorepo guide](https://docs.railway.com/guides/monorepo) — Watch Paths, root directory per service
- [Turborepo Docker guide](https://turborepo.dev/docs/guides/tools/docker) — `turbo prune` pattern
- [Drizzle PostgreSQL docs](https://orm.drizzle.team/docs/get-started-postgresql) — postgres.js driver recommended
- [ioredis vs redis comparison](https://docs.bullmq.io/guide/connections) — BullMQ ioredis requirement
- [Hono @hono/zod-openapi docs](https://hono.dev/examples/zod-openapi) — RPC type-safety pattern

---

*Stack research for: Kubeasy monorepo refactoring (Turborepo + Hono + TanStack Start + BullMQ + OTel)*
*Researched: 2026-03-18*
