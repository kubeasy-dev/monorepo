# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Architecture découplée où l'API Hono est la source de vérité unique, le web TanStack Start est un client statique/hybride, et BullMQ est assez découplé pour migrer vers un worker dédié sans refacto majeur
**Current focus:** Phase 1 — Monorepo Scaffold

## Current Position

Phase: 1 of 7 (Monorepo Scaffold)
Plan: 0 of 3 in current phase
Status: Ready to plan
Last activity: 2026-03-18 — Roadmap created, phases derived from requirements

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: — min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

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

### Pending Todos

None yet.

### Blockers/Concerns

- **TanStack Start RC status**: `@tanstack/react-start` is daily-published and pre-1.0. Re-verify `prerender` config and per-route rendering API against v1.166.x documentation before starting Phase 4. Do NOT use the stale `@tanstack/start` package.
- **OTel SDK 2.x breaking changes**: Released February 2025. Verify `0.2xx` unstable channel versioning before Phase 6 install.
- **Railway Railpack `NIXPACKS_TURBO_APP_NAME`**: Confirmed broken in Railpack. Use explicit `Root Directory` + `Watch Paths` per service. Re-check at Phase 7 execution time in case Railway has fixed this.
- **Go CLI contract**: REST endpoint paths must be communicated to the CLI team before tRPC removal in Phase 2. Add alias routes in Hono as safety net during transition.

## Session Continuity

Last session: 2026-03-18
Stopped at: Roadmap created — ROADMAP.md, STATE.md, and REQUIREMENTS.md traceability written
Resume file: None
