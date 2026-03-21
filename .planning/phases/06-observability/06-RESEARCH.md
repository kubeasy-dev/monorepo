# Phase 6: Observability - Research

**Researched:** 2026-03-21
**Domain:** OpenTelemetry SDK (Node.js), pino logger, postgres.js → pg migration, OTel Collector config
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Production observability backend**
- SigNoz deployed as a Railway service — it natively accepts OTLP on ports 4317/4318
- OTel Collector runs **locally only** (docker-compose) — no Collector deployed on Railway
- In production, apps send OTLP directly to SigNoz via `OTEL_EXPORTER_OTLP_ENDPOINT` env var
- Local: `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318`
- Production: `OTEL_EXPORTER_OTLP_ENDPOINT=http://signoz:4318` (or Railway internal hostname)

**Database driver migration (postgres.js → pg)**
- Migrate `apps/api` from `postgres` (postgres.js) to `pg` (node-postgres) for OTel auto-instrumentation
- Change is minimal: `apps/api/src/db/index.ts` swaps `postgres` → `new Pool()` from `pg`, and `drizzle-orm/postgres-js` → `drizzle-orm/node-postgres`
- Auto-instrumentation via `@opentelemetry/instrumentation-pg` then gives DB spans for free
- This migration belongs in a dedicated plan (e.g., 06-00) before the SDK setup plan

**apps/web SSR instrumentation**
- Export **traces + logs + metrics** from the SSR layer (same scope as apps/api)
- Initialization via `instrumentation.ts` imported at the top of `src/server.tsx` (TanStack Start server entry — Vite-based post-v1.121.0, NOT app.config.ts/Vinxi)
- Gives end-to-end visibility: web SSR request → API call visible in SigNoz traces

**Logger migration**
- Replace the custom `apps/api/src/lib/logger.ts` (which currently creates its own LoggerProvider and sends directly to PostHog OTLP) with **pino** + OTel pino instrumentation
- Shared as a new workspace package: `packages/logger` (`@kubeasy/logger`)
- Both `apps/api` and `apps/web` import `@kubeasy/logger` — single source of truth
- OTel pino instrumentation injects trace context into log records; BatchLogRecordProcessor exports logs to Collector/SigNoz via OTLP

**PostHog OTLP removal**
- The `loggerProvider` in the current `logger.ts` (sends to `eu.i.posthog.com/i/v1/logs`) is fully removed
- PostHog is retained **only** for product analytics events: `posthog-js` client-side, `posthog-node` server-side (`analytics-server.ts` stays untouched)

### Claude's Discretion
- Which auto-instrumentation packages to bundle (http, pg, ioredis, fetch) — planner decides based on what's in the codebase
- Exact pino config (pretty-print in dev, JSON in prod, log level via env var)
- SDK resource attributes (service.name, service.version, deployment.environment)
- Whether to use `@opentelemetry/auto-instrumentations-node` bundle or individual packages

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OBS-01 | docker-compose OTel Collector service configured for OTLP receive, debug exporter, local-only scope | Collector config section: zpages on localhost only, debug exporter retained for local dev |
| OBS-02 | `apps/api` initialises OTel SDK before any internal imports — HTTP, DB, and log spans exported via OTLP | `--import ./instrumentation.js` pattern; `@opentelemetry/sdk-node`; `@opentelemetry/instrumentation-pg` for DB spans |
| OBS-03 | `apps/web` initialises OTel SDK server-side (SSR) — traces, logs exported via OTLP | `src/server.tsx` import-first pattern; same SDK setup; `@opentelemetry/instrumentation-http` |
| OBS-04 | PostHog retained for product analytics only; OTLP path from logger.ts removed | `@kubeasy/logger` package replaces current logger; analytics-server.ts untouched |
| OBS-05 | DB span smoke test: after one API request, Collector debug output shows HTTP span + child DB span | Correct `--import` order + `new Pool()` created after SDK start; verified by Collector debug log |
</phase_requirements>

---

## Summary

Phase 6 wires OpenTelemetry into both `apps/api` (Hono) and `apps/web` (TanStack Start SSR) and routes all signals — traces, metrics, logs — through the OTel Collector locally and directly to SigNoz in production. The central blocker the user flagged was **SDK initialization order**: the `@opentelemetry/sdk-node` `NodeSDK.start()` call MUST complete before any instrumented library (especially `pg.Pool`) is imported or instantiated. This is non-negotiable for auto-instrumentation to work.

The current `apps/api/src/lib/logger.ts` hard-wires a `LoggerProvider` that sends logs directly to PostHog OTLP (`eu.i.posthog.com/i/v1/logs`). This entire provider is deleted and replaced with **pino** + `@opentelemetry/instrumentation-pino`, which injects trace context into structured log records and routes them through the global SDK LoggerProvider (which sends to the Collector/SigNoz). The current `analytics-server.ts` (PostHog product analytics) is completely separate and is left untouched.

The postgres.js → pg driver migration is the smallest-surface pre-requisite: only `apps/api/src/db/index.ts` changes, swapping `import postgres from "postgres"` for `new Pool()` from `pg` and `drizzle-orm/postgres-js` for `drizzle-orm/node-postgres`. Once the pg driver is in place, `@opentelemetry/instrumentation-pg` auto-instruments every query into a DB span with zero application code changes.

**Primary recommendation:** Use `@opentelemetry/sdk-node` with individual instrumentation packages (http, pg, ioredis, pino) rather than the bundle — the bundle pulls in unused instrumentations and was flagged as a potential conflict source in this codebase.

---

## Standard Stack

### Core OTel SDK
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@opentelemetry/api` | 1.9.0 | API surface used in application code | Peer dep of SDK; required standalone for manual spans |
| `@opentelemetry/sdk-node` | 0.213.0 | NodeSDK class — initialises all signal providers | Official Node.js SDK; handles startup/shutdown lifecycle |
| `@opentelemetry/resources` | 2.6.0 | `resourceFromAttributes()` for service.name etc. | Standard resource builder |
| `@opentelemetry/exporter-trace-otlp-http` | 0.213.0 | Sends traces to Collector/SigNoz via OTLP HTTP | HTTP preferred over gRPC for Railway compatibility |
| `@opentelemetry/exporter-logs-otlp-http` | 0.213.0 | Sends log records to Collector/SigNoz | Same transport for all signals |
| `@opentelemetry/exporter-metrics-otlp-http` | 0.213.0 | Sends metrics to Collector/SigNoz | Same transport |
| `@opentelemetry/sdk-logs` | 0.213.0 | `BatchLogRecordProcessor`, `LoggerProvider` | Required for log pipeline when using pino instrumentation |

### Auto-Instrumentation (individual packages — do NOT use bundle)
| Library | Version | Purpose | Instruments |
|---------|---------|---------|-------------|
| `@opentelemetry/instrumentation-http` | 0.213.0 | HTTP client/server spans | All `http`/`https` module calls |
| `@opentelemetry/instrumentation-pg` | 0.65.0 | DB query spans | `pg.Pool` queries → child spans with SQL |
| `@opentelemetry/instrumentation-ioredis` | 0.61.0 | Redis command spans | Every ioredis command |
| `@opentelemetry/instrumentation-pino` | 0.59.0 | Injects trace context into pino log records + routes logs to OTel log pipeline | Pino logger |

### Logger Package
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `pino` | 10.3.1 | Structured JSON logger | Low overhead, wide Node.js adoption, first-class OTel integration |

### Database Driver
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `pg` | 8.20.0 | node-postgres Pool | Auto-instrumented by `@opentelemetry/instrumentation-pg`; already in web package |
| `@types/pg` | 8.18.0 | Type definitions | Already in web package |
| `drizzle-orm` | 0.45.1 (existing) | ORM over pg Pool | `drizzle-orm/node-postgres` adapter for Pool |

### Installation

For `apps/api`:
```bash
pnpm add @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/resources \
  @opentelemetry/exporter-trace-otlp-http @opentelemetry/exporter-logs-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http @opentelemetry/sdk-logs \
  @opentelemetry/instrumentation-http @opentelemetry/instrumentation-pg \
  @opentelemetry/instrumentation-ioredis @opentelemetry/instrumentation-pino \
  pg pino
pnpm add -D @types/pg
# remove postgres (postgres.js)
pnpm remove postgres
```

For `packages/logger`:
```bash
# New workspace package — no npm installs; declares pino as dependency
# peerDependency: @opentelemetry/api (already in api and web)
```

For `apps/web` (SSR instrumentation only):
```bash
pnpm add @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/resources \
  @opentelemetry/exporter-trace-otlp-http @opentelemetry/exporter-logs-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http @opentelemetry/sdk-logs \
  @opentelemetry/instrumentation-http @opentelemetry/instrumentation-pino \
  pino
```

**Version verification:** All versions confirmed against npm registry on 2026-03-21. The `0.213.0` channel is the current stable (`latest` dist-tag). There is a `0.34.0` (`next` dist-tag) separate channel — do NOT use `next`.

---

## Architecture Patterns

### Recommended Package Structure

```
packages/
  logger/                    # @kubeasy/logger — NEW workspace package
    package.json
    src/
      index.ts               # exports { logger, LogAttributes }
    tsconfig.json

apps/api/
  src/
    instrumentation.ts       # OTel SDK init — loaded via --import flag FIRST
    db/index.ts              # pg Pool + drizzle (was postgres.js)
    lib/
      logger.ts              # DELETED — replaced by @kubeasy/logger
      analytics-server.ts    # UNTOUCHED

apps/web/
  src/
    instrumentation.ts       # OTel SDK init for SSR
    server.tsx               # imports ./instrumentation at very top
```

### Pattern 1: apps/api — SDK Initialization via --import flag

**What:** `instrumentation.ts` runs before any application code. `NodeSDK.start()` patches all auto-instrumented libraries during module load. The `new Pool()` in `db/index.ts` is created AFTER SDK start because module evaluation order guarantees this when using `--import`.

**When to use:** Any long-lived Node.js server process where you need auto-instrumentation of pg, ioredis, http.

**Start script change** in `apps/api/package.json`:
```json
{
  "scripts": {
    "dev": "node --env-file=.env --import ./src/instrumentation.ts --import tsx/esm --watch src/index.ts",
    "start": "node --import ./dist/instrumentation.js dist/index.js"
  }
}
```

**CRITICAL:** `--import ./instrumentation` MUST appear before `--import tsx/esm` and before the main entry. The SDK patches happen at import time — if `pg` Pool is created before SDK.start(), queries will NOT produce spans.

**`apps/api/src/instrumentation.ts`:**
```typescript
// Source: opentelemetry.io/docs/languages/js/getting-started/nodejs/
import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis";
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://otel-collector:4318";

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    "service.name": "kubeasy-api",
    "service.version": process.env.npm_package_version ?? "unknown",
    "deployment.environment": process.env.NODE_ENV ?? "development",
  }),
  traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }),
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({ url: `${otlpEndpoint}/v1/logs` })
  ),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` }),
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new PgInstrumentation({ enhancedDatabaseReporting: true }),
    new IORedisInstrumentation(),
    new PinoInstrumentation(),
  ],
});

sdk.start();

// Graceful shutdown — call sdk.shutdown() in gracefulShutdown() in index.ts
export { sdk };
```

### Pattern 2: pg Pool + Drizzle (replaces postgres.js)

**`apps/api/src/db/index.ts` after migration:**
```typescript
// Source: drizzle-orm/node-postgres docs
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index.js";

// Pool MUST be created after SDK.start() — guaranteed by --import flag order
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

**Why this works:** `@opentelemetry/instrumentation-pg` monkey-patches the `pg` module at SDK startup. When `new Pool()` is called later (at module eval time of `db/index.ts`), the patched constructor is used. Every query creates a child DB span automatically.

### Pattern 3: @kubeasy/logger — pino + OTel pino instrumentation

The `PinoInstrumentation` in the SDK automatically injects `trace_id`, `span_id`, and `trace_flags` fields into every pino log record, AND routes the log records to the OTel log pipeline configured in the SDK (BatchLogRecordProcessor → OTLP HTTP exporter).

**`packages/logger/src/index.ts`:**
```typescript
// Source: npmjs.com/package/@opentelemetry/instrumentation-pino
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export type LogAttributes = Record<string, string | number | boolean>;

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});
```

**Note:** In production, pino emits JSON to stdout. `PinoInstrumentation` automatically intercepts each log record and forwards it to the OTel log pipeline — no `pino.transport` needed for OTLP. Do NOT add a separate `pino-opentelemetry-transport` — this would create a duplicate LoggerProvider in a worker thread, independent from the main SDK.

**API shape maintained** (same as current `logger.ts`):
- `logger.info(message, attributes)` — pino accepts objects as second argument natively
- `logger.warn(message, attributes)`
- `logger.error(message, attributes)`
- `logger.debug(message, attributes)`

**`packages/logger/package.json`:**
```json
{
  "name": "@kubeasy/logger",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "pino": "^10.3.1" },
  "peerDependencies": { "@opentelemetry/api": ">=1.3.0 <1.10.0" },
  "devDependencies": { "@kubeasy/typescript-config": "workspace:*", "typescript": "5.9.3" }
}
```

### Pattern 4: apps/web SSR instrumentation

TanStack Start migrated from Vinxi to Vite in v1.121.0 (June 2025). The CONTEXT.md reference to "app.config.ts (Vinxi server plugin/hook)" is now superseded — the correct pattern is importing `instrumentation.ts` at the very top of `src/server.tsx`.

**`apps/web/src/server.tsx`:**
```typescript
// MUST be first import — initialises OTel SDK before any route loaders
import "./instrumentation";
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { getRouter } from "./lib/router";

export default createStartHandler({ createRouter: getRouter })(defaultStreamHandler);
```

**`apps/web/src/instrumentation.ts`:**
```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://otel-collector:4318";

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    "service.name": "kubeasy-web",
    "service.version": process.env.npm_package_version ?? "unknown",
    "deployment.environment": process.env.NODE_ENV ?? "development",
  }),
  traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }),
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({ url: `${otlpEndpoint}/v1/logs` })
  ),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` }),
  }),
  instrumentations: [new HttpInstrumentation(), new PinoInstrumentation()],
});

sdk.start();
```

**Note:** apps/web does NOT need pg/ioredis instrumentation — those connections only exist in apps/api.

### Pattern 5: OTel Collector config — local-only, zpages on localhost

The existing `docker/otel-collector-config.yaml` already has the right structure. Two changes needed:
1. Bind zpages to `localhost:55679` (not `0.0.0.0:55679`) so it is NOT reachable on Railway's public network — this is a local-dev-only service
2. The config is intentionally debug-exporter-only: no SigNoz exporter in the Collector (in production, apps talk directly to SigNoz)

```yaml
# docker/otel-collector-config.yaml (updated)
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  debug:
    verbosity: detailed

extensions:
  zpages:
    endpoint: localhost:55679   # CHANGED: was 0.0.0.0:55679

service:
  extensions: [zpages]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
```

### Anti-Patterns to Avoid

- **Creating `new Pool()` before `sdk.start()`:** The pg pool will not be instrumented; queries produce no spans. Always ensure `--import ./instrumentation.js` precedes entry.
- **Using `pino-opentelemetry-transport` in addition to `PinoInstrumentation`:** Two separate log pipelines; the transport's LoggerProvider is independent of the SDK's. Use `PinoInstrumentation` only.
- **Using `@opentelemetry/auto-instrumentations-node` bundle:** Pulls in 30+ instrumentations including DNS, net, etc. — adds unnecessary overhead and increases bundle size. Use individual packages scoped to what the codebase actually uses (http, pg, ioredis, pino).
- **Importing `@kubeasy/*` packages inside `instrumentation.ts`:** The CONTEXT.md explicitly flags this: `never import @kubeasy/* inside instrumentation.ts`. The instrumentation file must be dependency-free at startup time.
- **Calling `sdk.start()` asynchronously or inside a route handler:** SDK init is synchronous and must block before any imports proceed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DB query spans | Custom Drizzle middleware/proxy | `@opentelemetry/instrumentation-pg` | OTel handles connection pool tracking, error attributes, SQL sanitization |
| Log trace correlation (trace_id in logs) | Manual `context.active()` injection | `PinoInstrumentation` | Auto-injects `trace_id`/`span_id` into every log record at emit time |
| HTTP server spans | Manual `app.use()` middleware | `HttpInstrumentation` | Handles incoming req + outgoing fetch/http spans automatically |
| Metrics collection | Custom counters/histograms | `NodeSDK` + PeriodicExportingMetricReader | SDK manages collection lifecycle and export batching |
| OTLP export retry/batching | Custom queue | `BatchSpanProcessor` / `BatchLogRecordProcessor` | Built-in retry, configurable batch size, backpressure handling |

**Key insight:** The OTel SDK for Node.js instruments at the module-loader level — no application code changes are needed to get spans for pg, ioredis, or HTTP. The instrumentation patches happen once at startup.

---

## Common Pitfalls

### Pitfall 1: Pool Created Before SDK Patches

**What goes wrong:** `db/index.ts` is a module-level singleton. If `apps/api/src/index.ts` is the entry and imports `db/index.ts` before SDK startup, the `new Pool()` call uses the un-patched pg constructor. Queries run fine but produce no DB spans.

**Why it happens:** ESM static imports are evaluated in dependency order. If `index.ts → app.ts → routes/challenges.ts → db/index.ts` before instrumentation runs, pg is already loaded.

**How to avoid:** Use `--import ./dist/instrumentation.js` as the FIRST `--import` flag. This evaluates `instrumentation.ts` synchronously before any application module is loaded. In dev with tsx, the order is `--import ./src/instrumentation.ts --import tsx/esm`.

**Warning signs:** Collector debug output shows HTTP spans but no `db` child spans.

### Pitfall 2: analytics-server.ts Importing from logger.ts During Migration

**What goes wrong:** `analytics-server.ts` currently does `import { logger } from "./logger.js"`. After `logger.ts` is deleted, this import breaks the build.

**How to avoid:** Update `analytics-server.ts` to import from `@kubeasy/logger` in the same plan that deletes `logger.ts`. The API is identical (`logger.info/warn/error/debug`).

### Pitfall 3: OTLP Endpoint URL Format

**What goes wrong:** The `OTEL_EXPORTER_OTLP_ENDPOINT` env var is the BASE URL (e.g., `http://otel-collector:4318`). When constructing the full URL in code, append `/v1/traces`, `/v1/logs`, `/v1/metrics`. If you pass the base URL directly to `OTLPTraceExporter({ url })`, it sends to `http://otel-collector:4318` without a path — which fails.

**How to avoid:** Always construct `${otlpEndpoint}/v1/traces` etc. in the exporter config.

**Note:** If you use `OTEL_EXPORTER_OTLP_ENDPOINT` as an environment variable (not programmatic config), the SDK will automatically append the signal-specific paths. If configuring programmatically (which is required here for multi-exporter setup), append paths explicitly.

### Pitfall 4: pino-pretty Not Installed in Production

**What goes wrong:** If `pino` is configured with `transport: { target: "pino-pretty" }` unconditionally and `pino-pretty` is not installed, the process crashes.

**How to avoid:** Gate the pretty transport on `NODE_ENV !== "production"`. In the `@kubeasy/logger` package, make `pino-pretty` a devDependency, not a production dependency.

### Pitfall 5: sdk.shutdown() Not Called on SIGTERM

**What goes wrong:** In-flight spans and log records in the batch processor are lost on shutdown. The OTel Collector may show incomplete traces.

**How to avoid:** In `apps/api/src/index.ts`, add `await sdk.shutdown()` to the `gracefulShutdown()` function before `process.exit(0)`. The SDK instance is exported from `instrumentation.ts`.

### Pitfall 6: ESM + --experimental-loader for pg instrumentation

**What goes wrong:** In ESM mode (the project uses `"type": "module"`), OTel's module patching may not work correctly without the experimental loader flag. The `@opentelemetry/instrumentation-pg` patches the CJS `pg` module. Since pg uses CJS and the app uses ESM interop via tsx/esbuild, this usually works fine. But if DB spans don't appear, add `--experimental-loader=@opentelemetry/instrumentation/hook.mjs` to the start flags.

**Warning signs:** HTTP spans appear but DB spans do not, even with correct `--import` order.

---

## Code Examples

### Smoke Test: Verify DB Span in Collector Logs

After starting the local stack (`docker-compose up`), make one authenticated API request:
```bash
curl -X GET http://localhost:3001/api/challenges -H "Authorization: Bearer <key>"
```

In the OTel Collector logs (`docker-compose logs otel-collector`), look for:
```
Span #0
    Trace ID       : abc123...
    Name           : GET /api/challenges
    SpanKind        : Server
  Span #1
    Parent ID      : abc123... (same trace)
    Name           : pg.query
    SpanKind        : Client
    Attributes:
         -> db.system: postgresql
         -> db.statement: SELECT ...
```

The parent HTTP span + child DB span confirms:
1. `HttpInstrumentation` is active (HTTP span)
2. `PgInstrumentation` is active (DB child span)
3. `--import` order is correct (both patches applied before Pool creation)

### Resource Attributes Pattern

```typescript
// Source: opentelemetry.io/docs/languages/js/resources/
import { resourceFromAttributes } from "@opentelemetry/resources";

const resource = resourceFromAttributes({
  "service.name": "kubeasy-api",        // Required — used by SigNoz for service grouping
  "service.version": process.env.npm_package_version ?? "0.0.0",
  "deployment.environment": process.env.NODE_ENV ?? "development",
});
```

### Graceful Shutdown with SDK

```typescript
// apps/api/src/index.ts (updated gracefulShutdown)
import { sdk } from "./instrumentation.js";

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);
  server.close();
  await Promise.all(workers.map((w) => w.close()));
  await redis.quit();
  await sdk.shutdown();  // Flush remaining spans/logs
  console.log("Shutdown complete");
  process.exit(0);
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vinxi `app.config.ts` server plugins | `vite.config.ts` + `src/server.tsx` import | TanStack Start v1.121.0 (June 2025) | Instrumentation init moves to server.tsx import, not Vinxi hook |
| `pino-opentelemetry-transport` (worker thread) | `@opentelemetry/instrumentation-pino` (main thread) | SDK 0.2xx series | Single SDK LoggerProvider; trace correlation automatic |
| `@opentelemetry/auto-instrumentations-node` bundle | Individual instrumentation packages | Ongoing best practice | Smaller install, explicit dependency graph |
| postgres.js driver | `pg` (node-postgres) Pool | Phase 6 decision | Enables `instrumentation-pg` auto-instrumentation |

**Deprecated/outdated:**
- `loggerProvider` in `apps/api/src/lib/logger.ts` (PostHog OTLP): Removed entirely in this phase
- `postgres` (postgres.js): Removed from apps/api in plan 06-00
- `VERCEL` env var check in current logger.ts: Replaced by `NODE_ENV` check in `@kubeasy/logger`

---

## Open Questions

1. **apps/web `server.tsx` location**
   - What we know: The standard TanStack Start pattern has `src/server.tsx`. The current `apps/web/src/` directory has no `server.tsx` — the file may be framework-generated or not yet created.
   - What's unclear: Whether the planner needs to create `src/server.tsx` from scratch or modify an existing Vite plugin entry.
   - Recommendation: Planner should check `.tanstack/` directory for generated server entry. If none, create `src/server.tsx` as the server entry and configure it in `vite.config.ts` as `tsr: { serverEntry: './src/server.tsx' }`.

2. **pino-pretty in apps/web**
   - What we know: apps/web runs in SSR mode during dev via Vite. pino-pretty might not be installed in apps/web.
   - What's unclear: Whether Vite's SSR dev mode needs `pino-pretty` available.
   - Recommendation: Add `pino-pretty` as devDependency in both `packages/logger` and any app that uses pretty transport in dev.

3. **Drizzle config update for pg driver**
   - What we know: `apps/api/drizzle.config.ts` likely still references `DATABASE_URL` with postgres.js dialect.
   - What's unclear: Whether `drizzle-kit` needs a dialect change when switching from postgres-js to node-postgres.
   - Recommendation: Planner verifies `drizzle.config.ts` uses `dialect: "postgresql"` (not driver-specific) — this is unchanged for Drizzle Kit.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `apps/api/vitest.config.ts` (exists) |
| Quick run command | `cd apps/api && pnpm test:run` |
| Full suite command | `pnpm -r test:run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OBS-01 | Collector config has zpages on localhost:55679 | manual-only | `docker-compose up otel-collector && curl http://localhost:55679` | N/A — config file |
| OBS-02 | SDK init before pg Pool; instrumentation-pg active | smoke | `docker-compose up && curl localhost:3001/api/challenges` then inspect collector logs | ❌ Wave 0 |
| OBS-03 | Web SSR routes produce HTTP spans in Collector | smoke | Same docker-compose run, hit localhost:3000 | ❌ Wave 0 |
| OBS-04 | logger.ts deleted; analytics-server.ts uses @kubeasy/logger; no PostHog OTLP calls | unit | `pnpm -r typecheck` catches broken imports | ❌ Wave 0 |
| OBS-05 | DB child span appears under HTTP parent in Collector debug output | smoke | See smoke test procedure in Code Examples | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm -r typecheck` (catches import breaks and type errors from migration)
- **Per wave merge:** `pnpm -r test:run` + manual collector smoke test
- **Phase gate:** All types pass + collector shows HTTP + DB span pair before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/__tests__/instrumentation-order.test.ts` — validates SDK starts before Pool creation (unit test with mock)
- [ ] `packages/logger/src/__tests__/logger.test.ts` — validates logger API shape (info/warn/error/debug signatures)
- [ ] Framework install for `packages/logger`: `pnpm add -D vitest` if logger package needs unit tests

*(The smoke test for OBS-05 is a manual Collector log inspection — not automated. This is appropriate: the test verifies infrastructure wiring, not application logic.)*

---

## Sources

### Primary (HIGH confidence)
- npm registry — `@opentelemetry/sdk-node@0.213.0`, `@opentelemetry/instrumentation-pg@0.65.0`, `pino@10.3.1`, `pg@8.20.0` — all versions verified 2026-03-21
- `opentelemetry.io/docs/languages/js/getting-started/nodejs/` — `--import` flag pattern, NodeSDK setup
- `github.com/open-telemetry/opentelemetry-js/blob/main/doc/esm-support.md` — ESM + `--import` caveats
- `github.com/pinojs/pino-opentelemetry-transport` — pino-opentelemetry-transport vs PinoInstrumentation distinction
- `github.com/open-telemetry/opentelemetry-collector/blob/main/extension/zpagesextension/README.md` — zpages localhost binding

### Secondary (MEDIUM confidence)
- `dev.to/jamie_davenport/opentelemetry-in-tanstack-start-with-better-stack-5d89` — TanStack Start server.tsx instrumentation pattern (verified against TanStack docs redirect)
- `blog.logrocket.com/migrating-tanstack-start-vinxi-vite/` — Vinxi → Vite migration, `app.config.ts` removal, `server.tsx` pattern
- `npm view @opentelemetry/instrumentation-pino` — confirmed v0.59.0 is latest

### Tertiary (LOW confidence)
- WebSearch results on `@kubiks/otel-drizzle` package — not recommended (extra dependency, pg auto-instrumentation is sufficient)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry 2026-03-21
- Architecture: HIGH — `--import` flag pattern from official OTel docs; TanStack Start server.tsx from official migration guide
- Pitfalls: HIGH — initialization order pitfall is documented in OTel ESM support docs; others derived from codebase analysis
- apps/web server.tsx: MEDIUM — TanStack Start migration docs confirmed pattern, but `src/server.tsx` may need creation

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (OTel 0.x stable channel; pino 10.x; TanStack Start post-v1.121.0 — all stable for ~30 days)
