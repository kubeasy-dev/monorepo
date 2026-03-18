---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Phase 1 context gathered
last_updated: "2026-03-18T10:06:21.694Z"
last_activity: 2026-03-18 — Roadmap created, phases derived from requirements
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Architecture découplée où l'API Hono est la source de vérité unique, le web TanStack Start est un client statique/hybride, et BullMQ est assez découplé pour migrer vers un worker dédié sans refacto majeur
**Current focus:** Phase 1 — Monorepo Scaffold

## Current Position

Phase: 1 of 7 (Monorepo Scaffold)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-03-18 — Completed plan 01-02: @kubeasy/api-schemas package with challenges, themes, and submissions schemas

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

### Pending Todos

None yet.

### Blockers/Concerns

- **TanStack Start RC status**: `@tanstack/react-start` is daily-published and pre-1.0. Re-verify `prerender` config and per-route rendering API against v1.166.x documentation before starting Phase 4. Do NOT use the stale `@tanstack/start` package.
- **OTel SDK 2.x breaking changes**: Released February 2025. Verify `0.2xx` unstable channel versioning before Phase 6 install.
- **Railway Railpack `NIXPACKS_TURBO_APP_NAME`**: Confirmed broken in Railpack. Use explicit `Root Directory` + `Watch Paths` per service. Re-check at Phase 7 execution time in case Railway has fixed this.
- **Go CLI contract**: REST endpoint paths must be communicated to the CLI team before tRPC removal in Phase 2. Add alias routes in Hono as safety net during transition.

## Session Continuity

Last session: 2026-03-18T10:51:44Z
Stopped at: Completed 01-02-PLAN.md
Resume file: .planning/phases/01-monorepo-scaffold/01-03-PLAN.md
