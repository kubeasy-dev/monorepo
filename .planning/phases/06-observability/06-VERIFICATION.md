---
phase: 06-observability
verified: 2026-03-21T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
human_verification:
  - test: "DB span smoke test — confirm instrumentation init order"
    expected: "After running 'docker-compose up -d' and 'cd apps/api && pnpm dev', making a request to 'curl http://localhost:3001/api/challenges' should produce an HTTP server span with a child 'pg.query' DB span visible in 'docker-compose logs otel-collector | grep -A5 pg.query'"
    why_human: "OBS-05 requires live stack execution — cannot verify DB spans programmatically without running the collector and making real HTTP requests"
---

# Phase 6: Observability Verification Report

**Phase Goal:** Establish full-stack observability for the Kubeasy platform — structured logs, distributed traces, and metrics from both apps/api and apps/web flowing into a local SigNoz instance via OTel Collector.
**Verified:** 2026-03-21
**Status:** human_needed (all automated checks passed; one manual smoke test required for OBS-05)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | apps/api uses pg Pool instead of postgres.js for database connections | VERIFIED | `apps/api/src/db/index.ts` lines 1-6: `import { Pool } from "pg"`, `drizzle-orm/node-postgres`, `new Pool({ connectionString: ... })` |
| 2 | @kubeasy/logger workspace package exists with pino logger | VERIFIED | `packages/logger/src/index.ts` exports `logger` (debug/info/warn/error) and `LogAttributes`; backed by pino instance |
| 3 | apps/api initialises OTel SDK via --import flag BEFORE any internal imports | VERIFIED | `apps/api/package.json` dev script: `--import ./src/instrumentation.ts --import tsx/esm --watch src/index.ts`; start script: `--import ./dist/instrumentation.js dist/index.js` |
| 4 | HTTP, DB (pg), ioredis, and pino auto-instrumentations are active in apps/api | VERIFIED | `apps/api/src/instrumentation.ts` lines 4-7 and 30-34: `HttpInstrumentation`, `PgInstrumentation`, `IORedisInstrumentation`, `PinoInstrumentation` all registered |
| 5 | The old PostHog OTLP logger is removed — no logs go to eu.i.posthog.com | VERIFIED | `apps/api/src/lib/logger.ts` DELETED; no `@opentelemetry/api-logs` imports in apps/api/src; only PostHog product analytics client remains in analytics-server.ts |
| 6 | analytics-server.ts imports logger from @kubeasy/logger (not local ./logger.js) | VERIFIED | `apps/api/src/lib/analytics-server.ts` line 8: `import { logger } from "@kubeasy/logger"` |
| 7 | sdk.shutdown() is called in graceful shutdown handler | VERIFIED | `apps/api/src/index.ts` line 32: `await sdk.shutdown();` in gracefulShutdown() after redis.quit() and before process.exit(0) |
| 8 | apps/web SSR layer initialises OTel SDK before any route loader runs | VERIFIED | `apps/web/src/server.tsx` line 2: `import "./instrumentation"` is the absolute first import; `apps/web/vite.config.ts` configures `server: { entry: "./src/server.tsx" }` |
| 9 | HTTP spans from SSR requests and pino log records are exported via OTLP (web) | VERIFIED | `apps/web/src/instrumentation.ts`: NodeSDK with `HttpInstrumentation` and `PinoInstrumentation`, OTLP exporters for traces/logs/metrics pointed at OTEL_EXPORTER_OTLP_ENDPOINT |
| 10 | OTel Collector zpages binds to localhost (not 0.0.0.0) and all three pipelines are configured | VERIFIED | `docker/otel-collector-config.yaml` line 18: `endpoint: localhost:55679`; traces, metrics, and logs pipelines all present with otlp receiver + batch processor + debug exporter |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Purpose | Status | Details |
|----------|---------|--------|---------|
| `apps/api/src/db/index.ts` | pg Pool + drizzle node-postgres adapter | VERIFIED | 6 lines; `new Pool`, `drizzle-orm/node-postgres` |
| `packages/logger/src/index.ts` | pino logger with OTel-compatible API | VERIFIED | 33 lines; exports `logger` and `LogAttributes`; wraps pino with `(message, attributes?)` signature |
| `packages/logger/package.json` | workspace package definition | VERIFIED | `"name": "@kubeasy/logger"`, `"pino": "^10.3.1"` |
| `apps/api/src/instrumentation.ts` | OTel SDK init with 4 instrumentations | VERIFIED | 40 lines; NodeSDK with pg, ioredis, http, pino; exports `sdk` |
| `apps/web/src/instrumentation.ts` | OTel SDK init for web SSR (http + pino only) | VERIFIED | 33 lines; NodeSDK with http + pino; no pg/ioredis |
| `apps/web/src/server.tsx` | SSR server entry importing instrumentation first | VERIFIED | 8 lines; `import "./instrumentation"` is line 2 (first non-comment); `createStartHandler(defaultStreamHandler)` |
| `apps/web/vite.config.ts` | Server entry configuration | VERIFIED | `server: { entry: "./src/server.tsx" }` in tanstackStart plugin |
| `docker/otel-collector-config.yaml` | Collector config with zpages on localhost | VERIFIED | zpages on `localhost:55679`; OTLP receivers on `0.0.0.0:4317/4318`; debug exporter with `verbosity: detailed` |
| `docker-compose.yml` | Compose with otel-collector service | VERIFIED | otel-collector service with volume mount for config; ports 4317, 4318, 55679 exposed |
| `apps/api/.env.example` | OTEL endpoint env var documentation | VERIFIED | `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` present |
| `apps/web/.env.example` | OTEL endpoint env var documentation | VERIFIED | `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` present |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/api/src/db/index.ts` | `pg` | `import { Pool } from "pg"` | WIRED | Pool imported and used in `new Pool({ connectionString: ... })` |
| `packages/logger/src/index.ts` | `pino` | `import pino from "pino"` | WIRED | pino imported and instantiated; logger wraps pinoInstance |
| `apps/api/package.json` dev script | `apps/api/src/instrumentation.ts` | `--import ./src/instrumentation.ts --import tsx/esm` | WIRED | instrumentation flag appears before tsx/esm as required |
| `apps/api/src/index.ts` | `apps/api/src/instrumentation.ts` | `import { sdk } from "./instrumentation.js"` | WIRED | sdk imported and `await sdk.shutdown()` called |
| `apps/api/src/lib/analytics-server.ts` | `@kubeasy/logger` | `import { logger } from "@kubeasy/logger"` | WIRED | line 8 of analytics-server.ts |
| `apps/web/src/server.tsx` | `apps/web/src/instrumentation.ts` | `import "./instrumentation"` as first import | WIRED | line 2 of server.tsx |
| `apps/web/vite.config.ts` | `apps/web/src/server.tsx` | `server: { entry: "./src/server.tsx" }` | WIRED | tanstackStart plugin configured with server entry |
| `apps/api/src/instrumentation.ts` | `docker/otel-collector-config.yaml` | OTLP HTTP on port 4318 | WIRED | instrumentation.ts defaults to `localhost:4318`; collector config accepts OTLP HTTP on `0.0.0.0:4318` |
| `docker-compose.yml` | `docker/otel-collector-config.yaml` | volume mount | WIRED | `./docker/otel-collector-config.yaml:/etc/otel-collector-config.yaml` |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| OBS-01 | 06-04 | docker-compose includes OTel Collector with OTLP receivers and configured exporters | SATISFIED | Collector service in docker-compose.yml with ports 4317/4318; config has debug exporter for all three pipelines |
| OBS-02 | 06-01, 06-02 | apps/api initialises OTel SDK before any package import — HTTP traces, DB spans, structured logs exported via OTLP | SATISFIED | `--import ./src/instrumentation.ts` precedes `--import tsx/esm`; pg/ioredis/http/pino instrumentations active |
| OBS-03 | 06-03 | apps/web initialises OTel SDK server-side (SSR/loader) — navigation traces, errors captured, logs exported via OTLP | SATISFIED | server.tsx with instrumentation as first import; http + pino instrumentations in web SDK |
| OBS-04 | 06-01, 06-02 | PostHog retained for product analytics; logs and traces go through OTel Collector only | SATISFIED | analytics-server.ts keeps PostHog client; old OTLP-to-PostHog logger.ts deleted; no `eu.i.posthog.com` in logs path |
| OBS-05 | 06-04 | Smoke test (DB span visible in collector) validates OTel init order | NEEDS HUMAN | Config and init order are correct programmatically; live DB span visibility requires running docker-compose + apps |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `apps/web/src/server.tsx` | `createStartHandler(defaultStreamHandler)` differs from plan spec `createStartHandler({ createRouter: getRouter })(defaultStreamHandler)` | Info | Not a defect — SUMMARY documents this as an intentional correction for TanStack Start v1.166.x API. The plan had a stale API shape. |

No TODO/FIXME/placeholder comments found in phase files. No stub return patterns detected. No empty implementations.

---

### Human Verification Required

#### 1. DB Span Smoke Test (OBS-05)

**Test:** Start the local stack and make one API request:
```
docker-compose up -d
cd apps/api && pnpm dev
# In another terminal:
curl http://localhost:3001/api/challenges
docker-compose logs otel-collector | grep -A5 "pg.query"
```
**Expected:** Collector debug output shows an HTTP server span (`GET /api/challenges`) with a child DB span (`pg.query`) sharing the same trace ID. Both spans should appear with `verbosity: detailed`.
**Why human:** OBS-05 requires live stack execution — the `--import` flag ordering and pg auto-instrumentation can only be confirmed by observing actual span output. Static analysis confirms the configuration is correct but cannot prove runtime behavior.

---

## Notes on Deviations

**Plan 03 — server.tsx API shape:** The plan specified `createStartHandler({ createRouter: getRouter })(defaultStreamHandler)` but the actual TanStack Start v1.166.x type signature only accepts a callback directly: `createStartHandler(defaultStreamHandler)`. The implementation correctly uses the actual API. The router is loaded via Vite virtual modules, not passed explicitly. This is documented in the 06-03-SUMMARY.md as decision `server-entry-api`.

**packages/logger pino-pretty version:** Plan specified `"pino-pretty": "^14.0.0"` but `packages/logger/package.json` has `"pino-pretty": "^13.0.0"`. This is a minor version difference (both are compatible) and does not affect functionality.

---

_Verified: 2026-03-21_
_Verifier: Claude (gsd-verifier)_
