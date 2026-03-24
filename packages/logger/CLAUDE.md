# packages/logger — CLAUDE.md

Shared structured logger for Kubeasy backend services.

## Purpose

Provides a single, pre-configured `logger` instance backed by **Pino**. All server-side code should use this instead of `console.*`.

## Usage

```typescript
import { logger } from "@kubeasy/logger";

logger.info("Server started", { port: 3001 });
logger.warn("Redis not configured");
logger.error("Operation failed", { error: String(err) });
logger.debug("Detailed trace", { key: "value" });
```

**Server-side only** — do not import in browser/client code.

## Behavior by Environment

| Environment | Output |
|---|---|
| Development (`NODE_ENV !== "production"`) | Pretty-printed console output via `pino-pretty` |
| Production (`NODE_ENV=production`) | Plain JSON to stdout |

The OpenTelemetry log bridge (`PinoInstrumentation`) is set up in each app's `instrumentation.ts` — it intercepts pino calls and emits OTel log records (with `trace_id`/`span_id` correlation) in **both** environments. The logger package itself has no OTel dependency.

## Exports

```
@kubeasy/logger   # Named export: logger
```

## Commands

```bash
pnpm typecheck   # Type-check this package
```

## Dependencies

| Package | Role |
|---|---|
| `pino` | Core structured logger |
| `pino-pretty` | Human-readable formatting for dev |

## Key Rules

- Do not use `console.log/warn/error` in server code — use `logger` instead.
- No build step: apps import TypeScript source directly.
- Keep this package minimal — no business logic, just the logger configuration.
