# Roadmap: Kubeasy Monorepo Refactoring

## Overview

Migration from a Next.js 15 + tRPC monolith on Vercel to a Turborepo monorepo with a Hono REST API (`apps/api`) and TanStack Start frontend (`apps/web`), deployed on Railway. The migration follows a strict dependency order: monorepo scaffold and shared packages first, then the Hono API (the source of truth), then authentication, then the web frontend, then realtime SSE, then observability, and finally Railway deployment. Feature parity is the goal — same user experience, new architecture.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Monorepo Scaffold** - Turborepo workspace, shared packages, docker-compose infra (completed 2026-03-18)
- [x] **Phase 2: Hono API Migration** - All tRPC routes ported to REST, Drizzle switched to postgres.js (completed 2026-03-18)
- [x] **Phase 3: Authentication** - Better Auth on Hono, OAuth providers, API keys for CLI (completed 2026-03-18)
- [x] **Phase 4: Web Migration** - TanStack Start replacing Next.js, all pages with TanStack Query (completed 2026-03-18)
- [ ] **Phase 5: Realtime SSE** - SSE endpoint on Hono, Redis pub/sub, BullMQ job definitions
- [ ] **Phase 6: Observability** - OTel SDK in both apps, Collector config, PostHog OTLP removed
- [ ] **Phase 7: Railway Deployment** - Multi-stage Dockerfiles, per-service config, production infra

## Phase Details

### Phase 1: Monorepo Scaffold
**Goal**: The monorepo structure, shared packages, and local development infrastructure are in place so that all subsequent app development can begin with the correct foundation
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, PKG-01, PKG-02, PKG-03, PKG-04
**Success Criteria** (what must be TRUE):
  1. Running `turbo run build` from the repo root builds all packages in dependency order without errors — packages compile before the apps that import them
  2. Running `pnpm typecheck` in `packages/api-schemas` and `packages/jobs` independently passes — JIT package strategy confirmed working with no path alias issues
  3. `docker compose up` starts PostgreSQL, Redis, and OTel Collector — all three services are reachable on their expected ports
  4. `@kubeasy/api-schemas` exports Zod schemas covering all existing tRPC procedure shapes (challenges, themes, progress, XP, submissions, auth) and `@kubeasy/jobs` exports queue names and `JobPayload` types without importing from any `apps/` package
  5. `turbo build --dry-run --summarize` shows declared env vars (`DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`) in the cache key inputs
**Plans:** 4/4 plans complete

Plans:
- [ ] 01-01-PLAN.md — Turborepo + pnpm workspace scaffold and packages/typescript-config
- [ ] 01-02-PLAN.md — @kubeasy/api-schemas core domains (challenges, themes, submissions)
- [ ] 01-03-PLAN.md — @kubeasy/api-schemas remaining domains + tests + @kubeasy/jobs
- [ ] 01-04-PLAN.md — docker-compose with PostgreSQL, Redis, OTel Collector

### Phase 2: Hono API Migration
**Goal**: The Hono API runs as a long-lived Node.js process, all tRPC business logic is ported to REST endpoints validated by `@kubeasy/api-schemas`, and the Neon serverless driver is replaced by postgres.js
**Depends on**: Phase 1
**Requirements**: API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08
**Success Criteria** (what must be TRUE):
  1. `apps/api` starts with a single command locally (`pnpm dev` from the API app directory) and responds to `GET /api/challenges` with the correct JSON shape validated against `@kubeasy/api-schemas`
  2. The CLI submission endpoint (`POST /api/challenges/:slug/submit`) correctly validates that all registered objectives are present, enriches results, stores them in DB, and distributes XP — verified against the existing `submitChallenge` tRPC logic
  3. `pnpm why @neondatabase/serverless` from the repo root returns empty — the Neon serverless driver is fully removed
  4. Rate limiting on the CLI submission endpoint returns HTTP 429 after threshold is exceeded — verified with a script sending 100 requests in 10 seconds
  5. The Go CLI can call `POST /api/challenges/:slug/submit` with its existing payload structure and receive a valid response — CLI contract is preserved
**Plans:** 5/5 plans complete

Plans:
- [ ] 02-00-PLAN.md — vitest setup and test stubs (Wave 0)
- [ ] 02-01-PLAN.md — apps/api scaffold (Hono + @hono/node-server, postgres.js + Drizzle, DB schema migration, Better Auth, session middleware)
- [ ] 02-02-PLAN.md — Challenge, theme, and type REST endpoints (list with filters, detail, objectives)
- [ ] 02-03-PLAN.md — User progress, XP, submission endpoints + XP service port + CLI alias
- [ ] 02-04-PLAN.md — ioredis sliding window rate limiting on CLI submission endpoint

### Phase 3: Authentication
**Goal**: Users can authenticate via OAuth on the new cross-origin API/web split, the CLI can authenticate via API keys, and session cookies work correctly across subdomains
**Depends on**: Phase 2
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. A user can log in with GitHub, Google, or Microsoft OAuth from the web app — the OAuth callback completes, a session cookie is set by the API, and subsequent authenticated requests from the web succeed (session is not null)
  2. The session cookie is correctly scoped to `.kubeasy.dev` and sent with cross-origin requests — verified end-to-end on the staging environment with `credentials: "include"` on all web fetch calls
  3. A CLI user can create an API key via the web interface, use it in `Authorization: Bearer <key>` on the submission endpoint, and have the associated user injected into the Hono context
  4. The Vercel wildcard `*.vercel.app` is removed from `trustedOrigins` — only `kubeasy.dev` and local dev origins are trusted
  5. CORS preflight for requests including the `User-Agent` header succeeds — no 403 from missing `allowHeaders` configuration
**Plans:** 3/3 plans complete

Plans:
- [ ] 03-00-PLAN.md — Wave 0 test stubs for auth, OAuth, cookie, and API key middleware
- [ ] 03-01-PLAN.md — OAuth providers, cross-subdomain cookies, apiKey plugin, BullMQ user lifecycle hook, CORS update
- [ ] 03-02-PLAN.md — API key middleware for CLI Bearer token validation + CLI route wiring (AUTH-06 deferred to Phase 4)

### Phase 4: Web Migration
**Goal**: The TanStack Start web app replaces Next.js for all existing pages — landing, blog, challenges, dashboard — with correct SSG/SSR rendering modes and TanStack Query replacing all tRPC hooks
**Depends on**: Phase 3
**Requirements**: WEB-01, WEB-02, WEB-03, WEB-04, WEB-05, WEB-06, WEB-07
**Success Criteria** (what must be TRUE):
  1. All existing pages are accessible in the new TanStack Start app: landing (SSG), blog listing and articles (SSG), challenge listing (SSR), challenge detail (SSR), dashboard (SSR, auth-gated)
  2. `tRPC` has zero imports in `apps/web` — all data fetching goes through typed `fetch` wrappers using `z.infer<>` from `@kubeasy/api-schemas`, orchestrated by TanStack Query
  3. Landing page and blog articles are statically pre-rendered at build time — confirmed by inspecting build output for pre-rendered HTML files
  4. Challenge detail pages load without a network waterfall — route loaders prefetch data server-side and hydrate TanStack Query on the client
  5. The web app sends `credentials: "include"` on all API calls and authenticated routes correctly redirect unauthenticated users to login
**Plans:** 4/4 plans complete

Plans:
- [ ] 04-01-PLAN.md — apps/web scaffold (TanStack Start + TanStack Router, root layout, QueryClient, Better Auth client, shadcn v4)
- [ ] 04-02-PLAN.md — Typed API client (lib/api-client.ts with fetch wrappers) + TanStack Query option factories
- [ ] 04-03-PLAN.md — Landing, blog (SSG routes), login page migrated from Next.js
- [ ] 04-04-PLAN.md — Challenges, dashboard, profile, admin, themes, types pages migrated (SSR routes with loader prefetch)

### Phase 5: Realtime SSE
**Goal**: Validation status updates appear in real-time in the browser after a CLI submission — via SSE on Hono and Redis pub/sub — with no subscriber connection leaks
**Depends on**: Phase 4
**Requirements**: REAL-01, REAL-02, REAL-03, REAL-04
**Success Criteria** (what must be TRUE):
  1. After a CLI submission, the challenge detail page in the browser updates validation status automatically within 2 seconds — no manual refresh required
  2. Redis `CLIENT LIST` returns to baseline subscriber count after 10 SSE clients connect and disconnect — no subscriber instances are leaked
  3. Redis is configured with `maxmemory-policy noeviction` in docker-compose and the Railway Redis plugin — BullMQ queue keys cannot be silently evicted
  4. `@kubeasy/jobs` has populated BullMQ queue definitions and `JobPayload` types — the `apps/api` SIGTERM handler awaits `worker.close()` before process exit, verified by sending `SIGTERM` mid-job and confirming clean shutdown
**Plans:** 1/3 plans executed

Plans:
- [ ] 05-01-PLAN.md — SSE endpoint on Hono + Redis PUBLISH in submit route
- [ ] 05-02-PLAN.md — BullMQ workers for all queues + SIGTERM graceful shutdown
- [ ] 05-03-PLAN.md — useValidationSSE hook in apps/web + ChallengeMission integration

### Phase 05.1: repair workers features (INSERTED)

**Goal:** BullMQ workers have real business logic (XP calculation, analytics, Resend contacts), the submit route is refactored to dispatch async jobs instead of inline XP, the validation-specific SSE is replaced with a generic cache-invalidation SSE channel, and the onboarding API has feature parity with the original Next.js app
**Requirements**: None (inserted phase, no formal requirement IDs)
**Depends on:** Phase 5
**Plans:** 5/5 plans complete

Plans:
- [ ] 05.1-01-PLAN.md — Package updates (@kubeasy/jobs queue names + payloads, @kubeasy/api-schemas query keys, onboarding schema fix, migration, better-all)
- [ ] 05.1-02-PLAN.md — Submit route refactor (remove inline XP, dispatch BullMQ job) + generic SSE endpoint + auth USER_SIGNIN rename
- [ ] 05.1-03-PLAN.md — BullMQ workers rewrite (challenge-submission XP orchestrator, xp-award DB + SSE, user-signin parallel flow)
- [ ] 05.1-04-PLAN.md — Onboarding API routes + CLI routes (POST /user, POST /track/setup) + challenge start analytics
- [ ] 05.1-05-PLAN.md — Web useInvalidateCacheSSE hook replacing useValidationSSE + ChallengeMission update

### Phase 05.2: Missing Dashboard & Profile Features (INSERTED)

**Goal:** Dashboard page has a recharts radar chart ("Skills by Themes") and full-fidelity recent activity section (4-item preview + grouped-by-month dialog). Profile page has edit name, API token management (create/copy/delete), email subscription management via Resend, and danger zone (reset progress + delete account).
**Requirements**: None (inserted phase, no formal requirement IDs)
**Depends on:** Phase 5.1
**Plans:** 3/3 plans complete

Plans:
- [ ] 05.2-01-PLAN.md — Dashboard radar chart (recharts) + recent activity with grouped-by-month dialog
- [ ] 05.2-02-PLAN.md — Profile settings (edit name), API tokens (Better Auth client), danger zone (reset progress + delete account)
- [ ] 05.2-03-PLAN.md — Profile email preferences (TanStack Start server functions + Resend Topics API)

### Phase 6: Observability
**Goal**: All HTTP requests, database spans, and structured logs from `apps/api` and `apps/web` (SSR) flow through the OTel Collector — with PostHog OTLP export removed and a DB span smoke test confirming correct SDK initialization order
**Depends on**: Phase 5
**Requirements**: OBS-01, OBS-02, OBS-03, OBS-04, OBS-05
**Success Criteria** (what must be TRUE):
  1. After making one authenticated API request locally, the OTel Collector debug exporter output shows both an HTTP span AND a child DB query span — confirming `--import` flag initialization order is correct and pg auto-instrumentation is active
  2. `apps/api` and `apps/web` (SSR) export traces, metrics, and logs via OTLP HTTP to the local Collector — no signals go directly to PostHog
  3. PostHog is retained only for product analytics events (user actions) — the PostHog OTLP exporter from the current stack is removed
  4. The OTel Collector admin/debug port (55679) is not exposed on Railway's public network — only OTLP receiver ports 4317 and 4318 are accessible
**Plans:** 1/4 plans executed

Plans:
- [ ] 06-01-PLAN.md — pg driver migration (postgres.js to node-postgres) + @kubeasy/logger workspace package with pino
- [ ] 06-02-PLAN.md — apps/api OTel SDK (instrumentation.ts via --import flag, pg/ioredis/http/pino auto-instrumentations, PostHog OTLP removal, logger migration)
- [ ] 06-03-PLAN.md — apps/web SSR OTel SDK (server.tsx entry, http/pino instrumentations, OTLP export)
- [ ] 06-04-PLAN.md — OTel Collector config update (zpages localhost binding) + DB span smoke test verification

### Phase 7: Railway Deployment
**Goal**: Both services deploy independently on Railway with correct per-service watch paths, PostgreSQL and Redis Railway plugins replace local infra, and the OTel Collector runs as a Railway service
**Depends on**: Phase 6
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04
**Success Criteria** (what must be TRUE):
  1. Pushing a change to `apps/web` only triggers redeployment of the `web` Railway service and NOT the `api` service — per-service watch paths are working
  2. Both `apps/api` and `apps/web` Docker images build successfully using `turbo prune --scope=<app> --docker` multi-stage Dockerfiles — images are minimal with only production deps
  3. The production Railway environment uses PostgreSQL and Redis Railway plugins — `pnpm why @neondatabase/serverless` and `pnpm why upstash` return empty in both apps
  4. OTel Collector runs as a Railway service and receives OTLP from deployed `apps/api` — traces are visible in the configured backend (or Collector logs for staging)
**Plans**: TBD

Plans:
- [ ] 07-01: Multi-stage Dockerfiles for `apps/api` and `apps/web` using `turbo prune --scope --docker`
- [ ] 07-02: Railway service configuration (`Root Directory` + `Watch Paths` per service, `railway.json` per app, `NIXPACKS_TURBO_APP_NAME` NOT used)
- [ ] 07-03: Railway PostgreSQL + Redis plugins + environment variable parity with docker-compose
- [ ] 07-04: Railway OTel Collector service + final end-to-end smoke test (login, challenge view, CLI submit, SSE update all working in production)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 5.1 -> 5.2 -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Monorepo Scaffold | 4/4 | Complete   | 2026-03-18 |
| 2. Hono API Migration | 5/5 | Complete   | 2026-03-18 |
| 3. Authentication | 3/3 | Complete   | 2026-03-18 |
| 4. Web Migration | 4/4 | Complete   | 2026-03-18 |
| 5. Realtime SSE | 1/3 | In Progress|  |
| 5.1 Repair Workers | 5/5 | Complete | 2026-03-19 |
| 5.2 Dashboard & Profile | 1/3 | In Progress|  |
| 6. Observability | 1/4 | In Progress|  |
| 7. Railway Deployment | 0/4 | Not started | - |
