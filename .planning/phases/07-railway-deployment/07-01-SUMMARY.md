---
phase: 07-railway-deployment
plan: 01
subsystem: infra
tags: [docker, turborepo, pnpm, tanstack-start, hono, multi-stage-build]

requires:
  - phase: 06-observability
    provides: OTel instrumentation via --import ./dist/instrumentation.js flag

provides:
  - apps/api 3-stage Docker image built via turbo prune --docker (node:22-alpine, non-root, port 3001)
  - apps/web 3-stage Docker image built via turbo prune --docker (node:22-alpine, non-root, port 3000)
  - apps/api/package.json build script ("build": "tsc")
  - apps/api/tsconfig.json noEmit:false override (enables tsc to emit dist/)

affects: [08-railway-config, 09-production-launch]

tech-stack:
  added: []
  patterns:
    - "turbo prune --docker 3-stage pattern (prepare/builder/runner) for monorepo Docker builds"
    - "pnpm workspace packages copied to runner alongside dist/ for workspace symlink resolution"
    - "prerender restricted to static routes only (crawlLinks:false, autoStaticPathsDiscovery:false) to avoid API calls during build"

key-files:
  created:
    - apps/api/Dockerfile
    - apps/api/.dockerignore
    - apps/web/Dockerfile
    - apps/web/.dockerignore
  modified:
    - apps/api/package.json (added "build": "tsc")
    - apps/api/tsconfig.json (added noEmit:false)
    - apps/web/vite.config.ts (prerender crawlLinks:false, autoStaticPathsDiscovery:false)
    - apps/web/src/lib/auth.functions.ts (try-catch around getSession)
    - apps/web/src/routes/login.tsx (window guard for SSR)

key-decisions:
  - "apps/web Vinxi/TanStack Start outputs to dist/ not .output/ — plan had stale path; updated Dockerfile CMD to node dist/server/server.js"
  - "apps/api tsconfig.json base.json inherits noEmit:true — must explicitly override noEmit:false in apps/api/tsconfig.json for tsc to emit dist/"
  - "apps/web prerender disabled for API-dependent routes — crawlLinks:false and autoStaticPathsDiscovery:false prevents SSR errors during Docker build where no API is available"
  - "getSessionFn wrapped in try-catch — auth service unavailable during prerender must silently return null (redirect to login), not crash the build"
  - "apps/api runner copies full node_modules + packages/ — workspace symlinks require both to resolve @kubeasy/* imports at runtime"

requirements-completed: [DEPLOY-01]

duration: 16min
completed: 2026-03-21
---

# Phase 7 Plan 01: Docker Multi-Stage Builds Summary

**3-stage turbo prune --docker Dockerfiles for apps/api (Hono) and apps/web (TanStack Start), with 4 auto-fixed SSR and build correctness bugs**

## Performance

- **Duration:** 16 min
- **Started:** 2026-03-21T18:30:28Z
- **Completed:** 2026-03-21T18:46:30Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- apps/api Docker image builds successfully using turbo prune --docker 3-stage pattern; tsc compiles src/ to dist/; container starts as appuser on port 3001 with `--import ./dist/instrumentation.js` OTel flag
- apps/web Docker image builds successfully using turbo prune --docker 3-stage pattern; Vinxi/TanStack Start build produces dist/server/server.js; container starts as appuser on port 3000
- Both images run as non-root user (appuser in appgroup) with minimal runner layers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create apps/api Dockerfile + build script + .dockerignore** - `d06202063` (feat)
2. **Task 2: Create apps/web Dockerfile + .dockerignore** - `d6f718bda` (feat)

## Files Created/Modified

- `apps/api/Dockerfile` - 3-stage turbo prune build for Hono API
- `apps/api/.dockerignore` - Excludes node_modules, .env, dist, .turbo, .git
- `apps/api/package.json` - Added "build": "tsc" script
- `apps/api/tsconfig.json` - Added noEmit:false to override base.json inheritance
- `apps/web/Dockerfile` - 3-stage turbo prune build for TanStack Start web
- `apps/web/.dockerignore` - Excludes node_modules, .env, dist, .turbo, .git
- `apps/web/vite.config.ts` - Restricted prerender to crawlLinks:false, autoStaticPathsDiscovery:false
- `apps/web/src/lib/auth.functions.ts` - Wrapped getSession in try-catch for SSR safety
- `apps/web/src/routes/login.tsx` - Added typeof window guard for SSR prerender

## Decisions Made

- Vinxi/TanStack Start outputs to `dist/` not `.output/` in v1.166.x — plan referenced `.output/server/index.mjs` which is stale; actual entry is `dist/server/server.js`
- apps/api runner copies full `/node_modules` and `/packages` alongside `dist/` — workspace package symlinks need both present for `@kubeasy/logger`, `@kubeasy/api-schemas`, `@kubeasy/jobs` to resolve at runtime
- Prerender limited to explicitly static paths only — pages that call the API backend (`/challenges`, `/themes`, `/dashboard`, etc.) cannot be prerendered during Docker build since no API server is running

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] tsconfig.json base inherits noEmit:true preventing tsc emit**
- **Found during:** Task 1 (Create apps/api Dockerfile)
- **Issue:** `@kubeasy/typescript-config/base.json` has `"noEmit": true`. apps/api/tsconfig.json extended this without override, so `tsc` ran successfully (exit 0) but emitted no files to `dist/`
- **Fix:** Added `"noEmit": false` to `apps/api/tsconfig.json` compilerOptions
- **Files modified:** apps/api/tsconfig.json
- **Verification:** Docker build completed without `/app/apps/api/dist` not found error
- **Committed in:** d06202063 (Task 1)

**2. [Rule 1 - Bug] Vinxi build outputs to dist/ not .output/**
- **Found during:** Task 2 (Create apps/web Dockerfile)
- **Issue:** Plan specified `CMD ["node", ".output/server/index.mjs"]` but TanStack Start v1.166.x/Vinxi outputs to `dist/server/server.js`
- **Fix:** Updated Dockerfile runner COPY and CMD to use `dist/` path
- **Files modified:** apps/web/Dockerfile, apps/web/.dockerignore
- **Verification:** Docker build completed, runner stage COPY succeeded
- **Committed in:** d6f718bda (Task 2)

**3. [Rule 1 - Bug] Prerender crawls API-dependent routes, fails during Docker build**
- **Found during:** Task 2 (apps/web Docker build)
- **Issue:** `crawlLinks:true` + `autoStaticPathsDiscovery:true` caused prerender to crawl `/challenges`, `/themes`, `/dashboard`, etc. which call the API backend. No API runs during Docker build → Internal Server Error → build fails
- **Fix:** Set `crawlLinks:false` and `autoStaticPathsDiscovery:false` in vite.config.ts prerender section. SSR still works at runtime; only build-time prerender is restricted to `/`
- **Files modified:** apps/web/vite.config.ts
- **Verification:** Docker build completes, prerender only renders 1 page: `/`
- **Committed in:** d6f718bda (Task 2)

**4. [Rule 1 - Bug] getSessionFn throws when auth API unavailable during SSR prerender**
- **Found during:** Task 2 (apps/web Docker build, prerender crawling /login, /onboarding, /auth/callback)
- **Issue:** `authClient.getSession()` makes HTTP call to `VITE_API_URL` (localhost:3001). During prerender, no API is running → uncaught exception → prerender crashes
- **Fix:** Wrapped `authClient.getSession()` in try-catch returning null on error — same as unauthenticated: redirects to /login safely
- **Files modified:** apps/web/src/lib/auth.functions.ts
- **Verification:** Prerender of /login succeeded (redirected cleanly)
- **Committed in:** d6f718bda (Task 2)

**5. [Rule 1 - Bug] login.tsx uses window.location.origin during SSR prerender**
- **Found during:** Task 2 (apps/web Docker build, prerender crawling /login)
- **Issue:** `LoginPage` component accessed `window.location.origin` directly in component body. `window` is undefined during Node.js SSR → ReferenceError
- **Fix:** Added `typeof window !== "undefined"` guard with empty string fallback
- **Files modified:** apps/web/src/routes/login.tsx
- **Verification:** Prerender of /login no longer throws ReferenceError
- **Committed in:** d6f718bda (Task 2)

---

**Total deviations:** 5 auto-fixed (all Rule 1 — bugs)
**Impact on plan:** All auto-fixes necessary for correctness. Fixes 1-2 unblocked the builds; fixes 3-5 resolved SSR/prerender bugs that were pre-existing but only surfaced during Docker build-time prerender.

## Issues Encountered

- Docker build context transfer is slow (~30s) due to large node_modules in the repo. The `.dockerignore` at root level was not in place — only per-app dockerignore files were created. The build still works but could be optimized with a root-level `.dockerignore` (deferred).

## Next Phase Readiness

- Both Docker images build and are tagged `kubeasy-api` and `kubeasy-web` locally
- Ready for Phase 07-02: Railway service configuration with environment variables, healthcheck routes, and docker-compose.yml for local full-stack testing
- No blockers

---
*Phase: 07-railway-deployment*
*Completed: 2026-03-21*
