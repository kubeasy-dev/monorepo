---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: UI Parity + Micro-Frontend + Admin
status: Ready to plan
stopped_at: Completed discuss-phase 10 — context captured
last_updated: "2026-03-24T21:00:00.000Z"
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 6
  completed_plans: 6
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** API Hono source de vérité unique, web TanStack Start client hybride, BullMQ découplé pour extraction future
**Current focus:** Phase 10 — micro-frontend-dev-proxy-admin-scaffold

## Current Position

Phase: 10
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

### Pending Todos

- Phase 11 start: audit `apps/api/src/routes/admin/` to confirm which Hono admin endpoints already exist vs. need adding before writing UI

### Phase 10 Key Decisions
- [Phase 10]: Turborepo built-in proxy for unified localhost:3024 — researcher to investigate exact 2.x API
- [Phase 10]: apps/admin = pure Vite CSR SPA + TanStack Router (no SSR)
- [Phase 10]: Admin auth guard client-side in __root.tsx via Better Auth useSession(), redirects to VITE_WEB_URL
- [Phase 10]: Admin shell = top nav with Challenges/Users/Settings placeholder + neo-brutalist @kubeasy/ui
- [Phase 10]: Caddyfile is a reference template only (prod routing docs, not used locally)

### Blockers/Concerns

None — v1.0 in production, v1.1 scope defined.

## Session Continuity

Last session: 2026-03-24T19:25:38.801Z
Stopped at: Completed 09-ui-parity-01-PLAN.md
Resume file: None
