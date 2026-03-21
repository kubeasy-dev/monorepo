# Phase 7: Railway Deployment - Research

**Researched:** 2026-03-21
**Domain:** Railway deployment, Turborepo Docker, SigNoz observability
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**OTel backend (supersedes DEPLOY-04 and ROADMAP.md Phase 7 goal)**
- DEPLOY-04 is superseded — no OTel Collector on Railway in production
- Phase 6 context decision stands: apps send OTLP directly to SigNoz
- SigNoz runs as a Railway service in the same Railway project as api + web
- Both `apps/api` and `apps/web` SSR send OTLP to SigNoz in production
- `OTEL_EXPORTER_OTLP_ENDPOINT` = Railway internal hostname (e.g., `http://signoz.railway.internal:4318`)
- No public exposure of SigNoz endpoint needed — Railway internal networking used

**Railway service topology**
- Production only — no staging environment for Phase 7 (can add later)
- One Railway project with the following services:
  - `api` — `apps/api` Hono Node.js server (Dockerfile)
  - `web` — `apps/web` TanStack Start SSR Node.js server (Dockerfile)
  - `signoz` — SigNoz service for observability
  - PostgreSQL plugin (Railway-managed)
  - Redis plugin (Railway-managed)
- Both `api` and `web` use multi-stage Dockerfiles (not Nixpacks) — required for `turbo prune --docker`
- `apps/web` runs as a Node.js SSR server; landing/blog pages pre-rendered at build time, served from same process

**Watch paths strategy**
- All `packages/` changes trigger rebuild of both api and web services
- Watch paths configured via `railway.json` per app (checked into git)
- `api`: `apps/api/**`, `packages/**`
- `web`: `apps/web/**`, `packages/**`

**Environment variable management**
- Railway PostgreSQL plugin auto-injects `DATABASE_URL` — used as-is
- Railway Redis plugin auto-injects `REDIS_URL` — used as-is
- `OTEL_EXPORTER_OTLP_ENDPOINT` set to Railway internal SigNoz hostname for both api and web
- All other env vars set as Railway service variables
- Variable naming stays ISO with docker-compose local env

**Production server entry points (confirmed from code)**
- **apps/api**: `node --import ./dist/instrumentation.js dist/index.js`
- **apps/web**: `node .output/server/index.mjs`
- `apps/web/package.json` `start` script (`vite preview`) is wrong for production — Dockerfile must override

**Dockerfile structure (Turborepo 3-stage pattern)**
- Stage 1 — Prepare: Install turbo globally, run `turbo prune @kubeasy/<app> --docker`
- Stage 2 — Builder: Copy `out/json`, `pnpm install --frozen-lockfile`, copy `out/full`, run `turbo run build`
- Stage 3 — Runner: Copy only built artifacts from builder, `NODE_ENV=production`, non-root user, expose port, set CMD
- Base image: `node:22-alpine`
- Non-root user: `addgroup -S` / `adduser -S` alpine pattern

**apps/web prerender (already configured)**
- `vite.config.ts` already has `prerender: { enabled: true, crawlLinks: true, autoStaticPathsDiscovery: true }`
- After `vite build`, `.output/server/index.mjs` serves both pre-rendered static and SSR pages

### Claude's Discretion
- SigNoz Docker image version and Railway service config
- Health check endpoint config (`/health` route on api) and Railway health check settings
- Exact `.dockerignore` contents per app
- Whether to use `turbo run build --filter=@kubeasy/<app>` or `pnpm build` in builder stage

### Deferred Ideas (OUT OF SCOPE)
- Staging environment on Railway — intentionally skipped for v1
- Fine-grained watch paths per package
- Separate CDN/static host for landing + blog pages
- SigNoz public dashboard access
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPLOY-01 | Each service (`apps/api`, `apps/web`) has a Dockerfile multi-stage using `turbo prune --scope=<app> --docker` to produce a minimal image | Turborepo `prune --docker` produces `out/json` + `out/full` for Docker layer caching; pnpm handling confirmed; 3-stage pattern documented |
| DEPLOY-02 | Railway services have `Root Directory` and `Watch Paths` correctly configured — changes in `packages/` trigger redeploy | `railway.json` `build.watchPatterns` field confirmed; patterns operate from repo root regardless of root directory; per-service config via `apps/api/railway.json` and `apps/web/railway.json` |
| DEPLOY-03 | Railway uses native PostgreSQL and Redis plugins — configuration ISO with docker-compose local | PostgreSQL plugin injects `DATABASE_URL`; Redis plugin injects `REDIS_URL`; variable reference syntax `${{Postgres.DATABASE_URL}}` confirmed; Redis `maxmemory-policy` must be set via `CONFIG SET` after provisioning |
| DEPLOY-04 (superseded) | Was: OTel Collector on Railway. Now: SigNoz receives OTLP directly from apps | SigNoz Railway template identified; OTLP/HTTP port 4318 confirmed; internal Railway hostname pattern `signoz-otel-collector.railway.internal:4318` documented |
</phase_requirements>

---

## Summary

Phase 7 deploys the kubeasy monorepo to Railway using multi-stage Dockerfiles with Turborepo's `turbo prune --docker` pattern, per-service `railway.json` for watch paths, Railway-managed PostgreSQL and Redis plugins, and SigNoz running as a Railway service for observability.

The **critical complexity** is the Turborepo + pnpm + Docker integration. All three internal packages (`@kubeasy/api-schemas`, `@kubeasy/jobs`, `@kubeasy/logger`) export raw TypeScript source (JIT pattern — no `dist/` build step). The `turbo prune --docker` command correctly handles this: `out/full` includes their `.ts` source, and the builder stage compiles everything with `turbo run build`. The consuming app's build tool (esbuild via tsx/tsc for api, Vite for web) handles transpilation during `turbo run build`.

A second complexity is Railway Dockerfile service configuration. Railway does not automatically find Dockerfiles in subdirectories. The correct approach for a shared monorepo is: **no `Root Directory` set per service**, and `RAILWAY_DOCKERFILE_PATH` (via service variable) or `build.dockerfilePath` in `railway.json` pointing to the absolute path. Watch patterns in `railway.json` must be absolute from repo root.

**Primary recommendation:** Use `apps/api/railway.json` and `apps/web/railway.json` with `build.builder: "DOCKERFILE"`, `build.dockerfilePath: "apps/api/Dockerfile"` (absolute from root), and `build.watchPatterns: ["apps/api/**", "packages/**"]`. Do not set Root Directory on Railway services — the Dockerfile itself uses `turbo prune` to scope the build.

---

## Standard Stack

### Core Tools

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| turbo (global in Docker) | 2.8.20 (latest npm) | `turbo prune --docker` in prepare stage | Required for monorepo Docker optimization |
| pnpm | 10.32.1 (matches workspace) | Package installation in Docker | Must match `packageManager` in root package.json |
| node:22-alpine | 22.x (current LTS) | Base image for all stages | Minimal size, matches dev environment |

### Railway Services

| Service | Image/Source | Purpose |
|---------|-------------|---------|
| api | `apps/api/Dockerfile` | Hono Node.js API |
| web | `apps/web/Dockerfile` | TanStack Start SSR |
| PostgreSQL | Railway plugin | Managed Postgres, injects `DATABASE_URL` |
| Redis | Railway plugin | Managed Redis, injects `REDIS_URL` |
| SigNoz | Railway template (multi-service) | Observability backend — ClickHouse + OTEL Collector + SigNoz UI |

### SigNoz Railway Template Components
The official Railway SigNoz template deploys multiple services:
- `signoz` (UI) — `signoz/signoz:v0.82.1` or latest
- `signoz-otel-collector` — `signoz/signoz-otel-collector:latest`
- `clickhouse` — `signoz/clickhouse:latest`
- `zookeeper` — `signoz/zookeeper:3.7.1`

Apps send OTLP to `signoz-otel-collector`, not directly to `signoz` UI service.

**Installation:** No package installation — all Docker + Railway configuration.

**Version verification (confirmed 2026-03-21):**
- turbo: `2.8.20` (npm registry)
- pnpm: `10.32.1` (npm registry, matches repo `packageManager`)

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
apps/
├── api/
│   ├── Dockerfile          # New: 3-stage multi-stage build
│   ├── .dockerignore       # New: exclude node_modules, .env
│   └── railway.json        # New: builder + watchPatterns config
└── web/
    ├── Dockerfile          # New: 3-stage multi-stage build
    ├── .dockerignore       # New: exclude node_modules, .env
    └── railway.json        # New: builder + watchPatterns config
```

### Pattern 1: Turborepo 3-Stage Dockerfile (pnpm variant)

**What:** Three named stages — prepare (prune), builder (install + build), runner (minimal runtime)
**When to use:** Always for monorepo apps that import workspace packages

```dockerfile
# Source: https://turborepo.dev/docs/guides/tools/docker
# Adapted for pnpm and node:22-alpine

# ─── Stage 1: Prepare ────────────────────────────────────────────────────────
FROM node:22-alpine AS prepare
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
RUN npm install -g turbo@2
WORKDIR /app
COPY . .
RUN turbo prune @kubeasy/api --docker

# ─── Stage 2: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app

# Install deps (layer cached — only reruns when package.json changes)
COPY --from=prepare /app/out/json/ .
COPY --from=prepare /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=prepare /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

# Build (layer cached until source changes)
COPY --from=prepare /app/out/full/ .
RUN pnpm turbo run build --filter=@kubeasy/api

# ─── Stage 3: Runner ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production

# Non-root user (alpine pattern)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy compiled output only
COPY --from=builder --chown=appuser:appgroup /app/apps/api/dist ./dist
# Copy node_modules for production deps
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/apps/api/package.json ./package.json

EXPOSE 3001
CMD ["node", "--import", "./dist/instrumentation.js", "dist/index.js"]
```

**Critical note for JIT packages:** `@kubeasy/logger`, `@kubeasy/api-schemas`, `@kubeasy/jobs` export raw `.ts` source (no `dist/`). The `turbo run build --filter=@kubeasy/api` pipeline runs `tsc` on `apps/api` which compiles everything including imports from these packages (because `turbo.json` `dependsOn: ["^build"]` runs package builds first — but since these packages have no `build` script, turbo skips them). The app's `tsc` must resolve the `.ts` exports. This works because `apps/api/tsconfig.json` handles transpilation via `tsc` with `moduleResolution: NodeNext`.

**For apps/web runner stage:** The build output is `.output/` (Vinxi/TanStack Start):
```dockerfile
COPY --from=builder --chown=appuser:appgroup /app/apps/web/.output ./.output
CMD ["node", ".output/server/index.mjs"]
```

### Pattern 2: railway.json per app

**What:** Per-service config-as-code specifying Dockerfile path, watch patterns, start command, and health check
**When to use:** All Railway services using Dockerfiles in a shared monorepo

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/api/Dockerfile",
    "watchPatterns": ["apps/api/**", "packages/**"]
  },
  "deploy": {
    "startCommand": "node --import ./dist/instrumentation.js dist/index.js",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**For apps/web:**
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/web/Dockerfile",
    "watchPatterns": ["apps/web/**", "packages/**"]
  },
  "deploy": {
    "startCommand": "node .output/server/index.mjs",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**IMPORTANT — railway.json file location:**
The `railway.json` file path is specified as absolute from repo root when set via service variables (`RAILWAY_CONFIG_PATH`), or the file must be placed at the repo root. However, Railway docs state: "The railway.json Config File does not follow the Root Directory path — you have to specify the absolute path." For shared monorepos, place `railway.json` at the app root (`apps/api/railway.json`) and set `RAILWAY_CONFIG_PATH=apps/api/railway.json` in the service variable — OR — place it at the repo root but only for that service. The documented approach that avoids Root Directory issues: keep `railway.json` at `apps/api/railway.json` and set the service variable `RAILWAY_CONFIG_PATH=apps/api/railway.json`.

### Pattern 3: Railway Internal Networking for SigNoz

**What:** Apps reference SigNoz OTEL collector via `*.railway.internal` hostname
**When to use:** Any service-to-service communication within the same Railway project

```bash
# Environment variable set in api and web Railway services
OTEL_EXPORTER_OTLP_ENDPOINT=http://signoz-otel-collector.railway.internal:4318
```

The Railway internal DNS follows `SERVICE_NAME.railway.internal`. If the SigNoz otel-collector service is named `signoz-otel-collector`, the hostname is `signoz-otel-collector.railway.internal`. Port 4318 is OTLP/HTTP. No authentication required for SigNoz community edition.

**Important:** Use `http://` not `https://` — Wireguard tunnel encrypts traffic at the network layer; TLS is redundant and adds overhead for internal communication.

### Pattern 4: PORT environment variable in Railway

**What:** Railway injects `PORT` variable; app must listen on it; health check uses the same port
**When to use:** Always — Railway routes external traffic to `PORT`

The existing `apps/api/src/index.ts` already does:
```typescript
const port = Number(process.env.PORT ?? 3001);
```
This is correct. Railway will inject `PORT`, and the app will use it.

For `apps/web`, TanStack Start's Vinxi server also reads `PORT` from environment. The `.output/server/index.mjs` respects the PORT env var natively.

### Anti-Patterns to Avoid

- **Setting Root Directory to `apps/api`** on Railway for a shared monorepo Dockerfile: Railway then only copies `apps/api/` to the build context, but your Dockerfile's `COPY . .` in Stage 1 (prepare) won't find `packages/` or the root `pnpm-workspace.yaml`. **Use no Root Directory and control scope via `turbo prune` inside the Dockerfile.**
- **Using `NIXPACKS_TURBO_APP_NAME`**: Confirmed broken in Railpack (documented in STATE.md). Do not use it.
- **Using `vite preview` as production start command**: `apps/web/package.json` `start` script is `vite preview` which is dev-only. The Dockerfile CMD must use `node .output/server/index.mjs`.
- **Importing `@kubeasy/*` inside `instrumentation.ts`**: Must preserve `--import ./dist/instrumentation.js` flag for OTel init before any workspace package imports.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Docker layer caching for monorepo | Custom script to copy subset of files | `turbo prune --docker` | Handles lockfile pruning, workspace.yaml, and dep graph automatically |
| Service-to-service networking | VPN, public URLs, environment-specific IPs | Railway `*.railway.internal` DNS | Automatic, encrypted via Wireguard, zero config |
| Database provisioning | Custom Postgres/Redis containers | Railway PostgreSQL + Redis plugins | Managed backups, auto-injects connection strings, Railway UI |
| Observability backend | Custom OTEL Collector pipeline | SigNoz Railway template | Full stack (ClickHouse + UI + collector) in one template |
| Health check endpoint | Complex health probe logic | `/api/health` returning `{ status: "ok" }` (already exists) | Railway only needs HTTP 200 |
| Non-root user in Alpine | Manually looking up adduser flags | `addgroup -S appgroup && adduser -S appuser -G appgroup` | Standard Alpine non-root pattern |

**Key insight:** Railway's Dockerfile builder + `turbo prune` + `railway.json` handles all monorepo deployment concerns. The only custom code needed is the Dockerfiles and railway.json files themselves.

---

## Common Pitfalls

### Pitfall 1: Build Context Missing Monorepo Root Files

**What goes wrong:** Docker `COPY . .` in the prepare stage fails to find `pnpm-workspace.yaml`, root `package.json`, or `packages/` directory.
**Why it happens:** If Root Directory is set to `apps/api` in Railway, the build context is scoped to that directory only.
**How to avoid:** Do NOT set Root Directory on Railway services. Leave it at `/` (default). Control build scope via `turbo prune` inside the Dockerfile.
**Warning signs:** `turbo prune` error "workspace not found" or `pnpm install` failing with "workspace not found".

### Pitfall 2: railway.json Not Found by Railway

**What goes wrong:** Railway ignores your `railway.json` and uses Nixpacks/Railpack auto-detection instead of Dockerfile builder.
**Why it happens:** Railway looks for `railway.json` at the root of the build context. The config file path does not follow the Root Directory setting.
**How to avoid:** Either (a) place `railway.json` at the repo root and differentiate per-environment, or (b) set `RAILWAY_CONFIG_PATH=apps/api/railway.json` as a service variable so Railway knows where to find it. Recommendation: set `RAILWAY_CONFIG_PATH` service variable for each service.
**Warning signs:** Build logs show "No Dockerfile found, using Railpack" despite having a `railway.json`.

### Pitfall 3: watchPatterns Must Use Absolute Paths from Repo Root

**What goes wrong:** Push to `packages/logger` does not trigger rebuild of `api` service.
**Why it happens:** If Root Directory is set, patterns still operate from `/`. But patterns in `railway.json` are always absolute from `/` — `apps/api/**` not `**`.
**How to avoid:** Always write watch patterns as absolute from repo root: `apps/api/**`, `packages/**`.
**Warning signs:** A change to `packages/logger/src/index.ts` does not trigger a `web` or `api` redeployment.

### Pitfall 4: pnpm-workspace.yaml Missing from out/ After turbo prune

**What goes wrong:** `pnpm install` in builder stage fails with "ERR_PNPM_NO_WORKSPACE_PACKAGE" or similar.
**Why it happens:** `turbo prune --docker` produces `out/pnpm-lock.yaml` but `pnpm-workspace.yaml` may also need to be copied.
**How to avoid:** Always add `COPY --from=prepare /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml` alongside the lockfile copy in the builder stage.
**Warning signs:** `pnpm install` error referencing workspace resolution failure.

### Pitfall 5: JIT Package .ts Exports Not Resolved at Runtime

**What goes wrong:** `apps/api` starts in the runner stage and throws "Cannot find module" for `@kubeasy/logger`.
**Why it happens:** The runner stage copies `apps/api/dist/` (compiled TypeScript) but the node_modules still contain symlinks to `packages/logger/src/index.ts` (raw TS). At runtime in the runner, TypeScript is not available.
**How to avoid:** The `tsc` build of `apps/api` should inline/bundle `@kubeasy/*` package source, OR the runner must include the packages' source files too. The safe approach: in the runner stage, copy the full `node_modules` from builder (which includes pnpm symlinks resolved properly since packages' `.ts` files are present in `out/full`). Verify that `dist/` output doesn't contain imports to `../../../packages/logger/src/` — it should contain compiled JS inline or resolvable paths.
**Warning signs:** Container starts successfully in builder stage but crashes immediately in production.

### Pitfall 6: Redis maxmemory-policy Not Set to noeviction

**What goes wrong:** BullMQ queue operations fail with "OOM command not allowed" when Redis is under memory pressure.
**Why it happens:** Railway's managed Redis uses the default eviction policy, not `noeviction`. Required by BullMQ (documented in REQUIREMENTS.md REAL-04).
**How to avoid:** After provisioning the Redis plugin, connect via CLI and run: `CONFIG SET maxmemory-policy noeviction`. Then verify with `CONFIG GET maxmemory-policy`.
**Warning signs:** BullMQ jobs silently dropping, Redis connection errors under load.

### Pitfall 7: SigNoz Railway Internal Hostname Service Name Mismatch

**What goes wrong:** `OTEL_EXPORTER_OTLP_ENDPOINT=http://signoz-otel-collector.railway.internal:4318` resolves NXDOMAIN.
**Why it happens:** Railway internal DNS is `SERVICE_NAME.railway.internal`. If the SigNoz otel-collector service is named differently in your Railway project (e.g., `otel-collector` or `signoz`), the hostname won't match.
**How to avoid:** Confirm the exact service name in the Railway UI, then use that name in the internal DNS. If using the Railway template, the service name from the template is `signoz-otel-collector`.
**Warning signs:** Apps start successfully but no traces appear in SigNoz; OTLP exporter timeout errors in logs.

### Pitfall 8: apps/web .output/server/index.mjs Not Found in Runner

**What goes wrong:** Container exits with "Cannot find module '.output/server/index.mjs'".
**Why it happens:** The `COPY` in the runner stage uses wrong source path, or the vite build output is not in expected location.
**How to avoid:** Vinxi/TanStack Start writes output to `apps/web/.output/`. In runner: `COPY --from=builder /app/apps/web/.output ./.output`. CMD: `["node", ".output/server/index.mjs"]`.
**Warning signs:** Build succeeds but container crashes on startup with module resolution error.

---

## Code Examples

Verified patterns from official sources and codebase investigation:

### Health Check Endpoint (already in codebase)
```typescript
// Source: apps/api/src/routes/index.ts (confirmed)
routes.get("/health", (c) => c.json({ status: "ok" }));
// Railway healthcheckPath: "/api/health"
```

### PORT-Aware Server (already in codebase)
```typescript
// Source: apps/api/src/index.ts (confirmed)
const port = Number(process.env.PORT ?? 3001);
const server = serve({ fetch: app.fetch, port }, (info) => {
  logger.info(`Kubeasy API running on http://localhost:${info.port}`);
});
```

### railway.json watchPatterns (Source: https://docs.railway.com/reference/config-as-code)
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/api/Dockerfile",
    "watchPatterns": ["apps/api/**", "packages/**"]
  }
}
```

### Railway Variable Reference Syntax (Source: https://docs.railway.com/variables)
```
# In api service variables — reference the PostgreSQL plugin's injected variable
DATABASE_URL=${{Postgres.DATABASE_URL}}

# In api and web service variables — reference Redis plugin
REDIS_URL=${{Redis.REDIS_URL}}

# Internal SigNoz OTLP endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://signoz-otel-collector.railway.internal:4318
```

### .dockerignore (per app)
```
# apps/api/.dockerignore
node_modules
.env
.env.*
dist
*.log
.turbo
```

### pnpm in Alpine with corepack (Source: turborepo docs + community patterns)
```dockerfile
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
```
Alternatively: `RUN npm install -g pnpm@10.32.1` (simpler, same result)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `NIXPACKS_TURBO_APP_NAME` env var | `railway.json` with `builder: DOCKERFILE` + `watchPatterns` | 2024-2025 (Railpack broke it) | Must use explicit Dockerfiles; no more auto-detection |
| Separate `Root Directory` per service | No Root Directory + `RAILWAY_CONFIG_PATH` service var | Ongoing | Allows full monorepo context in Docker build |
| OTel Collector as Railway service | SigNoz (bundled collector + UI + storage) | Phase 6 decision | Simpler setup; no separate collector configuration |
| Neon serverless driver | `postgres.js` (pg) | Phase 2 | pg enables OTel auto-instrumentation |
| Upstash Redis | Railway Redis plugin | Phase 1 | Native Redis, noeviction policy, no cold starts |

**Deprecated/outdated:**
- `apps/web` `start` script (`vite preview`): dev-only, Dockerfile must use `node .output/server/index.mjs`
- `turbo prune --scope`: the `--scope` flag does not exist in current turbo — use positional argument `turbo prune @kubeasy/api`

---

## Open Questions

1. **JIT packages in compiled output — runner stage correctness**
   - What we know: All three packages (`@kubeasy/logger`, `@kubeasy/api-schemas`, `@kubeasy/jobs`) export raw `.ts`. `apps/api` uses `tsc` to compile. The compiled `dist/` will contain `.js` files with paths to these packages.
   - What's unclear: Whether `tsc` inlines the package source or generates relative import paths that require the packages' `.ts` files at runtime. If paths are relative (e.g., `../packages/logger/src/index.js` or compiled inline), the runner stage copy strategy differs.
   - Recommendation: During plan 07-01, after building locally, inspect `apps/api/dist/index.js` to confirm whether workspace packages are inlined or referenced. If referenced, the runner stage must copy `packages/*/src/` alongside `apps/api/dist/`. If inlined (more likely with `bundler: true` in tsconfig), only `dist/` is needed.

2. **SigNoz Railway template exact service names**
   - What we know: The official Railway SigNoz template deploys multiple services including an OTEL collector service.
   - What's unclear: The exact service name assigned to the OTEL collector in the Railway template. The template URL is `railway.com/deploy/signoz` and shows services but the exact naming convention can vary.
   - Recommendation: Plan 07-04 should verify the actual Railway service name for the OTEL collector after template deployment, then set `OTEL_EXPORTER_OTLP_ENDPOINT` accordingly. Use `http://signoz-otel-collector.railway.internal:4318` as starting point; adjust if service name differs.

3. **Redis maxmemory-policy persistence**
   - What we know: Railway Redis doesn't expose a config file; you must set it via `CONFIG SET` after connecting. This configuration may or may not persist across Redis restarts.
   - What's unclear: Whether `CONFIG SET maxmemory-policy noeviction` persists on Railway's managed Redis across restarts/updates. Some managed Redis providers reset config on restart.
   - Recommendation: Set it in plan 07-03, document the step. If it resets after Railway Redis restarts, raise as a separate issue — there may be a Railway-specific approach or a startup script hook.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `apps/api/vitest.config.ts` (if exists) / workspace root |
| Quick run command | `cd /path/to/website && pnpm --filter=@kubeasy/api test:run` |
| Full suite command | `pnpm test:run` (all packages) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | Docker image builds successfully with `turbo prune --docker` | manual smoke | `docker build -f apps/api/Dockerfile -t kubeasy-api .` | ❌ Wave 0 — no Dockerfile yet |
| DEPLOY-01 | Docker image builds successfully for web | manual smoke | `docker build -f apps/web/Dockerfile -t kubeasy-web .` | ❌ Wave 0 — no Dockerfile yet |
| DEPLOY-02 | `railway.json` watch paths trigger correct rebuilds | manual / Railway CI | Push change to `packages/**`, verify only api+web rebuild | ❌ manual-only — requires Railway project |
| DEPLOY-03 | PostgreSQL plugin `DATABASE_URL` connects successfully | integration (manual) | Connect to Railway Postgres from deployed api | ❌ manual-only — requires Railway project |
| DEPLOY-03 | Redis `REDIS_URL` connects + BullMQ queues work | integration (manual) | Submit a job via CLI, verify worker processes it | ❌ manual-only — requires Railway project |
| DEPLOY-04* | SigNoz receives OTLP traces from api and web | manual smoke | Check SigNoz UI after 1 API call | ❌ manual-only — requires Railway project |

*DEPLOY-04 superseded per CONTEXT.md: "SigNoz receives OTLP from deployed apps"

### Sampling Rate
- **Per task commit:** `pnpm typecheck` (catches TS errors in Dockerfiles' source)
- **Per wave merge:** Docker build smoke test (local)
- **Phase gate:** Full smoke test in Railway (login, challenge view, CLI submit, SSE update all working)

### Wave 0 Gaps
- [ ] `apps/api/Dockerfile` — covers DEPLOY-01 (created in plan 07-01)
- [ ] `apps/web/Dockerfile` — covers DEPLOY-01 (created in plan 07-01)
- [ ] `apps/api/railway.json` — covers DEPLOY-02 (created in plan 07-02)
- [ ] `apps/web/railway.json` — covers DEPLOY-02 (created in plan 07-02)

No existing test infrastructure covers deployment validation — all verification is manual smoke tests against Railway environment.

---

## Sources

### Primary (HIGH confidence)
- [Turborepo Docker guide](https://turborepo.dev/docs/guides/tools/docker) — 3-stage pattern, `--docker` flag, `out/json` + `out/full` directories
- [Turborepo prune reference](https://turborepo.dev/docs/reference/prune) — `--docker` flag, `--out-dir`, output structure confirmed
- [Railway Config as Code](https://docs.railway.com/reference/config-as-code) — `railway.json` schema: `build.builder`, `build.dockerfilePath`, `build.watchPatterns`, `deploy.startCommand`, `deploy.healthcheckPath`
- [Railway Private Networking](https://docs.railway.com/guides/private-networking) — `SERVICE_NAME.railway.internal` DNS format, HTTP (not HTTPS) for internal traffic
- [Railway Dockerfiles](https://docs.railway.com/builds/dockerfiles) — `RAILWAY_DOCKERFILE_PATH`, automatic detection from source root
- [Railway Health Checks](https://docs.railway.com/deployments/healthchecks) — PORT env var for health check, 200 status only, 300s default timeout
- [Railway Variables](https://docs.railway.com/variables) — `${{ServiceName.VAR}}` reference syntax
- [SigNoz Self-Hosted Ingestion](https://signoz.io/docs/ingestion/self-hosted/overview/) — OTLP/HTTP port 4318, no auth for community edition
- `apps/api/src/index.ts` — PORT env var confirmed (`process.env.PORT ?? 3001`), graceful SIGTERM handler
- `apps/api/src/routes/index.ts` — `/api/health` endpoint confirmed
- `apps/api/package.json` — `start` script confirmed: `node --import ./dist/instrumentation.js dist/index.js`
- `turbo.json` — `outputs: [".output/**"]` confirms TanStack Start build output path

### Secondary (MEDIUM confidence)
- [Railway Monorepo guide](https://docs.railway.com/guides/monorepo) — shared monorepo pattern, no Root Directory for shared Dockerfiles
- [Railway PostgreSQL docs](https://docs.railway.com/databases/postgresql) — `DATABASE_URL` auto-injection confirmed
- [Railway Redis docs](https://docs.railway.com/databases/redis) — `REDIS_URL` auto-injection confirmed
- Railway SigNoz template at `railway.com/deploy/signoz` — service topology (zookeeper, clickhouse, otel-collector, signoz UI)
- Turborepo + pnpm Docker discussion — `pnpm-workspace.yaml` must be copied alongside lockfile in builder stage

### Tertiary (LOW confidence)
- Railway Redis `maxmemory-policy` — only community forum evidence; no official docs on persistence behavior
- SigNoz exact service names in Railway template — observed from template page, exact service name `signoz-otel-collector` assumed but needs verification at deploy time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Turborepo docs confirmed, Railway docs confirmed, existing code read
- Architecture (Dockerfiles): HIGH — official Turborepo Docker guide + existing codebase constraints
- Architecture (railway.json): HIGH — Railway config-as-code docs confirmed schema
- Pitfalls: MEDIUM-HIGH — Root Directory/build context pitfall from official docs; JIT package runtime risk from code inspection
- SigNoz integration: MEDIUM — template verified, service names assumed (LOW for exact hostname)

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (Railway and Turborepo change frequently — re-verify if >30 days)
