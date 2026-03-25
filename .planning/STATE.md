---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: UI Parity + Micro-Frontend + Admin
status: Ready to plan
stopped_at: Phase 12 context gathered
last_updated: "2026-03-25T07:17:57.533Z"
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 11
  completed_plans: 11
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** API Hono source de vérité unique, web TanStack Start client hybride, BullMQ découplé pour extraction future
**Current focus:** Phase 11 — admin-features

## Current Position

Phase: 12
Plan: Not started

## Performance Metrics

**Velocity (v1.0):**

- Total plans completed: 34
- v1.0 phases: 9 phases (including 2 inserted)

**By Phase (v1.1):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| — | — | — | — |

*Updated after each plan completion*
| Phase 08-shared-ui-package P01 | 12 | 2 tasks | 22 files |
| Phase 08-shared-ui-package P02 | 8 | 2 tasks | 18 files |
| Phase 09-ui-parity P02 | 2min | 1 tasks | 3 files |
| Phase 09-ui-parity P04 | 8 | 2 tasks | 2 files |
| Phase 09-ui-parity P03 | 3 | 1 tasks | 1 files |
| Phase 09-ui-parity P01 | 15 | 2 tasks | 6 files |
| Phase 10-micro-frontend-dev-proxy-admin-scaffold P01 | 190s | 2 tasks | 16 files |
| Phase 10-micro-frontend-dev-proxy-admin-scaffold P02 | 12min | 2 tasks | 7 files |
| Phase 10-micro-frontend-dev-proxy-admin-scaffold P02 | 35min | 3 tasks | 10 files |
| Phase 11-admin-features P01 | 12 | 3 tasks | 5 files |
| Phase 11-admin-features P02 | 10 | 2 tasks | 6 files |
| Phase 11-admin-features P03 | 113 | 2 tasks | 6 files |

## Accumulated Context

### Decisions

All v1.0 decisions archived in PROJECT.md Key Decisions table.

v1.1 key constraints:

- DB schema: no changes this milestone — pure UI/infra work
- CLI API compatibility: admin endpoints must not break existing CLI routes
- Caddy DNS cutover is highest-risk step — keep `api.kubeasy.dev` active until Caddy routing confirmed stable
- [Phase 08-shared-ui-package]: JIT pattern for @kubeasy/ui: export .tsx source directly, no build step, sub-path exports only (no barrel)
- [Phase 08-shared-ui-package]: react/react-dom declared as peerDependencies in @kubeasy/ui to avoid duplicate React instances per consuming app
- [Phase 08-shared-ui-package]: lucide-react kept in apps/web — used directly across 30+ app files outside UI primitives
- [Phase 08-shared-ui-package]: sonner re-added to apps/web — app code uses toast directly, not via @kubeasy/ui/sonner
- [Phase 08-shared-ui-package]: utils.ts re-exports cn from @kubeasy/ui/utils — preserves @/lib/utils import paths
- [Phase 09-ui-parity]: Use Button asChild with anchor tags in apps/web for visual parity with website while keeping TanStack Router patterns
- [Phase 09-ui-parity]: Dashboard stat cards use Award/Trophy/Star/Flame icons with Completed/Points/Rank/Day Streak labels matching reference design
- [Phase 09-ui-parity]: Quick Actions use Button asChild from @kubeasy/ui/button wrapping TanStack Link/anchor
- [Phase 09-ui-parity]: Challenge detail back button uses Button ghost asChild wrapping Link (not raw Link with manual classes)
- [Phase 09-ui-parity]: TableOfContentsClient merged into single file — no separate client wrapper needed in TanStack Router
- [Phase 09-ui-parity]: Blog category filter uses useState in route component, derived from post list (no URL search params)
- [Phase 10-micro-frontend-dev-proxy-admin-scaffold]: @tanstack/router-plugin pinned to 1.167.4 matching lockfile (compatible with react-router 1.168.3)
- [Phase 10-micro-frontend-dev-proxy-admin-scaffold]: admin auth-client baseURL defaults to localhost:3024 (MFE proxy) not localhost:3001 — browser cookies use same origin
- [Phase 10-micro-frontend-dev-proxy-admin-scaffold]: Cross-app redirects use window.location.href not router.navigate — admin and web are separate SPAs on different ports
- [Phase 10-micro-frontend-dev-proxy-admin-scaffold]: Caddyfile created in apps/caddy/ as reference template only — not wired to docker-compose yet (Phase 12)
- [Phase 10-micro-frontend-dev-proxy-admin-scaffold]: Auth guard redirects use relative paths (/login, /) when all apps share the same origin via MFE proxy
- [Phase 10-micro-frontend-dev-proxy-admin-scaffold]: Admin top-nav style aligned with web app header (h-20, font-black, neo-border-thick) post-verification
- [Phase 11-admin-features]: D-01 — Better Auth adminClient() used for all user mutations (ban/unban/setRole) — no custom Hono PATCH endpoints for ADMIN-15/16/17
- [Phase 11-admin-features]: D-02 — TanStack Query already installed and QueryClient wired in apps/admin/src/main.tsx — no new installation needed
- [Phase 11-admin-features]: D-03 — PATCH /api/admin/challenges/:id/available added as part of plan 11-01 alongside GET endpoints
- [Phase 11-admin-features]: D-04 — No sessionMiddleware added to admin router — global middleware in app.ts on /api/* already handles it; adding again would double-apply
- [Phase 11-admin-features]: D-05 — 3-plan split: API layer (11-01) → Challenges UI (11-02) and Users UI (11-03) both in Wave 2 (parallel, no file conflicts)
- [Phase 11-admin-features]: avgAttempts stat derived in UI as totalSubmissions/totalStarts — AdminStatsOutputSchema unchanged (no new field needed)
- [Phase 11-admin-features]: Self-action guard — UI layer enforces it (session.user.id === target.id → disable dropdown items); Better Auth may enforce additionally but UI guard is the primary protection
- [Phase 11-admin-features]: query-options.ts is additive — plan 11-02 adds challenge factories, plan 11-03 appends user factories to same file (no conflict since sequential wavewise)
- [Phase 11-admin-features]: sessionMiddleware confirmed global in app.ts on /api/* — no additional wiring needed in admin routes
- [Phase 11-admin-features]: Correlated subqueries used for per-challenge totalSubmissions/successfulSubmissions to avoid double-groupBy complexity
- [Phase 11-admin-features]: challenges route registered after challenges/sync in admin index to preserve Hono route priority
- [Phase 11-admin-features]: @kubeasy/api-schemas added as dependency to apps/admin — was missing from package.json, required for type-safe API contracts in admin app
- [Phase 11-admin-features]: avgAttempts derived in UI as totalSubmissions/totalStarts — no backend schema change needed, derived in component
- [Phase 11-admin-features]: query-options.ts includes both challenges and users factories — created as one file since 11-02 and 11-03 run in parallel wave 2
- [Phase 11-admin-features]: Native textarea used for ban reason input — @kubeasy/ui has no Textarea component

### Pending Todos

None — Phase 11 audit completed during planning (confirmed 0 existing admin GET endpoints, only challenges-sync with API key auth).

### Phase 11 Key Decisions

- [Phase 11]: No migration needed — challenge.available, user.banned, user.banReason, user.role all exist in DB schema
- [Phase 11]: Wave 2 plans (11-02 and 11-03) can run in parallel — they touch different files (only query-options.ts is shared, handled additively)
- [Phase 11]: Challenge theme/type display: JOIN with challengeTheme and challengeType tables to return display names (not slugs) in the API response
- [Phase 11]: Pagination: server-side 50/page with page query param; client manages page state with useState

### Blockers/Concerns

None — v1.0 in production, v1.1 scope defined.

## Session Continuity

Last session: 2026-03-25T07:17:57.530Z
Stopped at: Phase 12 context gathered
Resume file: .planning/phases/12-caddy-production-railway-deployment/12-CONTEXT.md
