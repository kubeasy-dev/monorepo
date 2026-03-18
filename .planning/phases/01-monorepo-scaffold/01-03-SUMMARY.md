---
phase: 01-monorepo-scaffold
plan: 03
subsystem: shared-packages
tags: [api-schemas, jobs, bullmq, zod, typescript, workspace]
dependency_graph:
  requires: [01-02]
  provides: [api-schemas-complete, jobs-package]
  affects: [phase-2-api, phase-4-web]
tech_stack:
  added: [bullmq ^5.71.0]
  patterns: [zod-parse-tests, bullmq-connection-options, workspace-star-deps]
key_files:
  created:
    - packages/api-schemas/src/progress.ts
    - packages/api-schemas/src/xp.ts
    - packages/api-schemas/src/auth.ts
    - packages/api-schemas/__tests__/schemas.test.ts
    - packages/api-schemas/vitest.config.ts
    - packages/jobs/package.json
    - packages/jobs/tsconfig.json
    - packages/jobs/src/queue-names.ts
    - packages/jobs/src/payloads.ts
    - packages/jobs/src/factory.ts
    - packages/jobs/src/index.ts
  modified:
    - packages/api-schemas/src/index.ts
    - package.json
    - pnpm-lock.yaml
decisions:
  - "Use bullmq ConnectionOptions in factory.ts instead of IORedis import to avoid ioredis version conflict between jobs@5.10.0 and bullmq@5.71.0 bundled ioredis@5.9.3"
  - "Remove ioredis as direct dependency from jobs package — factory.ts only needs ConnectionOptions from bullmq"
  - "Add vitest.config.ts to api-schemas package to avoid inheriting root vitest.setup.ts requirement"
metrics:
  duration: 3 min
  completed: "2026-03-18"
  tasks_completed: 2
  files_created: 11
  files_modified: 3
---

# Phase 1 Plan 3: Complete api-schemas and Create jobs Package Summary

**One-liner:** All 6 api-schemas domains (Zod parse schemas) plus @kubeasy/jobs (BullMQ queue names, typed payloads, createQueue factory) wired into root workspace.

## What Was Built

### Task 1: Complete api-schemas (progress, xp, auth domains) with parse tests

Added the remaining 3 domain schema files to `packages/api-schemas/src/`:

- **progress.ts**: `ChallengeStatusSchema`, `CompletionPercentageInputSchema`, `XpAndRankOutputSchema`, `StreakOutputSchema`, `CompleteChallengeInputSchema/OutputSchema`, `GetStatusInputSchema/OutputSchema`, `StartChallengeInputSchema/OutputSchema`, `ResetChallengeInputSchema/OutputSchema`, `GetSubmissionsInputSchema`, `LatestValidationStatusInputSchema/OutputSchema`
- **xp.ts**: `XpActionSchema`, `XpTransactionSchema` (with nullable challenge fields from getRecentGains join)
- **auth.ts**: `UserSchema`, `SessionSchema`, `ErrorResponseSchema`

Updated `src/index.ts` barrel to export all 6 domains (challenges, themes, progress, xp, submissions, auth).

Added `__tests__/schemas.test.ts` with 14 parse tests covering: `ChallengeListInputSchema`, `ChallengeSubmitInputSchema`, `ObjectiveResultSchema`, enum schemas (ChallengeDifficulty, ChallengeStatus, ObjectiveCategory), `UserSchema`, `SlugInputSchema`.

Added `vitest.config.ts` at package level (standalone config without root `vitest.setup.ts` dependency).

### Task 2: Create @kubeasy/jobs and wire workspace deps

Created `packages/jobs/` with 4 source files:

- **queue-names.ts**: `QUEUE_NAMES` const object (`CHALLENGE_SUBMISSION`, `XP_AWARD`) and `QueueName` type
- **payloads.ts**: `ChallengeSubmissionPayload`, `XpAwardPayload`, `JobPayload` mapped type
- **factory.ts**: `createQueue<N extends QueueName>` generic factory using BullMQ `Queue` with standard retry/cleanup defaults
- **index.ts**: barrel re-export of all queue primitives

Updated root `package.json` dependencies to include `"@kubeasy/api-schemas": "workspace:*"` and `"@kubeasy/jobs": "workspace:*"`.

## Verification Results

- `pnpm --filter @kubeasy/api-schemas typecheck`: PASS
- `pnpm --filter @kubeasy/api-schemas test`: PASS (14/14 tests)
- `pnpm --filter @kubeasy/jobs typecheck`: PASS
- No `from "@/` imports in packages/api-schemas/src/ or packages/jobs/src/
- No `apps/` imports in packages/jobs/src/
- Root package.json contains both workspace:* deps

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] IORedis version conflict in factory.ts**
- **Found during:** Task 2 typecheck
- **Issue:** `factory.ts` imported `IORedis` from `ioredis@5.10.0` while bullmq bundles `ioredis@5.9.3`, causing type incompatibility in `ConnectionOptions` parameter
- **Fix:** Changed factory signature to use `ConnectionOptions` from `bullmq` directly, removed `ioredis` as a direct dependency from `packages/jobs/package.json`
- **Files modified:** `packages/jobs/src/factory.ts`, `packages/jobs/package.json`
- **Commit:** 280b8e0c7

**2. [Rule 3 - Blocking] Missing vitest.config.ts in api-schemas package**
- **Found during:** Task 1 test run
- **Issue:** `pnpm --filter @kubeasy/api-schemas test` failed with "Cannot find module vitest.setup.ts" because the root `vitest.config.ts` requires a setup file that doesn't exist at package level
- **Fix:** Added `packages/api-schemas/vitest.config.ts` with standalone config (no setupFiles dependency)
- **Files modified:** `packages/api-schemas/vitest.config.ts`
- **Commit:** f2f6a7c03

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | f2f6a7c03 | feat(01-03): complete api-schemas package (progress, xp, auth domains) |
| Task 2 | 280b8e0c7 | feat(01-03): create @kubeasy/jobs package and wire workspace deps |

## Self-Check: PASSED

Files verified:
- packages/api-schemas/src/progress.ts: FOUND
- packages/api-schemas/src/xp.ts: FOUND
- packages/api-schemas/src/auth.ts: FOUND
- packages/api-schemas/__tests__/schemas.test.ts: FOUND
- packages/jobs/src/queue-names.ts: FOUND
- packages/jobs/src/factory.ts: FOUND
- packages/jobs/src/index.ts: FOUND

Commits verified:
- f2f6a7c03: FOUND
- 280b8e0c7: FOUND
