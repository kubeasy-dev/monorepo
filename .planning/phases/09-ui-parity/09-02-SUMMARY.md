---
phase: 09-ui-parity
plan: "02"
subsystem: apps/web
tags: [ui-parity, landing-page, components]
dependency_graph:
  requires: []
  provides: [PARITY-02]
  affects: [apps/web/src/routes/index.tsx]
tech_stack:
  added: []
  patterns: [Button component usage, asChild pattern for anchor wrapping]
key_files:
  created: []
  modified:
    - apps/web/src/components/how-it-works-section.tsx
    - apps/web/src/components/early-access-section.tsx
    - apps/web/src/components/cta-section.tsx
decisions:
  - "Use Button asChild with <a> tags in apps/web instead of Next.js Link — keeps TanStack Router patterns while matching visual styling"
  - "how-it-works-section: add mouse event handlers (onMouseEnter/Leave) and role=group for carousel accessibility — matches website reference exactly"
  - "Button @kubeasy/ui/button used in early-access and cta sections for visual parity with website's Button component"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-03-24"
  tasks_completed: 1
  files_modified: 3
---

# Phase 09 Plan 02: Landing Page Section Visual Parity Summary

Verified and fixed visual parity for all 7 landing page section components between `apps/web` and `../website`. Three components required fixes; four were already identical.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Diff and fix all 7 landing page section components | 34f978e69 | how-it-works-section.tsx, early-access-section.tsx, cta-section.tsx |

## Diff Results by Component

| Component | Status | Changes |
|-----------|--------|---------|
| stats-section.tsx | Identical | None |
| hero-section.tsx | Already adapted | Uses `<a>` tags (correct for TanStack Router) |
| features-section.tsx | Already adapted | Uses `<a>` tags (correct for TanStack Router) |
| open-source-section.tsx | Already adapted | Uses `@kubeasy/ui/button` (correct per Phase 8) |
| how-it-works-section.tsx | Fixed | Added `onMouseEnter`/`onMouseLeave` + `role="group"` on carousel wrapper |
| early-access-section.tsx | Fixed | Replaced raw `<a>` with `Button variant="outline" asChild` matching website |
| cta-section.tsx | Fixed | Replaced raw `<a>` with `Button size="lg" asChild` matching website |

## Deviations from Plan

None — plan executed as written. The "minor class tweaks" path applied (all 7 in a single pass).

## Known Stubs

None.

## Self-Check: PASSED

Files modified exist and were committed at 34f978e69. `pnpm typecheck` passes (6/6 tasks successful).
