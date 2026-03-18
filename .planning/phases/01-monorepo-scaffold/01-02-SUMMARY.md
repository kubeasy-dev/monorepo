---
phase: 01-monorepo-scaffold
plan: 02
subsystem: api
tags: [zod, typescript, monorepo, api-schemas, challenges, themes, submissions]

# Dependency graph
requires:
  - phase: 01-monorepo-scaffold/01-01
    provides: packages/typescript-config and turbo.json monorepo scaffold

provides:
  - "@kubeasy/api-schemas package with Zod schemas for challenges, themes, and submissions domains"
  - "ChallengeListInputSchema, ChallengeListItemSchema, ChallengeDetailSchema covering all challenge router shapes"
  - "ThemeSchema, ThemeListOutputSchema for theme router"
  - "ObjectiveResultSchema, ObjectiveSchema, ChallengeSubmitInputSchema, ChallengeSubmitOutputSchema for CLI submission contract"
  - "JIT exports pattern: TypeScript source exported directly, no dist/ build step"

affects:
  - 01-monorepo-scaffold/01-03
  - phase-02-hono-api
  - any consumer importing @kubeasy/api-schemas

# Tech tracking
tech-stack:
  added: ["@kubeasy/api-schemas (workspace package)"]
  patterns:
    - "JIT exports: TypeScript source exported directly via package.json exports, no compilation step"
    - "peerDependencies for zod to avoid duplicate installs across workspace"
    - "Inline all enum values — no @/ imports in shared packages"

key-files:
  created:
    - packages/api-schemas/package.json
    - packages/api-schemas/tsconfig.json
    - packages/api-schemas/src/index.ts
    - packages/api-schemas/src/challenges.ts
    - packages/api-schemas/src/themes.ts
    - packages/api-schemas/src/submissions.ts
  modified:
    - pnpm-lock.yaml

key-decisions:
  - "Declared all 6 domain exports upfront in package.json (progress, xp, auth stubs added in Plan 03) to avoid requiring consumers to update their imports later"
  - "Used peerDependencies for zod ^4.0.0 rather than direct dependency — consumers already have zod, avoids duplicate"
  - "ChallengeSubmitSuccessOutputSchema includes streakBonus and currentStreak to match actual router return shape (plan spec had these but router confirms them)"

patterns-established:
  - "Shared Zod schemas in packages/ use peerDependencies for framework-agnostic libs"
  - "All TypeScript types inferred via z.infer<typeof Schema> and co-exported alongside schema"

requirements-completed: [PKG-01, PKG-02]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 1 Plan 02: @kubeasy/api-schemas — Challenges, Themes & Submissions Summary

**Zod schema package with 3 of 6 API domains: challenges (full CRUD + admin shapes), themes (list/get), and submissions (ObjectiveResult, Objective, CLI submit contract)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T10:49:51Z
- **Completed:** 2026-03-18T10:51:44Z
- **Tasks:** 1
- **Files modified:** 6 created + pnpm-lock.yaml

## Accomplishments

- Created `@kubeasy/api-schemas` workspace package with JIT TypeScript exports (no dist/ build)
- Implemented `src/challenges.ts` covering all 9 challenge router procedures: list, getBySlug, create, delete, setAvailability, getObjectives, adminList, adminStats, plus ChallengeDifficultySchema
- Implemented `src/themes.ts`: ThemeSchema, ThemeListOutputSchema, ThemeGetInputSchema
- Implemented `src/submissions.ts`: full CLI submission contract with ObjectiveCategory enum, ObjectiveResult, Objective, and discriminated union ChallengeSubmitOutput (success/failure)
- Zero `@/` path imports — all enum values inlined; TypeScript + Biome checks pass

## Task Commits

1. **Task 1: Create @kubeasy/api-schemas package scaffold with challenges, themes, and submissions schemas** - `af04c807b` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `packages/api-schemas/package.json` - Package definition, JIT exports for 6 domain subpaths, peerDependencies for zod ^4.0.0
- `packages/api-schemas/tsconfig.json` - Extends @kubeasy/typescript-config/base.json, noEmit
- `packages/api-schemas/src/index.ts` - Barrel export for challenges, themes, submissions
- `packages/api-schemas/src/challenges.ts` - All challenge router shapes + admin schemas, ChallengeDifficultySchema inlined
- `packages/api-schemas/src/themes.ts` - ThemeSchema, list/get output shapes
- `packages/api-schemas/src/submissions.ts` - ObjectiveCategorySchema, ObjectiveResult, Objective, ChallengeSubmitInput/SuccessOutput/FailureOutput/Output
- `pnpm-lock.yaml` - Updated for new workspace package

## Decisions Made

- Declared all 6 domain exports upfront in package.json exports map (progress, xp, auth are stub paths until Plan 03 creates those files) — avoids consumer import churn later
- `ChallengeSubmitSuccessOutputSchema` includes `streakBonus` and `currentStreak` fields to match the actual `submitChallenge` router return shape (cross-verified against `server/api/routers/userProgress.ts`)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `@kubeasy/api-schemas` is ready for Plan 03 which will add `progress`, `xp`, and `auth` domain schemas
- Package is consumable by any future Hono API (Phase 2) or TanStack Start app without modification
- Remaining 3 domain exports declared in package.json, will be fulfilled in Plan 03

---
*Phase: 01-monorepo-scaffold*
*Completed: 2026-03-18*

## Self-Check: PASSED

- FOUND: packages/api-schemas/package.json
- FOUND: packages/api-schemas/tsconfig.json
- FOUND: packages/api-schemas/src/index.ts
- FOUND: packages/api-schemas/src/challenges.ts
- FOUND: packages/api-schemas/src/themes.ts
- FOUND: packages/api-schemas/src/submissions.ts
- FOUND commit: af04c807b
