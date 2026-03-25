---
phase: 12-caddy-production-railway-deployment
plan: "01"
subsystem: infra
tags: [caddy, nginx, docker, railway, spa, reverse-proxy]

requires:
  - phase: 07-railway-deployment
    provides: Railway deployment patterns, existing railway.json RAILPACK config, production services api/web

provides:
  - Caddy Dockerfile (caddy:alpine single-stage) with Caddyfile baked in
  - Updated Caddyfile with env var placeholders for upstream addresses
  - Admin Dockerfile (node:22-alpine build + nginx:alpine serve) for Vite SPA
  - nginx.conf for /admin/ SPA routing with alias + try_files fallback
  - railway.json for both caddy and admin services with DOCKERFILE builder

affects:
  - 12-02 (Railway dashboard: create caddy/admin services, set env vars, deploy)

tech-stack:
  added: [caddy:alpine (Docker base image), nginx:alpine (Docker base image)]
  patterns:
    - Single-stage Dockerfile for Caddy (config-only image, no build step)
    - Two-stage Dockerfile for Vite SPA (node build + nginx:alpine serve)
    - Caddy env var placeholders {$VAR_NAME} for Railway runtime injection
    - nginx alias directive for SPA serving when URL path differs from filesystem path

key-files:
  created:
    - apps/caddy/Dockerfile
    - apps/caddy/railway.json
    - apps/admin/Dockerfile
    - apps/admin/nginx.conf
    - apps/admin/railway.json
  modified:
    - apps/caddy/Caddyfile

key-decisions:
  - "Use DOCKERFILE builder for both caddy and admin services (not RAILPACK — RAILPACK is Node.js-oriented)"
  - "Caddy Dockerfile is single-stage caddy:alpine — no build step needed, only config copy"
  - "Admin Dockerfile build context is repo root — needed for workspace packages (packages/) and pnpm-lock.yaml"
  - "nginx uses alias not root for /admin/ location — Vite dist/ has no admin/ subdirectory"
  - "Caddy env var syntax is {$VAR_NAME} not ${VAR_NAME} — Caddy-specific, not shell syntax"

patterns-established:
  - "Pattern: Caddy env var placeholder — {$API_UPSTREAM} syntax for Railway runtime injection"
  - "Pattern: nginx SPA base-path serving — alias + try_files for Vite apps with non-root base"

requirements-completed: [MFE-03, MFE-04, ADMIN-18]

duration: 2min
completed: "2026-03-25"
---

# Phase 12 Plan 01: Caddy + Admin Infrastructure Artifacts Summary

**Caddy single-stage caddy:alpine Dockerfile with env var placeholders in Caddyfile, plus two-stage node/nginx admin Dockerfile with SPA routing config — both Railway-ready with DOCKERFILE builder railway.json**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-25T07:50:18Z
- **Completed:** 2026-03-25T07:52:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Updated Caddyfile to use `{$API_UPSTREAM}`, `{$ADMIN_UPSTREAM}`, `{$WEB_UPSTREAM}` env var placeholders, replacing hardcoded Docker Compose hostnames
- Created Caddy Dockerfile (single-stage `caddy:alpine`) and railway.json with DOCKERFILE builder
- Created admin Dockerfile (two-stage: `node:22-alpine` builds Vite SPA, `nginx:alpine` serves static dist/)
- Created nginx.conf with correct `alias` directive for `/admin/` SPA routing, gzip, aggressive asset caching
- Created admin railway.json with DOCKERFILE builder, watchPatterns including `packages/**`

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Caddyfile + create Caddy Dockerfile and railway.json** - `62bed705f` (feat)
2. **Task 2: Create admin Dockerfile, nginx.conf, and railway.json** - `45e8d5090` (feat)

## Files Created/Modified

- `apps/caddy/Caddyfile` - Updated: hardcoded hostnames replaced with `{$API_UPSTREAM}`, `{$ADMIN_UPSTREAM}`, `{$WEB_UPSTREAM}`; comment updated to reflect env var purpose
- `apps/caddy/Dockerfile` - Created: `FROM caddy:alpine`, copies Caddyfile to `/etc/caddy/Caddyfile`
- `apps/caddy/railway.json` - Created: DOCKERFILE builder, `dockerfilePath: apps/caddy/Dockerfile`, watchPatterns `apps/caddy/**`
- `apps/admin/Dockerfile` - Created: Stage 1 `node:22-alpine` builds Vite SPA with full workspace context; Stage 2 `nginx:alpine` copies dist/
- `apps/admin/nginx.conf` - Created: `/admin/` location with `alias /usr/share/nginx/html/`, `try_files` SPA fallback, gzip, immutable cache headers for hashed assets
- `apps/admin/railway.json` - Created: DOCKERFILE builder, `dockerfilePath: apps/admin/Dockerfile`, watchPatterns `apps/admin/**` and `packages/**`

## Decisions Made

- Used DOCKERFILE builder (not RAILPACK) for both Caddy and admin services. RAILPACK is designed for Node.js long-running processes; Caddy is a binary config and admin is static files served by nginx.
- Admin Dockerfile build context is the repo root (not `apps/admin/`). This is required because pnpm workspace packages (`@kubeasy/ui`, `@kubeasy/api-schemas`) live in `packages/` which would be outside the build context otherwise.
- nginx `alias` directive (not `root`) for `/admin/` location. Vite builds to `dist/` (no `admin/` subdirectory), but URL paths start with `/admin/`. `root` would look for `/usr/share/nginx/html/admin/` which doesn't exist.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Worktree branch was behind `main` (missing `apps/caddy/` and `apps/admin/` directories). Merged `main` into the worktree branch before executing tasks. This is expected workflow for a worktree spawned from an older commit.
- pnpm dependencies not installed in worktree — ran `pnpm install --frozen-lockfile` before first commit to satisfy pre-commit hooks.

## User Setup Required

None - no external service configuration required for this plan. Railway dashboard setup (creating services, setting env vars, deploying) is addressed in plan 12-02.

## Next Phase Readiness

- All 6 infrastructure artifact files are committed and ready for Railway deployment
- Plan 12-02 will handle: Railway dashboard service creation, env var configuration (`API_UPSTREAM`, `WEB_UPSTREAM`, `ADMIN_UPSTREAM`, `VITE_API_URL`), and deployment verification
- Caddy service must have Railway env vars set before deploying: `API_UPSTREAM=api.railway.internal:3001`, `WEB_UPSTREAM=web.railway.internal:3000`, `ADMIN_UPSTREAM=admin.railway.internal:3002`
- Admin service must have `VITE_API_URL=https://kubeasy.dev` set as a build-time env var (Vite bakes it into the bundle)

---
*Phase: 12-caddy-production-railway-deployment*
*Completed: 2026-03-25*
