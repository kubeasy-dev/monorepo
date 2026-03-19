---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 05.1-05-PLAN.md
last_updated: "2026-03-19T22:01:52.282Z"
last_activity: "2026-03-18 — Completed plan 04-03: landing page, blog SSG routes, and login page migration"
progress:
  total_phases: 8
  completed_phases: 6
  total_plans: 24
  completed_plans: 24
  percent: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Architecture découplée où l'API Hono est la source de vérité unique, le web TanStack Start est un client statique/hybride, et BullMQ est assez découplé pour migrer vers un worker dédié sans refacto majeur
**Current focus:** Phase 1 — Monorepo Scaffold

## Current Position

Phase: 1 of 7 (Monorepo Scaffold)
Plan: 3 of 3 in current phase (04-web-migration)
Status: In progress
Last activity: 2026-03-18 — Completed plan 04-03: landing page, blog SSG routes, and login page migration

Progress: [░░░░░░░░░░] 8%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 2.5 min
- Total execution time: 0.08 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-monorepo-scaffold | 2 | 5 min | 2.5 min |

**Recent Trend:**
- Last 5 plans: 3 min, 2 min
- Trend: stable

*Updated after each plan completion*
| Phase 01-monorepo-scaffold P04 | 2 | 1 tasks | 2 files |
| Phase 01-monorepo-scaffold P03 | 3 | 2 tasks | 14 files |
| Phase 02-hono-api-migration P00 | 6 | 2 tasks | 8 files |
| Phase 02-hono-api-migration P01 | 7 | 3 tasks | 16 files |
| Phase 02-hono-api-migration P03 | 5 | 3 tasks | 13 files |
| Phase 02-hono-api-migration P02 | 5 | 2 tasks | 4 files |
| Phase 02-hono-api-migration P04 | 2 | 1 tasks | 2 files |
| Phase 03-authentication P00 | 3 | 2 tasks | 4 files |
| Phase 03-authentication P01 | 1 | 3 tasks | 6 files |
| Phase 03-authentication P02 | 2 | 2 tasks | 2 files |
| Phase 04-web-migration P01 | 14 | 2 tasks | 36 files |
| Phase 04-web-migration P02 | 167 | 2 tasks | 4 files |
| Phase 04-web-migration P03 | 5 | 2 tasks | 21 files |
| Phase 04-web-migration P04 | 35 | 2 tasks | 27 files |
| Phase 05-realtime-sse P01 | 1 | 2 tasks | 3 files |
| Phase 05-realtime-sse PP02 | 2 | 2 tasks | 5 files |
| Phase 05-realtime-sse P03 | 1 | 2 tasks | 2 files |
| Phase 05.1-repair-workers-features P01 | 2 | 2 tasks | 10 files |
| Phase 05.1-repair-workers-features P02 | 2 | 2 tasks | 3 files |
| Phase 05.1-repair-workers-features P03 | 2 | 2 tasks | 4 files |
| Phase 05.1-repair-workers-features P04 | 3 | 2 tasks | 5 files |
| Phase 05.1-repair-workers-features P05 | 5 | 1 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Scaffold]: JIT strategy for `packages/api-schemas` and `packages/jobs` — TypeScript source exported directly, no `dist/` build step. Consumers (Vite for web, tsx/esbuild for api) handle transpilation.
- [Scaffold]: `envMode: "loose"` acceptable in Phase 1 only — must switch to strict with declared env vars before Phase 7 Railway deploy.
- [Auth]: Better Auth `crossSubdomainCookies: { enabled: true, domain: ".kubeasy.dev" }` required — validate cross-domain cookie flow on staging before declaring Phase 3 complete.
- [SSE]: Dedicated ioredis subscriber per SSE connection (never shared). Abort signal cleanup + 30s heartbeat both required.
- [OTel]: `--import ./dist/instrumentation.js` flag mandatory — never import `@kubeasy/*` inside `instrumentation.ts`.
- [api-schemas]: All 6 domain exports declared upfront in package.json exports map; progress/xp/auth file stubs added in Plan 03 to avoid consumer import churn.
- [api-schemas]: peerDependencies for zod to avoid duplicate installs across workspace.
- [Phase 01-monorepo-scaffold]: OTel Collector uses contrib image for zpages support; Redis uses noeviction policy for BullMQ; debug exporter only in Phase 1
- [Phase 01-monorepo-scaffold]: Use bullmq ConnectionOptions in factory.ts instead of IORedis import to avoid ioredis version conflict
- [Phase 01-monorepo-scaffold]: api-schemas vitest.config.ts added as standalone package-level config to avoid root setup file dependency
- [Phase 02-hono-api-migration]: vitest root set to src/ so test:run discovers __tests__/ relative to source root; todo tests exit 0 enabling CI-friendly test infrastructure setup
- [Phase 02-hono-api-migration]: Use @better-auth/drizzle-adapter as separate package (not better-auth/adapters/drizzle subpath which doesn't exist in v1.5.5)
- [Phase 02-hono-api-migration]: NodeNext .js extension rule: all relative imports in apps/api/src must use .js extension due to typescript-config/node.json moduleResolution
- [Phase 02-hono-api-migration]: Inline objectiveCategoryValues in challenge.ts to eliminate @/schemas/challengeObjectives cross-dependency from Next.js app
- [Phase 02-hono-api-migration]: Promise.all() for parallel deletes in resetChallenge and resetProgress instead of better-all
- [Phase 02-hono-api-migration]: CLI alias at /api/cli/challenges/:slug/submit re-uses the same submit Hono instance via cli.route
- [Phase 02-hono-api-migration]: Sub-router env types: each Hono sub-router must declare its own Variables type for user/session to enable typed c.get() access
- [Phase 02-hono-api-migration]: Rate limit key is user-scoped only (submit:{userId}) since requireAuth blocks unauthenticated requests before rate limiter runs — no IP fallback needed
- [Phase 02-hono-api-migration]: CLI alias at /api/cli/challenges/:slug/submit inherits rate limiting via shared submit Hono router — no changes to cli/index.ts required
- [Phase 03-authentication]: Test stub pattern mirrors existing middleware.test.ts: import { describe, it } from vitest, describe blocks, it.todo() placeholders
- [Phase 03-authentication]: BullMQ queue initialized as module-level singleton using redis.options directly (ioredis RedisOptions equals BullMQ ConnectionOptions)
- [Phase 03-authentication]: oAuthProxy plugin dropped — Railway deployment, not Vercel; no need for OAuth preview proxying
- [Phase 03-authentication]: databaseHooks user.create.after fire-and-forget BullMQ dispatch; errors caught and logged, never thrown
- [Phase 03-authentication]: trustedOrigins and CORS origin list kept in sync: localhost:3000/3001, kubeasy.dev, api.kubeasy.dev; no vercel.app wildcard
- [Phase 03-authentication]: Use result.key.referenceId (not userId) for better-auth 1.5+ API key user lookup
- [Phase 03-authentication]: AUTH-06 (apps/web Better Auth client) deferred to Phase 4 — apps/web does not exist yet
- [Phase 04-web-migration]: StartClient takes no router prop in TanStack Start v1.166.14 — auto-hydrates via Vite plugin; setupRouterSsrQueryIntegration absent from react-query@5.91.0 — SSR handled by framework automatically
- [Phase 04-web-migration]: apps/web routeTree.gen.ts manually written for scaffold — router-generator@1.166.13 conflict detection bug with pathless layouts and sibling routes; Vite plugin regenerates at dev/build time
- [Phase 04-web-migration]: Notion client ported to apps/web using process.env directly — typed @/env module and captureServerException (PostHog) not available in TanStack Start app
- [Phase 04-web-migration]: Blog SSG uses crawlLinks: true — listing page Link tags discovered by vite-plugin-ssr at build time for article pages
- [Phase 04-web-migration]: Button asChild not supported in @base-ui/react — all asChild patterns replaced with plain <a> elements with appropriate styles
- [Phase 04-web-migration]: Progress routes use /:slug pattern (GET /progress/:slug, POST /progress/:slug/start, DELETE /progress/:slug/reset); latest validation at GET /submissions/:slug/latest; xp endpoint is /xp/history; user name update uses PATCH
- [Phase 04-web-migration]: Hybrid rendering on challenge detail: loader prefetches base data for SSR; latestValidationOptions is client-only (useQuery) because it requires auth session unavailable at SSR time
- [Phase 04-web-migration]: Admin role guard per-route via beforeLoad — TanStack Router pathless layout bug prevents shared admin layout; LucideIcon uses static icons map from lucide-react (no next/dynamic in TanStack Start)
- [Phase 05-realtime-sse]: Fresh new Redis(url) per SSE connection (never redis.duplicate()) — independent subscriber that can be cleanly quit on disconnect without affecting the shared singleton
- [Phase 05-realtime-sse]: Publish fires on BOTH validated:true and validated:false — browser always receives the latest submission state
- [Phase 05-realtime-sse]: Worker factory pattern: createXxxWorker() returns Worker instance enabling array-based batch close() on shutdown
- [Phase 05-realtime-sse]: BullMQ Worker connection uses parsed host/port from REDIS_URL (not url string); maxRetriesPerRequest: null mandatory
- [Phase 05-realtime-sse]: useValidationSSE enabled only when status === in_progress — no SSE connection for not_started or completed challenges
- [Phase 05-realtime-sse]: SSE update is silent/background — validation-update event only calls invalidateQueries, no SSE-specific UI state
- [Phase 05.1-repair-workers-features]: USER_LIFECYCLE renamed to USER_SIGNIN — queue fires on sign-in events; ChallengeSubmissionPayload drops xpAwarded/isFirstChallenge — workers compute XP themselves
- [Phase 05.1-repair-workers-features]: queryKeys shared in api-schemas package; onboarding schema drops all Vercel Workflow webhook columns — replaced by BullMQ workers
- [Phase 05.1-repair-workers-features]: submit.ts response simplified to { success, objectives } — no XP fields exposed to CLI; workers handle all XP side effects
- [Phase 05.1-repair-workers-features]: SSE channel renamed to invalidate-cache:{userId} with queryKey payload — browser calls invalidateQueries on any cache-invalidation event
- [Phase 05.1-repair-workers-features]: provider: unknown placeholder in USER_SIGNIN payload — worker resolves actual provider from account table if needed
- [Phase 05.1-repair-workers-features]: Cast difficulty to ChallengeDifficulty at worker boundary — ChallengeSubmissionPayload uses string to avoid circular imports from jobs package
- [Phase 05.1-repair-workers-features]: user-lifecycle.worker.ts kept as filename; function renamed to createUserSigninWorker — index.ts updated accordingly
- [Phase 05.1-repair-workers-features]: Resend contact creation wrapped in try/catch inside better-all block — failure logs and returns null, does not block identify/trackSignup
- [Phase 05.1-repair-workers-features]: CliEnv type declared locally in cli/index.ts as { Variables: { user: SessionUser; session: null } } — matches apiKeyMiddleware injection, avoids null-check burden from AppEnv
- [Phase 05.1-repair-workers-features]: useInvalidateCacheSSE takes only enabled: boolean (no slug) — SSE channel is user-scoped; server publishes specific queryKey to invalidate

### Roadmap Evolution

- Phase 05.1 inserted after Phase 5: repair workers features (URGENT)

### Pending Todos

None yet.

### Blockers/Concerns

- **TanStack Start RC status**: `@tanstack/react-start` is daily-published and pre-1.0. Re-verify `prerender` config and per-route rendering API against v1.166.x documentation before starting Phase 4. Do NOT use the stale `@tanstack/start` package.
- **OTel SDK 2.x breaking changes**: Released February 2025. Verify `0.2xx` unstable channel versioning before Phase 6 install.
- **Railway Railpack `NIXPACKS_TURBO_APP_NAME`**: Confirmed broken in Railpack. Use explicit `Root Directory` + `Watch Paths` per service. Re-check at Phase 7 execution time in case Railway has fixed this.
- **Go CLI contract**: REST endpoint paths must be communicated to the CLI team before tRPC removal in Phase 2. Add alias routes in Hono as safety net during transition.

## Session Continuity

Last session: 2026-03-19T22:01:52.277Z
Stopped at: Completed 05.1-05-PLAN.md
Resume file: None
