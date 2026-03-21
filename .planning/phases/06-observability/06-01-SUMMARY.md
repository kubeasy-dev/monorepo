---
phase: 06-observability
plan: 01
subsystem: database, infra
tags: [pg, node-postgres, drizzle-orm, pino, logger, opentelemetry]

requires:
  - phase: 02-hono-api-migration
    provides: apps/api Hono server with postgres.js-based database connection and lib/logger.ts

provides:
  - apps/api uses pg Pool with drizzle-orm/node-postgres adapter (OTel-instrumentable)
  - packages/logger workspace package with pino-based logger preserving existing API shape
  - @kubeasy/logger exports logger and LogAttributes for use across workspace

affects: [06-02, 06-03, 06-04]

tech-stack:
  added: [pg@^8.20.0, @types/pg, pino@^10.3.1, pino-pretty@^13.0.0, drizzle-orm/node-postgres]
  patterns:
    - logger wrapper over pino instance preserving (message, attributes?) call signature
    - workspace package with direct TypeScript source export (no dist/ build step)

key-files:
  created:
    - packages/logger/package.json
    - packages/logger/src/index.ts
    - packages/logger/tsconfig.json
  modified:
    - apps/api/src/db/index.ts
    - apps/api/package.json
    - pnpm-lock.yaml

key-decisions:
  - "pg Pool replaces postgres.js — enables OTel auto-instrumentation via @opentelemetry/instrumentation-pg; postgres.js has no OTel instrumentation support"
  - "pino logger wrapped in (message, attributes?) adapter functions — preserves existing logger API contract without requiring callers to swap argument order"
  - "pino-pretty version capped at ^13.0.0 — ^14.0.0 does not exist on npm registry (latest is 13.1.3)"
  - "pinoInstance exposed via wrapper functions not directly — callers continue using logger.info(msg, attrs) without migration"

patterns-established:
  - "Workspace logger package: exports { logger, LogAttributes } from packages/logger/src/index.ts"
  - "Pino transport: pino-pretty in dev (NODE_ENV != production), raw JSON in production"

requirements-completed: [OBS-02, OBS-04]

duration: 15min
completed: 2026-03-21
---

# Phase 06 Plan 01: Database Driver + Logger Package Summary

**pg Pool replaces postgres.js in apps/api for OTel-instrumentation readiness, and @kubeasy/logger workspace package with pino provides structured logging with preserved API signature**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-21T13:35:00Z
- **Completed:** 2026-03-21T13:50:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Replaced postgres.js with pg Pool in apps/api/src/db/index.ts — enables @opentelemetry/instrumentation-pg auto-instrumentation in later plans
- Switched drizzle adapter from drizzle-orm/postgres-js to drizzle-orm/node-postgres
- Created packages/logger workspace package with pino, exporting logger with info/warn/error/debug methods that match the existing API contract (message, attributes?) call signature
- All 6 workspace packages typecheck cleanly including the new logger package

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate apps/api from postgres.js to pg** - `21549cd` (feat)
2. **Task 2: Create @kubeasy/logger workspace package with pino** - `d9f2d8b` (feat)

## Files Created/Modified

- `apps/api/src/db/index.ts` - Now uses `new Pool({ connectionString })` + `drizzle-orm/node-postgres`
- `apps/api/package.json` - Added `pg`, `@types/pg`; removed `postgres`
- `packages/logger/package.json` - New workspace package `@kubeasy/logger` with pino dependency
- `packages/logger/src/index.ts` - pino-based logger with wrapper functions preserving `(message, attributes?)` API
- `packages/logger/tsconfig.json` - Extends `@kubeasy/typescript-config/base.json`, noEmit mode
- `pnpm-lock.yaml` - Updated for pg install and new logger package

## Decisions Made

- **pg over postgres.js**: pg is the standard node-postgres driver with first-class OTel instrumentation support via `@opentelemetry/instrumentation-pg`. postgres.js has no OTel instrumentation package available.
- **pino wrapper functions**: pino's native API is `logger.info(obj, message)` but existing callers use `logger.info(message, obj)`. Rather than migrating all call sites, wrapper functions translate the argument order, maintaining backward compatibility.
- **pino-pretty version**: Plan specified `^14.0.0` but that version doesn't exist. Latest is `13.1.3`, so `^13.0.0` was used instead (auto-fix Rule 3).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected pino-pretty version in package.json**
- **Found during:** Task 2 (pnpm install for new @kubeasy/logger package)
- **Issue:** Plan specified `"pino-pretty": "^14.0.0"` but npm registry has no such version; latest is 13.1.3
- **Fix:** Changed to `"pino-pretty": "^13.0.0"` which resolves correctly
- **Files modified:** packages/logger/package.json
- **Verification:** `pnpm install` succeeded; `pnpm -r typecheck` passes
- **Committed in:** `d9f2d8b` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — invalid package version)
**Impact on plan:** Trivial version correction, no scope change.

## Issues Encountered

None beyond the pino-pretty version fix noted above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- apps/api database connection ready for OTel pg instrumentation (@opentelemetry/instrumentation-pg)
- @kubeasy/logger available for import across all workspace packages
- apps/api can swap its lib/logger.ts import for @kubeasy/logger in Phase 06-02

---
*Phase: 06-observability*
*Completed: 2026-03-21*

## Self-Check: PASSED

- FOUND: apps/api/src/db/index.ts
- FOUND: packages/logger/src/index.ts
- FOUND: packages/logger/package.json
- FOUND: packages/logger/tsconfig.json
- FOUND: commit 21549cd (Task 1)
- FOUND: commit d9f2d8b (Task 2)
