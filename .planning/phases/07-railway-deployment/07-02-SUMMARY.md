---
phase: 07-railway-deployment
plan: "02"
subsystem: infra
tags: [railway, docker, deployment, health-check, watch-patterns]

# Dependency graph
requires:
  - phase: 07-railway-deployment-01
    provides: Dockerfiles for api and web services
provides:
  - apps/api/railway.json Railway config-as-code with DOCKERFILE builder, watch patterns, health check, OTel start command
  - apps/web/railway.json Railway config-as-code with DOCKERFILE builder, watch patterns, health check, Vinxi start command
affects: [railway-deployment, ci-cd]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "railway.json config-as-code: per-service Railway configuration files checked into git, referenced via RAILWAY_CONFIG_PATH service variable"
    - "Watch patterns: apps/{service}/** + packages/** ensure monorepo dependency changes trigger rebuilds for affected services only"

key-files:
  created:
    - apps/api/railway.json
    - apps/web/railway.json
  modified: []

key-decisions:
  - "web startCommand is node dist/server/server.js (not node .output/server/index.mjs) — Vinxi/TanStack Start outputs to dist/ per plan correction from 07-01"
  - "watchPatterns for each service include both its own app directory and packages/** to catch shared package changes"
  - "api startCommand includes --import ./dist/instrumentation.js flag for OTel instrumentation at startup"
  - "Each railway.json must be activated via RAILWAY_CONFIG_PATH=apps/{service}/railway.json service variable — Railway ignores root directory for config files"

patterns-established:
  - "Railway config-as-code pattern: railway.json per service, RAILWAY_CONFIG_PATH env var on Railway dashboard"

requirements-completed: [DEPLOY-02]

# Metrics
duration: 2min
completed: 2026-03-21
---

# Phase 7 Plan 02: Railway Service Config Summary

**Per-service railway.json config-as-code files with DOCKERFILE builder, monorepo watch patterns (apps/{service}/** + packages/**), health check endpoints, and production start commands**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-21T18:48:39Z
- **Completed:** 2026-03-21T18:50:40Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- `apps/api/railway.json`: DOCKERFILE builder pointing to `apps/api/Dockerfile`, watch patterns for `apps/api/**` and `packages/**`, healthcheck at `/api/health`, OTel-aware start command `node --import ./dist/instrumentation.js dist/index.js`
- `apps/web/railway.json`: DOCKERFILE builder pointing to `apps/web/Dockerfile`, watch patterns for `apps/web/**` and `packages/**`, healthcheck at `/`, start command `node dist/server/server.js`
- Both files use `ON_FAILURE` restart policy with 3 max retries for crash recovery

## Task Commits

Each task was committed atomically:

1. **Task 1: Create railway.json for both api and web services** - `a573ecb5a` (feat)

**Plan metadata:** (pending final docs commit)

## Files Created/Modified

- `apps/api/railway.json` - Railway service configuration for the Hono API service
- `apps/web/railway.json` - Railway service configuration for the TanStack Start web service

## Decisions Made

- **web startCommand corrected to `node dist/server/server.js`**: Plan specified `node .output/server/index.mjs` but the actual Dockerfile CMD (from Plan 07-01) uses `dist/server/server.js` — Vinxi/TanStack Start outputs to `dist/` not `.output/`. The railway.json startCommand must match the Dockerfile CMD.
- **watchPatterns include `packages/**`**: Shared package changes (api-schemas, logger, jobs) must trigger rebuilds for services that consume them.
- **RAILWAY_CONFIG_PATH required**: Railway does not follow Root Directory for railway.json discovery — each service needs `RAILWAY_CONFIG_PATH=apps/{service}/railway.json` set as a service variable on the Railway dashboard.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected web startCommand from stale `.output/` path to actual `dist/` path**

- **Found during:** Task 1 (Create railway.json for both api and web services)
- **Issue:** Plan specified `startCommand: "node .output/server/index.mjs"` but the web Dockerfile (created in Plan 07-01) uses `CMD ["node", "dist/server/server.js"]` — Vinxi/TanStack Start outputs to `dist/` directory, not `.output/`
- **Fix:** Used `node dist/server/server.js` to match the actual Dockerfile CMD, consistent with the STATE.md decision recorded in Plan 07-01
- **Files modified:** apps/web/railway.json
- **Verification:** File verified with node JSON.parse check; start command matches Dockerfile CMD
- **Committed in:** a573ecb5a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 stale-path bug)
**Impact on plan:** Essential correctness fix — startCommand must match Dockerfile CMD or Railway override would fail. No scope creep.

## Issues Encountered

None beyond the startCommand correction documented above.

## User Setup Required

**Railway service variables must be configured manually on the Railway dashboard.**

For each service, set the following service variable:
- `api` service: `RAILWAY_CONFIG_PATH=apps/api/railway.json`
- `web` service: `RAILWAY_CONFIG_PATH=apps/web/railway.json`

Without this variable, Railway will not find the railway.json files since they are not at the repo root.

## Next Phase Readiness

- Both railway.json files are ready for Railway service configuration
- Next: Plan 07-03 will set up Railway project, link services, and configure environment variables
- The railway.json files establish the build/deploy contract; remaining work is dashboard/CLI setup

---
*Phase: 07-railway-deployment*
*Completed: 2026-03-21*
