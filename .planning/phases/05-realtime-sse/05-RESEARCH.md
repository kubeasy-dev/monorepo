# Phase 5: Realtime SSE - Research

**Researched:** 2026-03-19
**Domain:** Server-Sent Events (Hono), Redis pub/sub (ioredis), BullMQ Workers, graceful SIGTERM shutdown
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **SSE Authentication**: Cookie-based auth via `withCredentials: true` on `EventSource`. Return HTTP 401 immediately (before opening stream) when no session present. Use `requireAuth` middleware on the SSE route.
- **SSE Endpoint**: Route `GET /api/sse/validation/:challengeSlug`. Dedicated `ioredis` subscriber instance per connection — never share the subscriber with the main `redis` export. Subscribe to channel `validation:{userId}:{challengeSlug}` after connection opens. 30-second heartbeat to prevent proxy timeouts. Clean up subscriber on abort signal via `stream.onAbort()`.
- **Redis PUBLISH**: In `apps/api/src/routes/submit.ts`, publish to `validation:{userId}:{challengeSlug}` via the shared `redis` export after enrichment and DB write. Publish the full enriched submission result as message payload.
- **Web Integration**: `useValidationSSE(slug)` hook inside `ChallengeMission`. Creates `EventSource` with `{ withCredentials: true }`. On `message` event: `queryClient.invalidateQueries({ queryKey: ['submissions', 'latest', slug] })`. Only active when challenge status is `in_progress`.
- **BullMQ Workers**: Three workers in `apps/api/src/workers/`: `user-lifecycle.worker.ts`, `challenge-submission.worker.ts`, `xp-award.worker.ts`. Registered in `apps/api/src/server.ts` (or entry point). Queue definitions and payload types stay in `packages/jobs`.
- **SIGTERM Shutdown Sequence**: (1) `server.close()`, (2) `await Promise.all(workers.map(w => w.close()))`, (3) `redis.quit()`, (4) `process.exit(0)`.
- **Redis Configuration**: `maxmemory-policy noeviction` already in docker-compose (no change needed). New `ioredis` instances for SSE subscribers via `new Redis(process.env.REDIS_URL)` — NOT `.duplicate()`.
- **SSE subscriber instance**: Fresh `new Redis(process.env.REDIS_URL)` per SSE connection.

### Claude's Discretion

- SSE event type name (`validation-update` vs `message`)
- Heartbeat event format (comment `:` style or named event)
- Error handling if Redis subscriber creation fails
- EventSource URL construction in the hook (env-based API base URL)
- BullMQ worker concurrency settings

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REAL-01 | SSE endpoint `GET /api/sse/validation/:challengeSlug` opens SSE stream per client, subscribes to Redis channel `validation:{userId}:{challengeSlug}`, pushes received events | `streamSSE` + ioredis subscriber pattern documented below |
| REAL-02 | Submit endpoint publishes `REDIS PUBLISH` on `validation:{userId}:{challengeSlug}` after enrichment and DB write | Submit route already imports `redis`; add `redis.publish(channel, payload)` at step 17 on success path |
| REAL-03 | Each SSE connection uses dedicated ioredis subscriber (non-shared), cleans up subscription on client disconnect (abort signal) | `stream.onAbort()` callback to call `subscriber.unsubscribe()` then `subscriber.quit()` |
| REAL-04 | Redis configured with `maxmemory-policy noeviction` in docker-compose and Railway | Already set in docker-compose; Railway plugin config documented below |

</phase_requirements>

---

## Summary

Phase 5 implements real-time validation status push from the Hono API to the browser via Server-Sent Events backed by Redis pub/sub. The pattern is: CLI submits → Hono submit route PUBLISHes to Redis → SSE handler (subscribed per-client) receives the message and writes it to the open SSE stream → browser `EventSource` fires → `queryClient.invalidateQueries` refreshes the validation display.

The Hono `streamSSE` helper (already used in the project via `hono` 4.12.x) provides `writeSSE()` and `stream.onAbort()`. The abort callback is the authoritative cleanup hook for Node.js (`@hono/node-server`) — it fires reliably when the client disconnects. Each SSE connection creates a fresh `new Redis(REDIS_URL)` instance in subscriber mode; the shared `redis` export stays in publisher/command mode and must never enter subscriber mode.

BullMQ Worker instantiation is the other scope item. Workers are straightforward: create a `Worker` with connection options that include `maxRetriesPerRequest: null`, implement a processor function per queue, and register all workers in the entry point so the SIGTERM handler can drain them with `await Promise.all(workers.map(w => w.close()))`.

**Primary recommendation:** Use `streamSSE` + `stream.onAbort()` for SSE lifecycle; `new Redis(url)` per subscriber connection; `Worker` with `maxRetriesPerRequest: null` via ConnectionOptions; SIGTERM handler chains server.close → workers.close → redis.quit.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `hono` | 4.12.8 (installed) | `streamSSE` helper for SSE responses | Already the API framework; built-in SSE support |
| `@hono/node-server` | 1.19.11 (installed) | Node.js HTTP server adapter | Already installed; `stream.onAbort()` works correctly on Node |
| `ioredis` | 5.6.1 (installed) | Redis pub/sub subscriber + publisher | Already installed; well-tested subscriber mode |
| `bullmq` | 5.71.0 (installed via `@kubeasy/jobs`) | `Worker` class for queue consumption | Already declared in `packages/jobs`; needs `apps/api` dep |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-query` | 5.91.0 (installed) | `useQueryClient()` + `invalidateQueries` | Already powering all data fetching in apps/web |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `stream.onAbort()` | `c.req.raw.signal.addEventListener('abort', ...)` | Both work on Node; CONTEXT.md uses `onAbort()` pattern but signal listener is equivalent — use `stream.onAbort()` per locked decision |
| `new Redis(url)` per subscriber | `redis.duplicate()` | `duplicate()` inherits options from parent; `new Redis(url)` is the locked choice per STATE.md |

**Installation note:** `bullmq` must be added as a direct dependency in `apps/api/package.json` (currently only in `packages/jobs`). The Worker class lives in `bullmq` and must be available in `apps/api`.

```bash
# In apps/api/
pnpm add bullmq
```

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
apps/api/src/
├── routes/
│   ├── sse.ts               # NEW: GET /sse/validation/:challengeSlug
│   └── submit.ts            # MODIFIED: add redis.publish() at step 17
├── workers/
│   ├── user-lifecycle.worker.ts      # NEW
│   ├── challenge-submission.worker.ts # NEW
│   └── xp-award.worker.ts            # NEW
└── index.ts                 # MODIFIED: SIGTERM handler + worker registration

apps/web/src/
└── hooks/
    └── use-validation-sse.ts  # NEW: useValidationSSE(slug) hook
```

### Pattern 1: SSE Endpoint with Dedicated Subscriber

**What:** `streamSSE` wraps an infinite loop. Before the loop, create a dedicated ioredis subscriber. Use `stream.onAbort()` to clean up.

**When to use:** Whenever a long-lived push connection is needed.

```typescript
// Source: https://hono.dev/docs/helpers/streaming + ioredis docs
import { streamSSE } from "hono/streaming";
import { Redis } from "ioredis";

sse.get(
  "/validation/:challengeSlug",
  requireAuth,
  async (c) => {
    const user = c.get("user");
    const challengeSlug = c.req.param("challengeSlug");
    const channel = `validation:${user.id}:${challengeSlug}`;

    return streamSSE(c, async (stream) => {
      const subscriber = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

      // Cleanup on client disconnect
      stream.onAbort(async () => {
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
      });

      // Receive messages and forward to browser
      subscriber.on("message", async (_ch: string, message: string) => {
        await stream.writeSSE({
          data: message,
          event: "validation-update",
        });
      });

      await subscriber.subscribe(channel);

      // Heartbeat loop — keeps connection alive through proxies
      while (true) {
        await stream.writeSSE({ data: "", event: "heartbeat" });
        await stream.sleep(30_000);
      }
    });
  },
);
```

**Critical detail:** The heartbeat loop must use `stream.sleep()`, not `setTimeout`. This keeps the `streamSSE` callback alive; if the callback returns, Hono closes the stream.

### Pattern 2: Redis PUBLISH in Submit Route

**What:** After step 17 (final success response construction) in `submit.ts`, publish the enriched objectives payload.

**When to use:** Any time a server-side state change needs to push to connected SSE subscribers.

```typescript
// In submit.ts — BEFORE the return c.json(...) at step 17
// Source: ioredis docs, existing submit.ts context
const channel = `validation:${userId}:${challengeSlug}`;
const payload = JSON.stringify({
  validated,
  objectives,
  timestamp: new Date().toISOString(),
});
// Fire-and-forget: don't await, don't block the response
redis.publish(channel, payload).catch((err) => {
  console.error("Failed to publish SSE event", { channel, error: String(err) });
});

return c.json({ success: true, ... });
```

**Important:** Publish happens on the success path only (after `progressUpdated` check). Both `validated: true` and `validated: false` paths should publish — the browser should update either way.

### Pattern 3: useValidationSSE Hook

**What:** A React hook that manages an `EventSource` lifecycle tied to challenge `in_progress` status.

**When to use:** In `ChallengeMission` as a side-effect hook.

```typescript
// Source: MDN EventSource API + @tanstack/react-query docs
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useValidationSSE(slug: string, enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
    const url = `${apiBase}/api/sse/validation/${slug}`;
    const es = new EventSource(url, { withCredentials: true });

    es.addEventListener("validation-update", () => {
      queryClient.invalidateQueries({
        queryKey: ["submissions", "latest", slug],
      });
    });

    return () => {
      es.close();
    };
  }, [slug, enabled, queryClient]);
}
```

**In ChallengeMission:**
```typescript
const status = statusData?.status ?? "not_started";
useValidationSSE(slug, status === "in_progress");
```

### Pattern 4: BullMQ Worker with Graceful Shutdown

**What:** Workers instantiated with `maxRetriesPerRequest: null` in connection options. SIGTERM handler awaits all workers before exit.

**When to use:** Any queue consumption in Node.js long-lived process.

```typescript
// Source: https://docs.bullmq.io/guide/connections
// apps/api/src/workers/user-lifecycle.worker.ts
import { Worker } from "bullmq";
import { QUEUE_NAMES, type UserSignupPayload } from "@kubeasy/jobs";

export function createUserLifecycleWorker() {
  return new Worker<UserSignupPayload>(
    QUEUE_NAMES.USER_LIFECYCLE,
    async (job) => {
      // Process job
      console.log("Processing user lifecycle job", job.data);
    },
    {
      connection: {
        url: process.env.REDIS_URL ?? "redis://localhost:6379",
        maxRetriesPerRequest: null, // REQUIRED for Workers
      },
      concurrency: 5,
    },
  );
}
```

```typescript
// apps/api/src/index.ts — SIGTERM handler
// Source: https://docs.bullmq.io/guide/going-to-production
const workers = [
  createUserLifecycleWorker(),
  createChallengeSubmissionWorker(),
  createXpAwardWorker(),
];

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);
  server.close(); // stop accepting new connections
  await Promise.all(workers.map((w) => w.close())); // drain in-flight jobs
  await redis.quit(); // close shared Redis connection
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
```

**Note:** `server` here is the return value of `serve(...)` from `@hono/node-server`. Currently `index.ts` does not capture it — this is a gap to address.

### Anti-Patterns to Avoid

- **Sharing the subscriber**: Never call `redis.subscribe()` on the shared `redis` export — once a connection enters subscriber mode, it can only send subscribe/unsubscribe/quit commands. The main redis client would become unusable.
- **Using `redis.duplicate()`**: Locked decision says `new Redis(REDIS_URL)`, not `duplicate()`.
- **Returning from `streamSSE` callback early**: If the async callback returns, Hono closes the stream. The heartbeat `while(true)` loop is mandatory.
- **Blocking the response with `await redis.publish()`**: Publish is fire-and-forget in submit.ts — the HTTP response must not wait on Redis.
- **Missing `maxRetriesPerRequest: null`**: BullMQ will emit a warning and worker behavior will be unpredictable. Always set it in Worker connection options.
- **Not capturing `server` from `serve()`**: `server.close()` in SIGTERM requires holding the server reference.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE response formatting | Custom `data:` string builder | `stream.writeSSE({ data, event })` | Hono handles SSE spec formatting, escaping, line breaks |
| Client disconnect detection | Polling or timeout-based cleanup | `stream.onAbort()` | Hono fires this when the request signal aborts; it is the correct Node.js hook |
| Job queue retry/backoff | Custom retry logic | BullMQ `Worker` with `attempts: 3` + `backoff` in `createQueue` defaultJobOptions | Already configured in `packages/jobs/src/factory.ts` |
| Queue drain on shutdown | Manual job state tracking | `await worker.close()` | BullMQ handles the drain; `close()` waits for in-flight jobs |

---

## Common Pitfalls

### Pitfall 1: Subscriber in Regular Redis Mode

**What goes wrong:** Code calls `redis.subscribe(channel, ...)` on the shared `redis` export. All subsequent commands (SELECT, HSET, etc.) fail with "ERR Command not allowed in subscribe mode".

**Why it happens:** ioredis locks the connection into subscriber mode on first subscribe call.

**How to avoid:** Always create `new Redis(REDIS_URL)` for each SSE connection. Never call `.subscribe()` on the shared publisher client.

**Warning signs:** `ERR Command not allowed in subscribe mode` errors in API logs shortly after first SSE connection.

### Pitfall 2: SSE Stream Closes Immediately

**What goes wrong:** The SSE endpoint connects and immediately disconnects. Browser `EventSource` enters reconnect loop.

**Why it happens:** The `streamSSE` callback completed (returned) without keeping itself alive.

**How to avoid:** The `while(true)` heartbeat loop must be inside the `streamSSE` callback. The `subscriber.on('message', ...)` listener alone does not block callback return.

**Warning signs:** `EventSource` fires `onerror` immediately, browser shows repeated SSE connect/disconnect in Network tab.

### Pitfall 3: Subscriber Leak

**What goes wrong:** Redis `CLIENT LIST` accumulates subscriber connections over time. Server memory grows. Redis eventually hits connection limit.

**Why it happens:** The `stream.onAbort()` cleanup was not registered, or the cleanup ran but the `subscriber.quit()` call was not awaited / threw an error.

**How to avoid:** Always register `stream.onAbort()` before the `subscriber.subscribe()` call. Wrap the cleanup in try/catch to ensure it always runs.

**Warning signs:** `redis CLIENT LIST | grep subscribe | wc -l` grows over time. Described in REAL-03 success criteria: count returns to baseline after 10 clients connect and disconnect.

### Pitfall 4: BullMQ Worker Crashes on Redis Commands

**What goes wrong:** Worker throws `MaxRetriesPerRequestError` or silently ignores jobs.

**Why it happens:** `maxRetriesPerRequest` defaults to a non-null value in ioredis, causing timeout exceptions on blocking commands BullMQ uses internally (BRPOPLPUSH, etc.).

**How to avoid:** Pass `connection: { ..., maxRetriesPerRequest: null }` in Worker options. If passing a pre-built IORedis instance, ensure it was constructed with `maxRetriesPerRequest: null`.

**Warning signs:** BullMQ emits a `warn` log at startup: "maxRetriesPerRequest is not null...".

### Pitfall 5: No Server Reference for SIGTERM

**What goes wrong:** `server.close()` cannot be called because the `serve()` return value was discarded.

**Why it happens:** Current `apps/api/src/index.ts` uses `serve({ fetch: app.fetch, port }, callback)` without capturing the return value.

**How to avoid:** Capture the server: `const server = serve(...)`. The return type from `@hono/node-server` is a `ServerType` (Node.js `http.Server`).

**Warning signs:** TypeScript error "Cannot find name 'server'" when writing SIGTERM handler.

### Pitfall 6: Heartbeat Blocks Redis Cleanup on Abort

**What goes wrong:** When client disconnects, `stream.onAbort()` fires but the `stream.sleep(30_000)` inside the loop is still pending. The loop attempts another `stream.writeSSE()` after cleanup, causing unhandled write-to-closed-stream errors.

**Why it happens:** `stream.sleep()` resolves after abort, and the loop condition `while(true)` has no abort check.

**How to avoid:** Track an `aborted` flag in a closure:

```typescript
let aborted = false;
stream.onAbort(async () => {
  aborted = true;
  await subscriber.unsubscribe(channel);
  await subscriber.quit();
});

while (!aborted) {
  await stream.writeSSE({ data: "", event: "heartbeat" });
  await stream.sleep(30_000);
}
```

---

## Code Examples

### Verified: streamSSE + onAbort (Hono official docs pattern)

```typescript
// Source: https://hono.dev/docs/helpers/streaming
import { streamSSE } from "hono/streaming";

app.get("/sse", async (c) => {
  return streamSSE(c, async (stream) => {
    stream.onAbort(() => {
      // cleanup
    });
    while (true) {
      await stream.writeSSE({
        data: `message at ${new Date().toISOString()}`,
        event: "time-update",
        id: String(Date.now()),
      });
      await stream.sleep(1000);
    }
  });
});
```

### Verified: BullMQ Worker with graceful shutdown (BullMQ docs)

```typescript
// Source: https://docs.bullmq.io/guide/going-to-production
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing server...`);
  await worker.close();
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
```

### Verified: Worker ConnectionOptions with maxRetriesPerRequest null

```typescript
// Source: https://docs.bullmq.io/guide/connections
const worker = new Worker(queueName, processor, {
  connection: {
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: null, // REQUIRED
  },
});
```

### Verified: ioredis subscriber pattern

```typescript
// Source: ioredis README — pub/sub section
const subscriber = new Redis(redisUrl);
await subscriber.subscribe("channel-name");
subscriber.on("message", (channel, message) => {
  console.log(`Received ${message} from ${channel}`);
});

// Cleanup
await subscriber.unsubscribe("channel-name");
await subscriber.quit();
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Upstash Realtime (websocket-like) | Redis pub/sub + SSE | Phase 5 migration | No external managed service dependency; self-hosted Redis |
| Polling `getLatestValidationStatus` | SSE push + `invalidateQueries` | Phase 5 | Eliminates timer-based polling; instant update on submission |
| No workers (inline XP/dispatch) | BullMQ Worker instances | Phase 5 | Decoupled async processing; foundation for future `apps/worker` extraction |

---

## Open Questions

1. **EventSource URL construction**
   - What we know: `apps/web` uses `import.meta.env.VITE_API_URL` for API calls (inferred from TanStack Start + Vite env pattern)
   - What's unclear: Whether `VITE_API_URL` is already defined in the web app's env setup
   - Recommendation: Check `apps/web/.env.example` or existing api-client.ts for the base URL pattern; use the same variable

2. **PUBLISH on failure path vs success path only**
   - What we know: CONTEXT.md says "publish the full enriched submission result" — the result includes `validated: false` scenarios
   - What's unclear: Should the browser receive a push on a failed submission (all objectives not passed)?
   - Recommendation: Publish on both validated=true and validated=false paths (after DB write at step 7 in submit.ts) — the browser should update its display either way

3. **`server` type from `@hono/node-server`**
   - What we know: `serve()` returns an HTTP server that can be closed
   - What's unclear: Exact TypeScript type (`ServerType` vs `http.Server`)
   - Recommendation: Import `ServerType` from `@hono/node-server` if available, otherwise use `ReturnType<typeof serve>`

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `apps/api/vitest.config.ts` (root: `src/`) |
| Quick run command | `pnpm --filter @kubeasy/api test:run` |
| Full suite command | `pnpm --filter @kubeasy/api test:run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REAL-01 | SSE endpoint returns 401 without auth | unit | `pnpm --filter @kubeasy/api test:run -- --reporter=verbose` | ❌ Wave 0 |
| REAL-01 | SSE endpoint opens stream for authenticated user | unit | same | ❌ Wave 0 |
| REAL-02 | Submit publishes to Redis channel on success | unit | same | ❌ Wave 0 |
| REAL-03 | Subscriber created per connection, quit() called on abort | unit | same | ❌ Wave 0 |
| REAL-04 | docker-compose Redis noeviction confirmed | manual | `docker exec kubeasy-redis redis-cli CONFIG GET maxmemory-policy` | N/A |

### Sampling Rate

- **Per task commit:** `pnpm --filter @kubeasy/api test:run`
- **Per wave merge:** `pnpm --filter @kubeasy/api test:run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/api/src/__tests__/sse.test.ts` — covers REAL-01 (401 without auth, stream opens with auth), REAL-03 (subscriber cleanup)
- [ ] `apps/api/src/__tests__/submit-publish.test.ts` — covers REAL-02 (publish called after DB write)

*(Existing `submit.test.ts` has only `.todo()` stubs — new file for publish-specific tests is cleaner than extending the existing stub-only file)*

---

## Sources

### Primary (HIGH confidence)

- [Hono Streaming Helper docs](https://hono.dev/docs/helpers/streaming) — `streamSSE`, `writeSSE`, `onAbort` API
- [Hono SSE source `sse.ts`](https://github.com/honojs/hono/blob/main/src/helper/streaming/sse.ts) — confirmed `onAbort` lifecycle
- [BullMQ Graceful Shutdown](https://docs.bullmq.io/guide/workers/graceful-shutdown) — `worker.close()` API
- [BullMQ Going to Production](https://docs.bullmq.io/guide/going-to-production) — `maxmemory-policy noeviction` and SIGTERM patterns
- [BullMQ Connections](https://docs.bullmq.io/guide/connections) — `maxRetriesPerRequest: null` requirement
- Codebase: `apps/api/src/lib/redis.ts`, `apps/api/src/routes/submit.ts`, `apps/api/src/routes/index.ts`, `apps/api/src/middleware/session.ts`, `packages/jobs/src/` — direct code inspection

### Secondary (MEDIUM confidence)

- [ioredis npm](https://www.npmjs.com/package/ioredis) — subscriber mode behavior, `unsubscribe`/`quit` pattern
- [Hono GitHub Issue #1770](https://github.com/honojs/hono/issues/1770) — confirms `stream.onAbort()` preferred over raw signal for Node.js

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, versions from package.json
- Architecture: HIGH — patterns verified against Hono official docs and BullMQ docs
- Pitfalls: HIGH — subscriber leak and maxRetriesPerRequest pitfalls verified in official docs and GitHub issues

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable libraries; BullMQ and Hono have stable APIs)
