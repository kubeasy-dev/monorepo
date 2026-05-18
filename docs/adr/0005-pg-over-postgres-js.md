# `pg` (node-postgres) over postgres.js as database driver

The API uses `pg` (node-postgres) with Drizzle's `drizzle-orm/node-postgres` adapter instead of the more popular `postgres.js`. The sole reason is OpenTelemetry: `@opentelemetry/instrumentation-pg` provides automatic query-level tracing for `pg` with zero configuration. There is no equivalent OTel auto-instrumentation package for postgres.js — spans would have to be added manually. Since OTel is central to our observability strategy, this trade-off (slightly more verbose client setup) is worth it.
