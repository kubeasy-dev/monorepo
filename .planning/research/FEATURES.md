# Feature Research

**Domain:** Hono REST API + Tanstack Start monorepo — migration from Next.js 15 + tRPC
**Researched:** 2026-03-18
**Confidence:** HIGH (patterns verified via official docs and multiple current sources)

---

## Feature Landscape

### Table Stakes (Users Expect These)

These are the architectural capabilities that any Hono + Tanstack Start monorepo must implement correctly. Missing or doing these wrong = broken architecture that requires rewrites.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Shared Zod schema package (`@kubeasy/api-schemas`) | REST contracts without tRPC require an explicit source of truth for req/res shapes; both TS frontend and Go CLI must agree | MEDIUM | Schemas in a standalone package — no Hono-specific imports, plain Zod. Go CLI reads OpenAPI or raw JSON shapes. Frontend uses `z.infer<>` for types. |
| CORS + credentials configuration on Hono | Cross-origin frontend (separate domain/port) requires explicit `Access-Control-Allow-Origin` and `credentials: true` | LOW | `@hono/cors` middleware must be registered BEFORE auth handler. `credentials: "include"` on all client fetches. Must list trusted origins explicitly. |
| Better Auth mounted on Hono (`/api/auth/*`) | Auth is a Hono responsibility; frontend consumes via `createAuthClient` pointing at API origin | MEDIUM | `app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))`. Session middleware extracts user into `c.var` for downstream routes. |
| Hono session middleware for protected routes | All protected routes need `ctx.user` / `ctx.session` available without repeating extraction logic | LOW | Thin middleware: `auth.api.getSession(headers)` → `c.set("user", session.user)`. Reuse pattern from existing tRPC `privateProcedure`. |
| API key validation middleware for CLI routes | CLI submits challenge results via API key (Bearer header), not session cookie | LOW | `better-auth` API key plugin: `auth.api.verifyApiKey({ body: { key } })`. Middleware extracts `Authorization: Bearer <key>`, validates, injects user. |
| Tanstack Query data fetching in Tanstack Start | Frontend data layer requires useQuery/prefetch patterns — no tRPC, direct HTTP fetch to Hono API | MEDIUM | `queryOptions` factories wrapping `fetch()` calls. Server prefetch via `Route.loader`. Client hydration via Tanstack Router dehydration. |
| Static prerendering for marketing/blog routes | Landing pages and blog posts must be prerendered at build time (no runtime SSR cost) | MEDIUM | Tanstack Start `prerender` config per route + `crawlLinks: true` for linked pages. Blog slugs listed in prerender options. ISR available for periodic refresh. |
| SSE endpoint on Hono (`/api/sse/validation/:id`) | Real-time validation status updates from CLI submission require server push without WebSocket overhead | MEDIUM | `streamSSE` from `hono/sse`. Redis `SUBSCRIBE` per channel derived from `userId:challengeSlug`. On connect: subscribe; on disconnect: unsubscribe + cleanup. |
| EventSource + query invalidation in Tanstack Query | Frontend must receive SSE events and reflect validation status update without polling | MEDIUM | `useEffect` → `new EventSource(url, { withCredentials: true })`. On message: `queryClient.invalidateQueries(["validationStatus", slug])`. `staleTime: Infinity` on query to prevent redundant fetches. |
| Turborepo pipeline with correct task ordering | `build`, `typecheck`, `dev` tasks must respect dependency graph (`api-schemas` built before consumers) | LOW | `dependsOn: ["^build"]` in turbo.json ensures package builds before app builds. Separate `dev` pipeline for parallel app startup. |

### Differentiators (Kubeasy-Specific Patterns)

These features are specific to what Kubeasy needs — not every Hono + Tanstack Start project builds these.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| CLI-compatible REST contract (`@kubeasy/api-schemas`) | Go CLI (`kubeasy-cli`) consumes the same endpoint shapes as the TS frontend — shared schemas enforce this contract without OpenAPI codegen | HIGH | Zod schemas in `packages/api-schemas` define request/response shapes. No Hono RPC (RPC client can't be consumed by Go). OpenAPI generation via `@hono/zod-openapi` optional but valuable for Go. CLI submit endpoint: `POST /api/challenges/:slug/submit`. |
| Redis pub/sub for SSE fan-out | CLI submission triggers a Redis `PUBLISH` on channel `validation:{userId}:{slug}`; Hono SSE endpoint subscribes and forwards to browser — decouples submission processing from realtime delivery | HIGH | Requires `ioredis` subscriber per SSE connection. Must clean up subscription on client disconnect (abort signal). Pattern scales across multiple API instances on Railway. |
| BullMQ job definitions in isolated package | `packages/jobs` defines queue names + job payload types; `apps/api` dispatches but doesn't implement workers — future extraction to dedicated worker service requires zero API changes | MEDIUM | Package exports: `queues` object, typed `JobPayload` union, `createQueue(name, redis)` factory. No BullMQ `Worker` class in the package — only `Queue` and `Job` types. API imports `@kubeasy/jobs`, worker app will too. |
| Hybrid rendering strategy in Tanstack Start | Marketing/blog routes prerendered (SSG), challenge pages SSR with data prefetch, validation status fully client-driven via SSE | HIGH | Route-level `ssr` flag and `prerender` option. Challenge detail: `ssr: "data-only"` or full SSR with `Route.loader` prefetch. Real-time status: client-only component with `staleTime: Infinity`. |
| Objective enrichment on submission | CLI sends raw `ObjectiveResult[]`; API enriches with display metadata from `challengeObjective` table before storing — frontend always gets display-ready data | MEDIUM | Logic already exists in tRPC router — migrate verbatim to Hono route handler. Validation: ALL registered objectives must be present (no missing, no unknown). This is a security constraint, not just UX. |
| API key plugin for user-linked CLI authentication | CLI auth uses Better Auth API key plugin (not JWT); keys are user-owned, show in dashboard, can be rotated | MEDIUM | `apiKey()` plugin in Better Auth config. Frontend creates keys via `authClient.apiKey.create()`. CLI stores key in `~/.kubeasy/config`. Hono middleware validates on CLI-facing routes. |
| OpenTelemetry via centralized OTel Collector | Both `apps/api` and `apps/web` export OTLP to a single collector in docker-compose/Railway — no direct PostHog OTel export | HIGH | `@opentelemetry/sdk-node` in API. `instrumentation.ts` pattern carried over to Hono startup. Collector config exports to Grafana Cloud or Honeycomb. Removes Vercel-specific OTel integration. |

### Anti-Features (Approaches to Deliberately Avoid)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Hono RPC client (`hc<AppType>()`) for frontend | Zero-schema-duplication type safety from Hono's RPC mode sounds ideal | Go CLI cannot consume Hono RPC types. TypeScript project boundary leaks — frontend imports from API, coupling their build environments. IDE becomes slow as routes grow (deep type instantiation). Monorepo environment conflicts when API uses Node types that frontend doesn't have | Shared `@kubeasy/api-schemas` Zod package: schemas defined once, imported by both Hono routes (for validation) and frontend (for `fetch` wrapper types and `z.infer`). Go CLI reads the same JSON shapes. |
| WebSockets for validation real-time | WebSockets seem more powerful than SSE | Bidirectional not needed — server only pushes validation result once after CLI submit. WebSocket requires stateful connection management. SSE reconnects automatically. Hono has first-class `streamSSE` helper. Railway doesn't add complexity for SSE. | SSE via `streamSSE` + Redis pub/sub. One event per submission. Client reconnects automatically on network drop. |
| Polling from frontend for validation status | Simple to implement, already works in current architecture | Wastes requests. Creates unnecessary DB load during active challenge solving. SSE is already planned and delivers instant feedback. | SSE invalidation: `queryClient.invalidateQueries` on SSE event. Single refetch triggered by server push. |
| Shared database schema package | Tempting to share Drizzle schema between API and a future worker | Drizzle schemas are tightly coupled to database connection config and migration tooling. Workers consuming schemas directly creates hidden dependencies. Breaks the "packages must not import from apps" rule | Worker communicates via BullMQ job payload types from `@kubeasy/jobs`. Worker has its own DB connection if needed (or none — API does DB writes). |
| tRPC in the new architecture | Would preserve existing type safety patterns | Contradicts the explicit decision to move to REST + Zod schemas. Re-adding tRPC defeats the purpose of decoupling API from framework. CLI compatibility requires standard HTTP. | REST with `@kubeasy/api-schemas`. Same type safety, framework-agnostic. |
| Notion-less blog migration in this milestone | Opportunity to switch to MDX or another source | Out of scope per PROJECT.md. Notion content pipeline works and adds no technical debt to this migration. Changing content source while changing architecture multiplies risk. | Keep Notion API integration as-is. Evaluate separately after monorepo is stable. |
| `"use cache"` directive in Tanstack Start | Carried over from Next.js App Router mental model | Not a Tanstack Start concept. Tanstack Start uses `loader` + `staleTime` via Tanstack Query for caching. Mixing mental models causes confusion. | `queryOptions({ staleTime: 5 * 60 * 1000 })` in route loaders. ISR via `prerender` with revalidation intervals at build config level. |

---

## Feature Dependencies

```
[Better Auth on Hono]
    └──requires──> [CORS middleware configured]
    └──requires──> [Database connection in apps/api]
    └──enables──>  [Session middleware for protected routes]
    └──enables──>  [API key plugin for CLI routes]

[@kubeasy/api-schemas package]
    └──requires──> [Zod as shared dependency]
    └──enables──>  [Type-safe fetch wrappers in apps/web]
    └──enables──>  [Route validation in apps/api]
    └──enables──>  [CLI contract compatibility (Go)]

[SSE endpoint on Hono]
    └──requires──> [Redis pub/sub connection in apps/api]
    └──requires──> [Better Auth session or API key validation]
    └──enables──>  [EventSource + query invalidation in apps/web]

[CLI submit endpoint (POST /api/challenges/:slug/submit)]
    └──requires──> [API key middleware]
    └──requires──> [@kubeasy/api-schemas ObjectiveResult schema]
    └──requires──> [Objective enrichment logic (from challengeObjective table)]
    └──triggers──> [Redis PUBLISH on validation:{userId}:{slug}]
    └──triggers──> [BullMQ job dispatch via @kubeasy/jobs]

[@kubeasy/jobs package]
    └──requires──> [BullMQ as peer dependency]
    └──requires──> [Redis connection (provided by caller, not package)]
    └──enables──>  [Future worker extraction without API changes]

[Static prerendering (marketing + blog)]
    └──requires──> [Tanstack Start prerender config]
    └──requires──> [Notion API accessible at build time]
    └──independent-of──> [Better Auth] (public routes)

[Tanstack Query prefetch in challenge routes]
    └──requires──> [@kubeasy/api-schemas for fetch shape]
    └──requires──> [Better Auth session cookie forwarded in loader fetch]
    └──enhances──> [SSE invalidation] (provides baseline data before SSE arrives)
```

### Dependency Notes

- **SSE requires Redis before anything else:** The SSE endpoint is useless without Redis pub/sub. Redis must be up in docker-compose before `apps/api` starts.
- **`@kubeasy/api-schemas` must be built first in Turborepo pipeline:** Both `apps/api` and `apps/web` depend on it. `dependsOn: ["^build"]` in turbo.json handles this.
- **API key plugin depends on Better Auth being fully configured:** The `apiKey()` plugin shares the Drizzle adapter and DB connection from the main auth instance. It's not a standalone service.
- **Objective enrichment depends on `challengeObjective` table being seeded:** The enrichment step joins submitted keys against DB rows. If the table is empty (fresh deploy), submission fails. Seed/sync must run as part of deployment.
- **Prerendering is independent of auth:** Marketing pages and blog routes are public. They can be prerendered without session context. Challenge detail pages (authenticated) must use SSR or hybrid rendering.

---

## MVP Definition

This is a migration, not a greenfield product. MVP = feature parity with the existing Next.js monolith on the new architecture.

### Launch With (v1 — migration complete)

- [ ] `@kubeasy/api-schemas` package with all existing tRPC procedure shapes converted to Zod request/response schemas
- [ ] Hono API with all existing tRPC routes ported to REST endpoints — challenge CRUD, user progress, XP, submission
- [ ] Better Auth on Hono with GitHub, Google, Microsoft OAuth + API key plugin
- [ ] CLI submit endpoint (`POST /api/challenges/:slug/submit`) with API key auth and objective enrichment
- [ ] SSE endpoint for validation status with Redis pub/sub
- [ ] Tanstack Start web with Tanstack Query replacing tRPC hooks — challenge listing, dashboard, detail pages
- [ ] Static prerendering for landing and blog routes
- [ ] Turborepo monorepo structure with correct build pipeline
- [ ] Docker-compose with Postgres, Redis, OTel Collector for local dev
- [ ] Railway deployment configuration replacing Vercel

### Add After Validation (v1.x)

- [ ] OpenAPI spec generation from `@hono/zod-openapi` — enables auto-generated Go client types, reduces manual contract maintenance
- [ ] ISR (Incremental Static Regeneration) for blog routes — currently full SSG rebuild on deploy is acceptable
- [ ] OTel Collector destination finalized (Grafana Cloud vs Honeycomb vs other) — collector accepts OTLP from day one

### Future Consideration (v2+)

- [ ] Dedicated BullMQ worker app extracting `@kubeasy/jobs` consumers — architecture is prepared, extraction happens when job volume warrants it
- [ ] Notion to MDX migration for blog — out of scope for this milestone, revisit when content velocity increases
- [ ] WebSocket upgrade if SSE proves insufficient — unlikely given unidirectional use case

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `@kubeasy/api-schemas` shared Zod package | HIGH (unblocks all REST contracts) | LOW | P1 |
| Better Auth on Hono (session + API key) | HIGH (nothing works without auth) | MEDIUM | P1 |
| CLI submit endpoint with objective enrichment | HIGH (core user flow) | MEDIUM | P1 |
| Challenge listing / filtering REST endpoints | HIGH (primary content browsing) | LOW | P1 |
| Tanstack Query fetch wrappers in apps/web | HIGH (replaces tRPC client) | MEDIUM | P1 |
| SSE endpoint + Redis pub/sub | HIGH (real-time validation UX) | HIGH | P1 |
| Static prerendering (landing + blog) | MEDIUM (SEO + performance) | MEDIUM | P1 |
| Turborepo pipeline + docker-compose | HIGH (dev experience + CI) | MEDIUM | P1 |
| `@kubeasy/jobs` BullMQ package | LOW (no new job types in scope) | LOW | P2 |
| OpenAPI spec from `@hono/zod-openapi` | MEDIUM (Go client generation) | MEDIUM | P2 |
| OTel Collector destination config | LOW (collector works day one) | LOW | P2 |
| ISR for blog routes | LOW (full rebuild acceptable) | LOW | P3 |
| Dedicated worker app extraction | LOW (future architecture) | HIGH | P3 |

**Priority key:**
- P1: Must have for migration to be considered complete
- P2: Should have, add in follow-up phase
- P3: Future consideration

---

## Sources

- [Hono RPC docs](https://hono.dev/docs/guides/rpc) — RPC constraints and monorepo tradeoffs (HIGH confidence)
- [Hono Integration — Better Auth](https://better-auth.com/docs/integrations/hono) — Auth handler setup, CORS requirements (HIGH confidence)
- [Better Auth API Key plugin](https://better-auth.com/docs/plugins/api-key) — `verifyApiKey` pattern, Hono middleware integration (HIGH confidence)
- [SSE with TanStack Start & TanStack Query — ollioddi.dev](https://ollioddi.dev/blog/tanstack-sse-guide) — Invalidation vs direct mutation strategies, `staleTime: Infinity` pattern (MEDIUM confidence)
- [TanStack Start Static Prerendering](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering) — `prerender` config, `crawlLinks`, ISR (HIGH confidence)
- [SSE, WebSockets, or Polling — Hono + React — DEV Community](https://dev.to/itaybenami/sse-websockets-or-polling-build-a-real-time-stock-app-with-react-and-hono-1h1g) — Hono `streamSSE` usage (MEDIUM confidence)
- [End-to-end typesafe APIs with shared Zod schemas — DEV Community](https://dev.to/jussinevavuori/end-to-end-typesafe-apis-with-typescript-and-shared-zod-schemas-4jmo) — Shared schema monorepo pattern (MEDIUM confidence)
- [BullMQ TypeScript setup](https://oneuptime.com/blog/post/2026-01-21-bullmq-typescript-setup/view) — Typed job definitions, shared queue factory pattern (MEDIUM confidence)
- [Hono Stacks — Hono docs](https://hono.dev/docs/concepts/stacks) — Monorepo guidance for RPC and type sharing (HIGH confidence)
- [Scaling SSE with Redis pub/sub — SurveySparrow Engineering](https://engineering.surveysparrow.com/scaling-real-time-applications-with-server-sent-events-sse-abd91f70a5c9) — Redis pub/sub fan-out pattern for multi-instance SSE (MEDIUM confidence)

---

*Feature research for: Kubeasy monorepo refactoring — Hono REST API + Tanstack Start*
*Researched: 2026-03-18*
