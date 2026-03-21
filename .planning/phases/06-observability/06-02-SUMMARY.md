---
phase: 06-observability
plan: 02
subsystem: observability, api
tags: [opentelemetry, otel, sdk, instrumentation, pino, logger, pg, ioredis, http]

requires:
  - phase: 06-observability
    plan: 01
    provides: "@kubeasy/logger workspace package, apps/api pg Pool migration"

provides:
  - apps/api OTel SDK initialized via --import flag before any app code
  - HTTP, DB (pg), ioredis, pino auto-instrumentations active in apps/api
  - PostHog OTLP log path fully removed (logger.ts deleted)
  - All apps/api logger consumers use @kubeasy/logger
  - sdk.shutdown() integrated into graceful shutdown handler

affects: [06-03]

tech-stack:
  added:
    - "@opentelemetry/api@1.9.0"
    - "@opentelemetry/sdk-node@0.213.0"
    - "@opentelemetry/resources@2.6.0"
    - "@opentelemetry/exporter-trace-otlp-http@0.213.0"
    - "@opentelemetry/exporter-logs-otlp-http@0.213.0"
    - "@opentelemetry/exporter-metrics-otlp-http@0.213.0"
    - "@opentelemetry/sdk-logs@0.213.0"
    - "@opentelemetry/sdk-metrics@2.6.0"
    - "@opentelemetry/instrumentation-http@0.213.0"
    - "@opentelemetry/instrumentation-pg@0.65.0"
    - "@opentelemetry/instrumentation-ioredis@0.61.0"
    - "@opentelemetry/instrumentation-pino@0.59.0"
  patterns:
    - "--import ./src/instrumentation.ts --import tsx/esm pattern for SDK initialization before app code"
    - "NodeSDK with individual auto-instrumentation packages (not bundle)"
    - "sdk.shutdown() in graceful shutdown to flush in-flight spans/logs"

key-files:
  created:
    - apps/api/src/instrumentation.ts
  modified:
    - apps/api/package.json
    - apps/api/src/lib/analytics-server.ts
    - apps/api/src/index.ts
    - pnpm-lock.yaml
  deleted:
    - apps/api/src/lib/logger.ts

key-decisions:
  - "--import ./dist/instrumentation.js flag mandatory in start script — never import @kubeasy/* inside instrumentation.ts"
  - "OTel SDK initialized before any application code via Node.js --import flag — ensures pg Pool is patched at creation time"
  - "Individual instrumentation packages used (http, pg, ioredis, pino) instead of @opentelemetry/auto-instrumentations-node bundle — smaller install, explicit dependency graph"

duration: 2min
completed: 2026-03-21
---

# Phase 06 Plan 02: OTel SDK Wire-up + PostHog Logger Removal Summary

**OTel NodeSDK with http/pg/ioredis/pino auto-instrumentations wired into apps/api via --import flag, PostHog OTLP logger deleted, and all logger consumers migrated to @kubeasy/logger**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-21T13:57:45Z
- **Completed:** 2026-03-21T13:59:45Z
- **Tasks:** 2
- **Files modified:** 5 (1 created, 3 modified, 1 deleted)

## Accomplishments

- Installed 13 OTel packages in apps/api including NodeSDK, exporters for traces/logs/metrics, and auto-instrumentation packages for http, pg, ioredis, and pino
- Created `apps/api/src/instrumentation.ts` initializing NodeSDK with all four auto-instrumentations and OTLP exporters — no `@kubeasy/*` imports in this file
- Updated `apps/api/package.json` dev/start scripts to load `--import ./src/instrumentation.ts` before `--import tsx/esm`
- Deleted `apps/api/src/lib/logger.ts` (the old PostHog OTLP LoggerProvider)
- Updated `apps/api/src/lib/analytics-server.ts` to import logger from `@kubeasy/logger` instead of the deleted local file
- Updated `apps/api/src/index.ts` to import `sdk` from instrumentation.ts, replace `console.log` calls with `logger` from `@kubeasy/logger`, and add `await sdk.shutdown()` in graceful shutdown
- All 6 workspace packages typecheck cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Install OTel SDK packages and create instrumentation.ts** - `3a571b7` (feat)
2. **Task 2: Delete PostHog OTLP logger, migrate imports, add sdk.shutdown()** - `36a2e36` (feat)

## Files Created/Modified

- `apps/api/src/instrumentation.ts` — NEW: NodeSDK init with OTLPTraceExporter, OTLPLogExporter, OTLPMetricExporter, HttpInstrumentation, PgInstrumentation, IORedisInstrumentation, PinoInstrumentation
- `apps/api/package.json` — Updated dev/start scripts with `--import` flags; added 13 OTel packages + @kubeasy/logger
- `apps/api/src/lib/analytics-server.ts` — Import logger from `@kubeasy/logger` (was `./logger.js`)
- `apps/api/src/index.ts` — Added sdk import, logger import from @kubeasy/logger, replaced console.log calls, added sdk.shutdown() in graceful shutdown
- `apps/api/src/lib/logger.ts` — DELETED (PostHog OTLP log path removed)
- `pnpm-lock.yaml` — Updated for new OTel packages

## Decisions Made

- **--import flag order**: `--import ./src/instrumentation.ts` MUST precede `--import tsx/esm` so the OTel SDK patches pg, ioredis, and http modules before any application code loads
- **No @kubeasy/* in instrumentation.ts**: The instrumentation file is dependency-free at startup — only OTel SDK packages allowed. @kubeasy/logger is imported in index.ts, not instrumentation.ts
- **Individual instrumentation packages**: Used individual packages (http, pg, ioredis, pino) rather than the `@opentelemetry/auto-instrumentations-node` bundle to avoid unused instrumentations and bundle size overhead
- **OTLP endpoint URL construction**: Each exporter receives a signal-specific URL (`${otlpEndpoint}/v1/traces` etc.) since programmatic exporter config requires explicit path appending

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. The `OTEL_EXPORTER_OTLP_ENDPOINT` env var defaults to `http://localhost:4318` when not set, so the API starts cleanly even without the OTel Collector running.

## Next Phase Readiness

- apps/api SDK initialized: every HTTP request, DB query, Redis command, and log record flows through the OTel pipeline
- PostHog OTLP path fully removed; analytics-server.ts PostHog product analytics untouched
- All workspace packages typecheck cleanly
- apps/web OTel instrumentation is next (06-03)

---
*Phase: 06-observability*
*Completed: 2026-03-21*
