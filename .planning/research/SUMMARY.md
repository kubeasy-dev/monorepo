# Project Research Summary

**Project:** Kubeasy monorepo migration — Next.js 15 + tRPC to Turborepo + Hono + TanStack Start
**Domain:** TypeScript full-stack monorepo migration (self-hosted, Railway deployment)
**Researched:** 2026-03-18
**Confidence:** MEDIUM-HIGH

## Executive Summary

Kubeasy is migrating from a Next.js 15 + tRPC monolith on Vercel to a Turborepo monorepo with a Hono REST API (`apps/api`) and TanStack Start frontend (`apps/web`), deployed on Railway. The migration is motivated by three concrete problems with the current stack: Vercel vendor lock-in prevents long-lived processes (blocking BullMQ), tRPC coupling makes the API unconsuable by the Go CLI, and Upstash REST-based Redis is incompatible with BullMQ. The recommended architecture places shared Zod schemas in `packages/api-schemas` as the contract between Hono, TanStack Start, and the Go CLI — eliminating tRPC without sacrificing type safety.

The recommended approach follows a strict dependency order: scaffold the Turborepo monorepo and internal packages first, migrate the database and Hono API second (porting all existing tRPC routes to REST), then migrate the TanStack Start frontend, and finally layer in real-time SSE, OTel observability, and Railway deployment. This ordering is non-negotiable — TanStack Start depends on the API being available, and the SSE system depends on Redis pub/sub being operational. The existing database schema is preserved unchanged; only the driver changes (Neon serverless HTTP to postgres.js TCP).

The primary risks are cross-cutting: Better Auth cookie behavior in a cross-domain API/web split requires explicit configuration and staging verification; TanStack Start is actively developed (v1.166.x, daily publishes) but still pre-1.0 and may have API surface changes; Railway's Turborepo integration has a confirmed bug where `NIXPACKS_TURBO_APP_NAME` is ignored, requiring explicit per-service root directory and watch path configuration. These risks are addressable with specific countermeasures documented in the research, and none represents a blocker to the migration.

## Key Findings

### Recommended Stack

The new stack replaces every Vercel/serverless-coupled dependency with self-hosted equivalents while preserving the core toolchain (TypeScript, Drizzle ORM, Better Auth, Biome). Turborepo 2.8.x orchestrates the monorepo using the existing pnpm 10.x workspaces. Hono 4.12.x serves as the REST API framework — chosen for its Web Standard API (native SSE, no adapter needed for Better Auth), lightweight footprint, and first-class `@hono/zod-openapi` integration. TanStack Start 1.166.x replaces Next.js as the frontend framework, supporting per-route SSG/SSR without Vercel coupling. BullMQ 5.x replaces any future async job needs, backed by ioredis (hard requirement — BullMQ is architecturally incompatible with `node-redis`). OpenTelemetry SDK 2.x routes all observability signals through a self-hosted OTel Collector rather than PostHog's OTLP exporter.

**Core technologies:**
- **Turborepo 2.8.x + pnpm workspaces:** Monorepo orchestration — dependency graph, build cache, task pipeline
- **Hono 4.12.x + @hono/node-server:** REST API framework — native SSE, Web Standard Request/Response (Better Auth compatible)
- **@hono/zod-openapi:** Route definitions with Zod validation — generates OpenAPI spec for Go CLI contract documentation
- **TanStack Start 1.166.x:** Frontend framework — SSG for marketing/blog, SSR for authenticated challenge pages, no Vercel dependency
- **@kubeasy/api-schemas (Zod 4.x):** Shared request/response contracts — single source of truth for Hono validation, TanStack fetch types, Go CLI wire format
- **Better Auth 1.5.5:** Authentication — preserved from current stack; Hono integration is first-class (no adapter)
- **Drizzle ORM 0.45.x + postgres.js 3.x:** Database layer — schema unchanged, driver switched from Neon serverless to native TCP
- **BullMQ 5.x + ioredis 5.x:** Job queue — isolated in `packages/jobs`; API dispatches, workers run in-process initially
- **OTel SDK 0.213.x + OTel Collector:** Observability — OTLP from all services to collector; vendor-agnostic backend
- **Railway:** Production hosting — native pnpm workspace support, PostgreSQL and Redis as plugins

### Expected Features

This is a migration, not a greenfield product. MVP means feature parity on the new architecture.

**Must have (table stakes — v1 migration complete):**
- `@kubeasy/api-schemas` Zod package with all existing tRPC procedure shapes as REST contracts
- Hono API with all tRPC routes ported: challenge CRUD, user progress, XP, submission, admin
- Better Auth on Hono with GitHub/Google/Microsoft OAuth and API key plugin for CLI auth
- CLI submit endpoint (`POST /api/challenges/:slug/submit`) with API key auth and objective enrichment
- SSE endpoint for validation status with Redis pub/sub (replaces Upstash Realtime)
- TanStack Start web with TanStack Query replacing tRPC hooks — all existing pages
- Static prerendering for landing, blog, challenge listing routes
- Turborepo pipeline with correct task ordering + docker-compose for local dev
- Railway deployment configuration replacing Vercel (per-service root directory + watch paths)
- Rate limiting on CLI submission endpoint after Upstash removal

**Should have (v1.x — add after validation):**
- OpenAPI spec generation from `@hono/zod-openapi` for Go CLI auto-generated client types
- ISR for blog routes (full SSG rebuild on deploy is acceptable initially)
- OTel Collector destination finalized (Grafana Cloud vs Honeycomb)

**Defer (v2+):**
- Dedicated BullMQ worker app extracting `packages/jobs` consumers — architecture is prepared, extraction happens when job volume warrants it
- Notion to MDX migration for blog — out of scope for this milestone
- WebSocket upgrade — unlikely given unidirectional SSE use case

### Architecture Approach

The architecture is a strict two-service monorepo: `apps/api` (Hono, owns all business logic, DB access, auth, job dispatch) and `apps/web` (TanStack Start, owns UI rendering and user-facing pages). Communication is HTTP REST and SSE — no tRPC, no Hono RPC client (the latter would prevent Go CLI compatibility). Two shared packages bridge them: `packages/api-schemas` (pure Zod schemas, no framework imports) and `packages/jobs` (BullMQ queue definitions, no DB imports). The dependency graph flows strictly `apps → packages`, never the reverse — this is what enables future worker extraction without API refactoring. Stateful services (PostgreSQL, Redis, OTel Collector) run in Docker for local dev; apps run on the host with `turbo run dev`.

**Major components:**
1. `apps/api` (Hono) — REST endpoints, auth sessions, business logic, job dispatch, SSE, OTel instrumentation
2. `apps/web` (TanStack Start) — SSG/SSR pages, TanStack Query data fetching, Better Auth client, SSE consumer
3. `packages/api-schemas` — Zod request/response contracts; imported by both apps and documented for Go CLI
4. `packages/jobs` — BullMQ queue/job type definitions; imported by API to dispatch, future worker to process
5. `packages/typescript-config` — Shared tsconfig bases; prevents DOM/Node type divergence between apps
6. Infrastructure — PostgreSQL 16, Redis 7.x, OTel Collector (docker-compose local, Railway plugins production)

**Key patterns:**
- Hono route modules via `app.route()` — each resource domain is a separate Hono instance
- Session middleware in Hono context — extracted once per request, stored in `c.var`, no repetition
- SSE + Redis pub/sub for real-time — CLI submission publishes to Redis channel; SSE handler streams to browser
- JIT internal packages — `packages/api-schemas` and `packages/jobs` export TypeScript source directly; no build step needed

### Critical Pitfalls

1. **TypeScript path resolution breaks across internal packages** — Choose compiled vs. JIT strategy for internal packages on day one and apply consistently. Never mix strategies. Use `tsconfig references` not `paths`. Establish this in the monorepo scaffold phase before writing any business logic. Recovery cost is HIGH if caught late.

2. **Better Auth cookies fail in cross-domain API/web split** — Configure `crossSubdomainCookies: { enabled: true, domain: ".kubeasy.dev" }`, add `User-Agent` to Hono CORS `allowHeaders`, ensure CORS middleware is registered before Better Auth handler. Validate end-to-end cookie flow on staging before declaring auth done.

3. **Railway rebuilds all apps on every commit** — `NIXPACKS_TURBO_APP_NAME` is a confirmed no-op in Railpack. Use separate Railway services per app, set explicit `Root Directory` and `Watch Patterns`. Configure before setting up CI/CD pipelines.

4. **BullMQ workers stall on Railway service restarts** — Register SIGTERM handler that `await worker.close()` before process exits. Set Redis `maxmemory-policy noeviction`. Configure `removeOnComplete`/`removeOnFail` to prevent PII accumulation. Include SIGTERM test as acceptance criteria.

5. **SSE connections leak Redis subscriber instances** — Register cleanup on `c.req.raw.signal` abort event AND implement 25-30s heartbeat ping (broken pipe = reliable disconnect signal). Include a Redis `CLIENT LIST` baseline test (10 connect/disconnect cycles) as acceptance criteria for the SSE phase.

6. **OTel SDK initialized after instrumented libraries** — Use `--import ./dist/instrumentation.js` flag (Node 18.19+) to guarantee OTel runs first. Never import from `@kubeasy/*` inside `instrumentation.ts`. Write a DB span smoke test as the first acceptance criterion for the OTel phase.

7. **Go CLI contract breaks on tRPC to REST migration** — Coordinate REST endpoint paths in `@kubeasy/api-schemas` with the CLI team before removing tRPC. Add alias routes in Hono if needed for backward compatibility during transition.

## Implications for Roadmap

Based on the dependency graph in ARCHITECTURE.md and pitfall-to-phase mappings in PITFALLS.md, the following phase structure is recommended:

### Phase 1: Monorepo Scaffold
**Rationale:** Everything else depends on the monorepo structure. Internal package strategy (JIT vs compiled) must be established before any business logic is written — changing it later is HIGH recovery cost. Turborepo pipeline with env var declarations must precede any Railway deployment.
**Delivers:** Turborepo workspace (`pnpm-workspace.yaml`, `turbo.json`), `packages/typescript-config`, `packages/api-schemas` skeleton, `packages/jobs` skeleton, docker-compose for local stateful services, root Biome config.
**Avoids:** TypeScript path resolution pitfall (Pitfall 1), Turborepo cache miss from undeclared env vars (Pitfall 5).
**Research flag:** Standard patterns — Turborepo internal packages and pnpm workspaces are well-documented. No additional research needed.

### Phase 2: Hono API Migration
**Rationale:** TanStack Start web depends on the API being available. The CLI Go team needs the new REST contract before tRPC is removed. This is the highest-risk phase because it involves porting all existing tRPC business logic to REST while keeping the existing database schema intact.
**Delivers:** Full Hono API with all tRPC routes ported to REST (`/api/challenges`, `/api/submissions`, `/api/progress`, `/api/xp`), Better Auth on Hono with CORS configured, API key plugin for CLI auth, objective enrichment logic migrated verbatim, rate limiting on CLI submission endpoint, Drizzle switched from Neon serverless to postgres.js.
**Uses:** Hono 4.12.x, @hono/zod-openapi, @hono/zod-validator, Better Auth 1.5.5, Drizzle 0.45.x + postgres.js 3.x, @kubeasy/api-schemas.
**Avoids:** Better Auth cross-domain cookie pitfall (Pitfall 2 — validate on staging), CLI contract breaking (Pitfall 7 — coordinate with Go team), Neon driver not removed (verify with `pnpm why @neondatabase/serverless`), Vercel wildcard still in trustedOrigins.
**Research flag:** Needs verification — Better Auth cross-subdomain cookie configuration should be tested in staging before declaring done. Better Auth + Hono integration is HIGH confidence but cookie domain behavior has community-reported issues.

### Phase 3: TanStack Start Web Migration
**Rationale:** Web depends on API being available and `@kubeasy/api-schemas` being stable. TanStack Start is the highest-maturity-risk component — starting it after the API is stable reduces the blast radius of any TanStack Start API surface changes.
**Delivers:** TanStack Start app with file-based routing, TanStack Query replacing tRPC hooks for all pages (challenges listing, dashboard, challenge detail), Better Auth client configured for cross-origin API, static prerendering for landing and blog routes, SSE consumer (EventSource + query invalidation).
**Uses:** @tanstack/react-start 1.166.x, @tanstack/react-query 5.x, Better Auth client, @kubeasy/api-schemas for typed fetch wrappers.
**Avoids:** `"use cache"` directive anti-pattern (use `queryOptions` + `staleTime` instead), Hono RPC client anti-pattern (use `@kubeasy/api-schemas` fetch wrappers), tRPC re-introduction.
**Research flag:** Needs research — TanStack Start prerendering and per-route rendering mode (SSG vs SSR vs hybrid) documentation should be verified against the current version (v1.166.x) before the phase begins. The RC designation means prerender API surface may have changed from earlier documentation.

### Phase 4: Real-time SSE + Redis
**Rationale:** SSE is additive to the REST API. It requires Redis pub/sub operational in docker-compose (already available from Phase 1 docker-compose) and the challenge submission endpoint working (Phase 2). Can be developed in parallel with Phase 3 if teams allow, but should be verified end-to-end after both API and web are stable.
**Delivers:** SSE endpoint on Hono (`/api/sse/validation/:challengeSlug`), Redis pub/sub integration (ioredis subscriber per connection), `streamSSE` with heartbeat and abort cleanup, EventSource + `queryClient.invalidateQueries` in TanStack Start, `@kubeasy/jobs` BullMQ package populated with job definitions for async post-submission work.
**Uses:** Hono `streamSSE`, ioredis pub/sub, BullMQ 5.x + ioredis 5.x.
**Avoids:** SSE Redis subscriber leak (Pitfall 7 — verify with CLIENT LIST test), BullMQ stalled jobs on restart (Pitfall 4 — SIGTERM handler), shared Redis connection anti-pattern (separate ioredis instances for pub/sub vs commands).
**Research flag:** Standard patterns — Hono streamSSE and Redis pub/sub are well-documented. The subscriber cleanup pattern is documented in both Hono and ioredis sources. Load test is required as acceptance criteria.

### Phase 5: OTel Instrumentation
**Rationale:** Observability is infrastructure and can be added after the application is functionally complete. It is independent of all application logic. The OTel Collector is available from docker-compose Phase 1 onwards — this phase wires the SDK and verifies signals reach the collector.
**Delivers:** `instrumentation.ts` in `apps/api` initialized via `--import` flag, OTLP HTTP exporters for traces/metrics/logs, auto-instrumentation for pg/ioredis/http, OTel Collector config with debug exporter for local dev and configurable destination for production, PostHog OTLP export removed (PostHog retained for product analytics only).
**Uses:** @opentelemetry/sdk-node 0.213.x, @opentelemetry/auto-instrumentations-node, @opentelemetry/exporter-*-otlp-http.
**Avoids:** SDK initialized after instrumented libraries (Pitfall 6 — `--import` flag), OTel Collector admin port exposed on Railway, debug exporter left on in production.
**Research flag:** Needs verification — OTel SDK 2.x (February 2025) has breaking changes from 1.x. Verify `0.2xx` versioning for unstable packages is understood before starting. DB span smoke test is the first acceptance criterion.

### Phase 6: Railway Deployment
**Rationale:** Railway deployment is the last phase because it validates the entire stack working together in a production-like environment. All application phases must be complete and stable before investing in deployment configuration.
**Delivers:** Separate Railway services for `apps/api` and `apps/web` with explicit root directories and watch paths, multi-stage Dockerfiles using `turbo prune --scope`, PostgreSQL and Redis Railway plugins replacing Neon/Upstash, OTel Collector Railway service, environment variable configuration for all services, CI/CD triggering correct per-service deploys.
**Avoids:** Railway rebuilding all apps on every commit (Pitfall 3 — per-service root directory + watch paths), pnpm workspace Dockerfile install failures (copy root workspace files before `pnpm install`), `NIXPACKS_TURBO_APP_NAME` no-op (confirmed broken, use explicit config).
**Research flag:** Needs verification — Railway Railpack monorepo behavior should be re-verified against Railway docs at the time of this phase. The Railpack `NIXPACKS_TURBO_APP_NAME` bug was confirmed broken in community reports but Railway is actively developing Railpack; behavior may change.

### Phase Ordering Rationale

- **Packages before apps:** `packages/typescript-config` and `packages/api-schemas` have zero dependencies and must exist before either app can import from them. This is enforced by Turborepo's `dependsOn: ["^build"]` pipeline.
- **API before web:** TanStack Start web depends on the API being available for data fetching. API contains the most business logic risk. Isolating API migration reduces blast radius from any TanStack Start API surface changes.
- **SSE after REST API:** SSE is additive and requires the submission endpoint to function. Developing SSE independently allows the core REST API to be validated without real-time complexity.
- **OTel after functionality:** Observability does not block any user-facing feature. Adding it last allows focusing on correctness first, instrumentation second.
- **Railway last:** Production deployment should validate a stable application, not introduce debugging complexity alongside application development.

### Research Flags

Phases needing deeper research during planning:
- **Phase 2 (Hono API Migration):** Better Auth cross-subdomain cookie configuration — PITFALLS.md documents two confirmed GitHub issues. Validate on staging before declaring auth done. Specifically verify `crossSubdomainCookies` config with Hono CORS and `User-Agent` allowHeaders.
- **Phase 3 (TanStack Start Web):** TanStack Start prerendering and per-route rendering mode API — framework is daily-published RC. Re-verify `prerender` config and `ssr` flag documentation against v1.166.x before starting. The older `@tanstack/start` package (stale, 9 months) must not be used — active package is `@tanstack/react-start`.
- **Phase 5 (OTel Instrumentation):** OTel SDK 2.x migration guide — released February 2025, has breaking changes. Verify `0.2xx` unstable channel versioning before installing.
- **Phase 6 (Railway Deployment):** Railpack monorepo behavior — `NIXPACKS_TURBO_APP_NAME` confirmed broken but Railway is actively developing Railpack. Re-check Railway docs and station reports at time of execution.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Monorepo Scaffold):** Turborepo internal packages, pnpm workspaces, and JIT vs compiled package strategy are thoroughly documented in official Turborepo docs. HIGH confidence.
- **Phase 4 (SSE + Redis):** Hono `streamSSE`, ioredis pub/sub, and the subscriber cleanup pattern are all documented with code examples. BullMQ job definitions are standard. MEDIUM-HIGH confidence.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Core stack (Hono, Drizzle, Better Auth, Turborepo, pnpm) is HIGH — all verified via npm + official docs. TanStack Start is MEDIUM due to RC status and daily publishes. OTel SDK 2.x is MEDIUM due to recent release (Feb 2025) with breaking changes. |
| Features | HIGH | Migration scope is well-defined — porting existing tRPC routes to REST with `@kubeasy/api-schemas`. No novel features. Dependency graph is explicit. Anti-features clearly documented. |
| Architecture | HIGH | Turborepo monorepo patterns, Hono route modules, SSE + Redis pub/sub, and JIT internal packages all verified against official documentation with code examples. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls sourced from official docs (BullMQ, Better Auth, Turborepo) and confirmed GitHub issues. Railway Railpack bug confirmed via community station reports. OTel init order confirmed via official getting started guide. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **TanStack Start prerender API:** Verify `prerender` config and per-route rendering mode API against v1.166.x documentation before Phase 3 begins. The RC designation means documentation from September 2025 may not reflect current API.
- **OTel Collector destination:** Grafana Cloud vs Honeycomb vs other is undecided. The Collector accepts OTLP from day one regardless — finalize destination in Phase 5 or v1.x. This is not a blocker.
- **Go CLI contract coordination:** The new REST endpoint paths (`POST /api/challenges/:slug/submit`) must be communicated to the Go CLI team before tRPC removal in Phase 2. Add alias routes in Hono as a safety net during transition.
- **Railway Railpack stability:** Railpack is Railway's new build system and is under active development. The `NIXPACKS_TURBO_APP_NAME` bug may be fixed by Phase 6. Re-verify behavior at execution time rather than assuming the workaround is still needed.
- **Redis maxmemory-policy on Railway:** Railway's Redis plugin default memory policy must be verified at deployment time. If not `noeviction`, BullMQ queue keys may be silently evicted under memory pressure.

## Sources

### Primary (HIGH confidence)
- [Turborepo Internal Packages](https://turborepo.dev/docs/core-concepts/internal-packages) — JIT vs compiled strategy, TypeScript references
- [Turborepo Configuring Tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks) — dependsOn, env declarations, persistent tasks
- [Hono Best Practices](https://hono.dev/docs/guides/best-practices) — route modules, app.route() pattern
- [Hono Streaming Helper](https://hono.dev/docs/helpers/streaming) — streamSSE usage and abort signal
- [Better Auth Hono Integration](https://better-auth.com/docs/integrations/hono) — auth handler mount, CORS requirements, session middleware
- [Better Auth API Key plugin](https://better-auth.com/docs/plugins/api-key) — verifyApiKey, Hono middleware
- [BullMQ Going to production](https://docs.bullmq.io/guide/going-to-production) — maxmemory-policy, SIGTERM handler
- [BullMQ Connections](https://docs.bullmq.io/guide/connections) — ioredis hard requirement, separate connections per Queue/Worker
- [BullMQ Graceful shutdown](https://docs.bullmq.io/guide/workers/graceful-shutdown) — worker.close() pattern
- [TanStack Start Static Prerendering](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering) — prerender config, crawlLinks, ISR
- [Railway Monorepo guide](https://docs.railway.com/guides/monorepo) — root directory, watch paths
- [OpenTelemetry Node.js getting started](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/) — SDK init order, --import flag

### Secondary (MEDIUM confidence)
- [Better Auth cross-domain cookie issue #4038](https://github.com/better-auth/better-auth/issues/4038) — confirmed cross-domain cookie failures
- [Better Auth session null with separate frontend/backend #3470](https://github.com/better-auth/better-auth/issues/3470) — session null debugging
- [Railway Turborepo integration (station)](https://station.railway.com/questions/bad-turborepo-integration-3aede9d7) — NIXPACKS_TURBO_APP_NAME confirmed broken in Railpack
- [Scaling SSE with Redis pub/sub](https://engineering.surveysparrow.com/scaling-real-time-applications-with-server-sent-events-sse-abd91f70a5c9) — subscriber leak pattern, fan-out
- [SSE with TanStack Start & TanStack Query](https://ollioddi.dev/blog/tanstack-sse-guide) — EventSource + query invalidation pattern
- [End-to-end typesafe APIs with shared Zod schemas](https://dev.to/jussinevavuori/end-to-end-typesafe-apis-with-typescript-and-shared-zod-schemas-4jmo) — shared schema monorepo pattern

### Tertiary (LOW confidence)
- [OpenTelemetry Top 10 Setup Mistakes](https://oneuptime.com/blog/post/2026-02-06-fix-top-10-opentelemetry-setup-mistakes/view) — port confusion, SDK init order
- [Turborepo + Hono template (mono-f7)](https://github.com/makyinmars/mono-f7) — community example for structure reference

---
*Research completed: 2026-03-18*
*Ready for roadmap: yes*
