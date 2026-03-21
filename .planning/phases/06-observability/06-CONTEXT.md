# Phase 6: Observability - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire up OTel SDK in `apps/api` and `apps/web` (SSR), route all telemetry signals (traces, metrics, logs) through the OTel Collector locally and directly to SigNoz in production. Remove the PostHog OTLP export path. Confirm correct SDK initialization order with a DB span smoke test.

</domain>

<decisions>
## Implementation Decisions

### Production observability backend
- SigNoz deployed as a Railway service — it natively accepts OTLP on ports 4317/4318
- OTel Collector runs **locally only** (docker-compose) — no Collector deployed on Railway
- In production, apps send OTLP directly to SigNoz via `OTEL_EXPORTER_OTLP_ENDPOINT` env var
- Local: `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318`
- Production: `OTEL_EXPORTER_OTLP_ENDPOINT=http://signoz:4318` (or Railway internal hostname)
- Planner adjusts plan 06-01 scope accordingly (no Railway Collector service needed)

### Database driver migration (postgres.js → pg)
- Migrate `apps/api` from `postgres` (postgres.js) to `pg` (node-postgres) for OTel auto-instrumentation
- Change is minimal: `apps/api/src/db/index.ts` swaps `postgres` → `new Pool()` from `pg`, and `drizzle-orm/postgres-js` → `drizzle-orm/node-postgres`
- Auto-instrumentation via `@opentelemetry/instrumentation-pg` then gives DB spans for free
- This migration belongs in a dedicated plan (e.g., 06-00) before the SDK setup plan

### apps/web SSR instrumentation
- Export **traces + logs + metrics** from the SSR layer (same scope as apps/api)
- Initialization via `instrumentation.ts` loaded through `app.config.ts` (Vinxi server plugin/hook)
- Gives end-to-end visibility: web SSR request → API call visible in SigNoz traces

### Logger migration
- Replace the custom `apps/api/src/lib/logger.ts` (which currently creates its own LoggerProvider and sends directly to PostHog OTLP) with **pino** + OTel pino transport
- Shared as a new workspace package: `packages/logger` (`@kubeasy/logger`)
- Both `apps/api` and `apps/web` import `@kubeasy/logger` — single source of truth
- OTel pino transport forwards logs to the Collector (local) or SigNoz (prod) via OTLP

### PostHog OTLP removal
- The `loggerProvider` in the current `logger.ts` (sends to `eu.i.posthog.com/i/v1/logs`) is fully removed
- PostHog is retained **only** for product analytics events: `posthog-js` client-side, `posthog-node` server-side (`analytics-server.ts` stays untouched)

### Claude's Discretion
- Which auto-instrumentation packages to bundle (http, pg, ioredis, fetch) — planner decides based on what's in the codebase
- Exact pino config (pretty-print in dev, JSON in prod, log level via env var)
- SDK resource attributes (service.name, service.version, deployment.environment)
- Whether to use `@opentelemetry/auto-instrumentations-node` bundle or individual packages

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing code to migrate / replace
- `apps/api/src/lib/logger.ts` — Current logger with PostHog OTLP path — this gets replaced by @kubeasy/logger
- `apps/api/src/lib/analytics-server.ts` — PostHog product analytics — this stays, do NOT touch
- `apps/api/src/db/index.ts` — postgres.js driver setup — gets migrated to pg
- `docker/otel-collector-config.yaml` — Existing Collector config (debug exporter, zpages) — update for local-only use

### OTel SDK references
No external ADRs. Requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docker/otel-collector-config.yaml`: Already has OTLP receivers (4317 gRPC, 4318 HTTP), debug exporter, zpages on 55679. Needs minor update only (confirm local-only scope, zpages binding).
- `apps/api/src/lib/logger.ts`: The `LogAttributes` type and `cleanAttributes()` helper are worth keeping in `@kubeasy/logger`. The `logger.info/warn/error/debug` API shape is used across the entire `apps/api` codebase — keep the same API signature.
- `apps/api/src/lib/analytics-server.ts`: PostHog product analytics — fully separate concern, stays as-is.

### Established Patterns
- `apps/api` start script uses `--import tsx/esm` flag — OTel SDK init via `--import ./instrumentation.js` can be chained in the same `node` call for production
- `apps/web` uses Vinxi (via TanStack Start) — server plugins in `app.config.ts` are the correct hook for SSR instrumentation
- Workspace packages follow `packages/` convention with `@kubeasy/` namespace (see `packages/api-schemas`, `packages/jobs`)

### Integration Points
- `apps/api/src/index.ts` — Server entry point, add `--import ./instrumentation.js` to start script
- `apps/api/src/db/index.ts` — Driver swap happens here only
- `apps/web/app.config.ts` — SSR instrumentation hook goes here
- All files currently importing from `./lib/logger.js` or `../lib/logger.js` in `apps/api` — will import `@kubeasy/logger` after migration

</code_context>

<specifics>
## Specific Ideas

- SigNoz is the prod backend — it runs on Railway as a service, accepts OTLP natively, no Collector needed in prod
- The DB span smoke test (success criteria #1) validates that `--import` flag loads instrumentation before postgres pool creation — this is the order-sensitive part to get right
- pino with OTel transport is the standard pattern for structured logs in Node.js services

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-observability*
*Context gathered: 2026-03-21*
