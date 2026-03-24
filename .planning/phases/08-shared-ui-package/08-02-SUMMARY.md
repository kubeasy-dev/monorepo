---
phase: 08-shared-ui-package
plan: 02
subsystem: ui
tags: [shadcn, radix-ui, tailwind, react, monorepo, workspace-package, import-rewire]

# Dependency graph
requires:
  - "08-01 (@kubeasy/ui package scaffold)"
provides:
  - "apps/web fully consuming @kubeasy/ui — zero local ui/ copies"
  - "CSS design tokens imported from @kubeasy/ui/styles/tokens"
  - "Tailwind v4 @source directive scans packages/ui/src"
affects: [apps/web, packages/ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "apps/web imports all UI primitives via @kubeasy/ui/* sub-path imports"
    - "globals.css delegates CSS token variables to shared package via @import"
    - "utils.ts re-exports cn() from @kubeasy/ui/utils — single source of truth"

key-files:
  modified:
    - apps/web/package.json
    - apps/web/src/styles/globals.css
    - apps/web/src/lib/utils.ts
    - apps/web/src/components/challenges-filters.tsx
    - apps/web/src/components/challenge-card.tsx
    - apps/web/src/components/challenge-mission.tsx
    - apps/web/src/components/dashboard-recent-activity.tsx
    - apps/web/src/components/difficulty-badge.tsx
    - apps/web/src/components/login-card.tsx
    - apps/web/src/components/open-source-section.tsx
    - apps/web/src/components/profile-api-tokens.tsx
    - apps/web/src/components/profile-danger-zone.tsx
    - apps/web/src/components/profile-email-preferences.tsx
    - apps/web/src/components/profile-settings.tsx
    - apps/web/src/components/user-dropdown.tsx
    - apps/web/src/routes/challenges/$slug.tsx
    - apps/web/src/routes/challenges/index.tsx
    - pnpm-lock.yaml
  deleted:
    - apps/web/src/components/ui/ (17 component files removed)

key-decisions:
  - "lucide-react kept in apps/web deps — used directly in 30+ app files outside UI primitives"
  - "sonner re-added to apps/web deps — app code uses toast directly from sonner, not via @kubeasy/ui/sonner (auto-fix)"
  - "utils.ts replaced with re-export pattern — delegates cn() to @kubeasy/ui/utils canonical source"

requirements-completed: [UI-03, UI-05]

# Metrics
duration: 8min
completed: 2026-03-24
---

# Phase 8 Plan 02: apps/web Migration to @kubeasy/ui Summary

**apps/web fully rewired to consume all UI components from @kubeasy/ui — zero local shadcn copies, CSS tokens delegated to shared package, 32 imports across 14 files updated, monorepo typecheck clean**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-24T17:56:00Z
- **Completed:** 2026-03-24T18:04:26Z
- **Tasks:** 2
- **Files modified:** 18 (17 deleted)

## Accomplishments

- Added `@kubeasy/ui: workspace:*` to `apps/web` dependencies
- Removed 14 direct dependencies from `apps/web` (all Radix UI, CVA, clsx, tailwind-merge, next-themes — now in packages/ui)
- Deleted `apps/web/src/components/ui/` directory (17 component files)
- Updated `apps/web/src/styles/globals.css`: removed `:root/.dark/@theme shadow` blocks, added `@import "@kubeasy/ui/styles/tokens"` and `@source` directive
- Replaced `utils.ts` implementation with re-export from `@kubeasy/ui/utils`
- Updated 32 import statements across 14 consumer files (12 components + 2 routes)
- Full monorepo typecheck passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Update apps/web deps, globals.css, and remove local ui/ directory** - `db74ce05f` (feat)
2. **Task 2: Rewrite all component imports from @/components/ui/* to @kubeasy/ui/*** - `60d964f4d` (feat)

## Files Created/Modified

### Deleted
- `apps/web/src/components/ui/` — all 17 shadcn component files removed

### Modified
- `apps/web/package.json` — @kubeasy/ui added, Radix/CVA/clsx/tailwind-merge/next-themes removed
- `apps/web/src/styles/globals.css` — token blocks removed, @import and @source directives added
- `apps/web/src/lib/utils.ts` — replaced with `export { cn } from "@kubeasy/ui/utils"`
- `apps/web/src/components/*.tsx` (12 files) — imports updated to @kubeasy/ui/*
- `apps/web/src/routes/challenges/$slug.tsx` — badge, card, separator imports updated
- `apps/web/src/routes/challenges/index.tsx` — button import updated
- `pnpm-lock.yaml` — updated by pnpm install

## Decisions Made

- `lucide-react` kept in `apps/web` because it's imported directly by ~30 app-level files (routes, non-ui components) — not just the ui primitives
- `sonner` re-added to `apps/web` (see Deviations) — app code imports `toast` from `sonner` directly
- `utils.ts` uses re-export pattern rather than deletion to preserve `@/lib/utils` import paths used by app code

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Re-added sonner to apps/web dependencies**
- **Found during:** Task 2 (typecheck verification)
- **Issue:** Plan said to remove `sonner` from `apps/web` since it's now in `packages/ui`. However, 4 app-level files (`profile-api-tokens.tsx`, `profile-danger-zone.tsx`, `profile-email-preferences.tsx`, `profile-settings.tsx`) import `toast` directly from `sonner` — they use the library's toast function, not the `<Toaster>` UI component. Without `sonner` in `apps/web` package.json, TypeScript emitted "Cannot find module 'sonner'" errors.
- **Fix:** Re-added `"sonner": "2.0.7"` to `apps/web/package.json` dependencies
- **Files modified:** `apps/web/package.json`, `pnpm-lock.yaml`
- **Commit:** `60d964f4d` (included in Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — sonner still needed directly in apps/web)
**Impact on plan:** One dependency retained vs plan intent, does not affect the core goal (all UI component imports now from @kubeasy/ui)

## Issues Encountered

Typecheck failed first run due to missing `sonner` — fixed inline per deviation above.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None — all imports are wired to real components in `@kubeasy/ui`. No placeholder logic.

## Self-Check: PASSED

- apps/web/src/components/ui/ directory: DELETED (confirmed)
- apps/web/package.json contains @kubeasy/ui: FOUND
- apps/web/package.json does NOT contain @radix-ui: CONFIRMED
- apps/web/src/styles/globals.css contains @import "@kubeasy/ui/styles/tokens": FOUND
- apps/web/src/styles/globals.css contains @source directive: FOUND
- apps/web/src/styles/globals.css does NOT contain --primary: oklch: CONFIRMED
- apps/web/src/lib/utils.ts contains re-export from @kubeasy/ui/utils: FOUND
- Zero @/components/ui/ references in apps/web/src/: CONFIRMED
- 32 @kubeasy/ui/ imports across consumer files: CONFIRMED
- pnpm typecheck exits 0: CONFIRMED
- Commit db74ce05f (Task 1): FOUND
- Commit 60d964f4d (Task 2): FOUND

---
*Phase: 08-shared-ui-package*
*Completed: 2026-03-24*
