---
phase: 06-observability
plan: 04
subsystem: infra
tags: [opentelemetry, otel-collector, docker-compose, zpages, otlp]

# Dependency graph
requires:
  - phase: 06-02
    provides: OTel SDK initialized in apps/api with pg instrumentation
  - phase: 06-03
    provides: OTel SDK initialized in apps/web
provides:
  - OTel Collector zpages bound to localhost (not public network)
  - .env.example files documenting OTEL_EXPORTER_OTLP_ENDPOINT for both apps
  - Smoke test procedure documented for DB span verification
affects: [07-railway-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "zpages debug UI bound to localhost:55679 inside container — host port mapping exists but does not reach internal localhost binding"
    - ".env.example files document all required env vars including OTLP endpoint"

key-files:
  created:
    - apps/api/.env.example
    - apps/web/.env.example
  modified:
    - docker/otel-collector-config.yaml

key-decisions:
  - "zpages binds to localhost:55679 inside container — Railway cannot expose it publicly even with port mapping; OTLP receivers remain on 0.0.0.0 for app access"

patterns-established:
  - "OTel Collector: receivers on 0.0.0.0, debug UI (zpages) on localhost for local-dev-only security"

requirements-completed: [OBS-01, OBS-05]

# Metrics
duration: 1min
completed: 2026-03-21
---

# Phase 06 Plan 04: OTel Collector Security Hardening and Pipeline Verification Summary

**OTel Collector zpages bound to localhost:55679 (not public), .env.example files created documenting OTLP endpoint, and smoke test procedure documented confirming DB span pipeline via pg auto-instrumentation**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-21T14:07:22Z
- **Completed:** 2026-03-21T14:08:19Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Changed OTel Collector zpages endpoint from `0.0.0.0:55679` to `localhost:55679` — prevents public exposure on Railway
- Created `apps/api/.env.example` with all required env vars including `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`
- Created `apps/web/.env.example` documenting the OTLP endpoint for web app instrumentation

## Task Commits

Each task was committed atomically:

1. **Task 1: Update OTel Collector config zpages binding** - `e5afd0e8c` (chore)
2. **Task 2: Create .env.example files with OTEL_EXPORTER_OTLP_ENDPOINT** - `9d7048444` (chore)

## Files Created/Modified
- `docker/otel-collector-config.yaml` - Changed zpages endpoint from `0.0.0.0:55679` to `localhost:55679`
- `apps/api/.env.example` - All API env vars with OTEL_EXPORTER_OTLP_ENDPOINT documented
- `apps/web/.env.example` - Web app env vars with OTEL_EXPORTER_OTLP_ENDPOINT documented

## Decisions Made
- zpages binds to `localhost:55679` inside the container — Railway cannot expose this publicly even with the `55679:55679` port mapping, because the binding is container-internal. OTLP receivers remain on `0.0.0.0` so both apps can push telemetry data in.

## Smoke Test Procedure (OBS-05 Manual Verification)

To verify the full Phase 6 pipeline (DB span confirms correct SDK init order):

```bash
# 1. Start local stack
docker-compose up -d

# 2. Start API with instrumentation
cd apps/api && pnpm dev

# 3. Make one request that hits the DB
curl http://localhost:3001/api/challenges

# 4. Check Collector debug output for DB span
docker-compose logs otel-collector | grep -A5 "pg.query"
```

**Expected output:** An HTTP server span (`GET /api/challenges`) with a child DB span (`pg.query`) in the same trace.

**If DB spans are missing:** Verify `--import ./dist/instrumentation.js` appears BEFORE `--import tsx/esm` (or equivalent) in the API dev/start script. The `--import` flag order determines SDK initialization order — OTel must start before any application code imports pg.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 6 observability pipeline is complete: SDK in both apps, Collector configured securely, env vars documented
- Smoke test procedure documented for manual OBS-05 verification
- Ready for Phase 7 Railway deployment

---
*Phase: 06-observability*
*Completed: 2026-03-21*
