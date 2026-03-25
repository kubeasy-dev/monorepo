---
phase: 11-admin-features
plan: 02
subsystem: ui
tags: [react, tanstack-query, vite, admin, neo-brutalist, optimistic-update]

# Dependency graph
requires:
  - phase: 11-admin-features/11-01
    provides: GET /api/admin/challenges, GET /api/admin/challenges/stats, PATCH /api/admin/challenges/:id/available endpoints
provides:
  - "apiFetch wrapper for admin app pointing at VITE_API_URL with credentials: include"
  - "adminChallengesOptions and adminChallengesStatsOptions TanStack Query factories"
  - "ChallengesStats: 4 neo-brutalist stat cards (completion rate, success rate, total submissions, avg attempts)"
  - "ChallengesTable: all 8 columns with difficulty Badge and optimistic Switch toggle"
  - "Full /challenges route page wiring both components with useSuspenseQuery"
affects: [11-03]

# Tech tracking
tech-stack:
  added:
    - "@kubeasy/api-schemas added as dependency to apps/admin"
  patterns:
    - "apiFetch wrapper in apps/admin/src/lib/api-client.ts — mirrors apps/web pattern but simpler (no SSR cookie forwarding needed)"
    - "queryOptions factories in apps/admin/src/lib/query-options.ts — one factory per endpoint, named adminX for disambiguation"
    - "Optimistic update pattern: cancelQueries → setQueryData → return previous → onError rollback → onSettled invalidate"
    - "Split Suspense: route component holds Suspense boundary, inner component calls useSuspenseQuery"

key-files:
  created:
    - apps/admin/src/lib/api-client.ts
    - apps/admin/src/lib/query-options.ts
    - apps/admin/src/components/challenges-stats.tsx
    - apps/admin/src/components/challenges-table.tsx
  modified:
    - apps/admin/src/routes/challenges/index.tsx
    - apps/admin/package.json

key-decisions:
  - "@kubeasy/api-schemas added as dependency to apps/admin — was missing, required for type-safe API contracts"
  - "Suspense boundary placed in ChallengesPage parent, useSuspenseQuery called in ChallengesContent child — standard split to avoid flash"
  - "avgAttempts derived in UI as totalSubmissions/totalStarts — no schema change needed per research recommendation"

patterns-established:
  - "Admin api-client: simple apiFetch with no SSR logic (admin is client-only Vite app)"
  - "Query options file: one function per endpoint, plan 11-03 will add adminUsersOptions to the same file"

requirements-completed: [ADMIN-03, ADMIN-04, ADMIN-05]

# Metrics
duration: 10min
completed: 2026-03-25
---

# Phase 11 Plan 02: Admin Challenges Page Summary

**TanStack Query-powered admin challenges page with 4 neo-brutalist stat cards, 8-column table, and optimistic availability toggle**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-25T06:49:34Z
- **Completed:** 2026-03-25T06:59:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created apiFetch wrapper and TanStack Query option factories for admin app
- Built ChallengesStats component with 4 stat cards (completion rate, success rate, total submissions, avg attempts derived from totalSubmissions/totalStarts)
- Built ChallengesTable with 8 columns including difficulty Badge with color coding and Switch with optimistic update mutation
- Replaced placeholder stub in challenges/index.tsx with full page wiring both components via useSuspenseQuery

## Task Commits

1. **Task 1: Create api-client and query-options infrastructure** - `da2c92f04` (feat)
2. **Task 2: Build challenges stats cards, table, and route page** - `6369c6498` (feat)

## Files Created/Modified

- `apps/admin/src/lib/api-client.ts` — apiFetch wrapper with VITE_API_URL and credentials: include
- `apps/admin/src/lib/query-options.ts` — adminChallengesOptions and adminChallengesStatsOptions query factories
- `apps/admin/src/components/challenges-stats.tsx` — 4 neo-brutalist stat cards consuming AdminStatsOutput
- `apps/admin/src/components/challenges-table.tsx` — table with Switch optimistic update mutation
- `apps/admin/src/routes/challenges/index.tsx` — full challenges page replacing placeholder stub
- `apps/admin/package.json` — added @kubeasy/api-schemas as dependency

## Decisions Made

- Added `@kubeasy/api-schemas` as a dependency to `apps/admin` (was missing, blocking import of type contracts)
- Placed Suspense boundary in ChallengesPage parent, called useSuspenseQuery in ChallengesContent child to avoid flash during loading
- avgAttempts derived in UI as `totalSubmissions / totalStarts` per research recommendation — no schema change needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing @kubeasy/api-schemas dependency to apps/admin**
- **Found during:** Task 1 (api-client and query-options infrastructure)
- **Issue:** `@kubeasy/api-schemas` was not listed in apps/admin's package.json, causing TypeScript to fail resolving `@kubeasy/api-schemas/challenges` sub-path exports
- **Fix:** Added `"@kubeasy/api-schemas": "workspace:*"` to dependencies and ran `pnpm install`
- **Files modified:** apps/admin/package.json, pnpm-lock.yaml
- **Verification:** `pnpm typecheck` passes clean after fix
- **Committed in:** `da2c92f04` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking dependency)
**Impact on plan:** Missing dependency is a prerequisite, fix is necessary. No scope creep.

## Issues Encountered

None beyond the missing dependency (auto-fixed above).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- api-client.ts and query-options.ts are established patterns ready for Plan 11-03 to add adminUsersOptions
- All 5 admin API endpoints from Plan 11-01 are consumed: challenges list, stats, and availability toggle
- pnpm typecheck passes clean across the full monorepo
- Plan 11-03 (users page) can reuse api-client.ts directly and add to query-options.ts without merge conflicts

---
*Phase: 11-admin-features*
*Completed: 2026-03-25*
