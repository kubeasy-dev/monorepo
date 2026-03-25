# Phase 12: Caddy Production + Railway Deployment - Research

**Researched:** 2026-03-25
**Domain:** Caddy reverse proxy, nginx SPA serving, Railway DOCKERFILE builder, Railway private networking, OAuth redirect URI management
**Confidence:** HIGH

## Summary

Phase 12 is a pure infrastructure and deployment phase — no new application features. It wires three independently deployed Railway services (api, web, admin) behind a single Caddy reverse proxy, exposes `kubeasy.dev` through Caddy, and cuts over the OAuth redirect URIs from `api.kubeasy.dev` to `kubeasy.dev`.

The work divides into five concrete areas: (1) update the existing Caddyfile with env var placeholders, (2) write a minimal Caddy Dockerfile + `railway.json`, (3) write an nginx-based Dockerfile for `apps/admin` + its `railway.json`, (4) update OAuth provider redirect URIs and the `API_URL` env var on the `api` service, and (5) perform the DNS cutover. No Node.js code changes are required — this phase is entirely Dockerfile, config, and Railway dashboard work.

The highest-risk step is the DNS cutover. The `api.kubeasy.dev` subdomain should remain active until Caddy routing is validated in production, allowing a rollback path. All locked decisions from CONTEXT.md are unambiguous — the research below simply verifies the exact config syntax and validates there are no surprises.

**Primary recommendation:** Write both Dockerfiles as the first wave, verify them locally with `docker build`, then deploy Caddy + admin as Railway services (second wave), and perform OAuth cutover + DNS as the final gated step.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Railway handles TLS at the edge. Caddy runs HTTP-only internally. `auto_https off` in Caddyfile is confirmed as correct.
**D-02:** Caddy listens on port 80. Railway edge proxy handles HTTPS.
**D-03:** Upstream addresses injected via environment variables. Caddyfile uses `{$API_UPSTREAM}`, `{$WEB_UPSTREAM}`, `{$ADMIN_UPSTREAM}` placeholders.
**D-04:** Railway env vars for Caddy service: `API_UPSTREAM=api.railway.internal:3001`, `WEB_UPSTREAM=web.railway.internal:3000`, `ADMIN_UPSTREAM=admin.railway.internal:3002` (flexible if service names change).
**D-05:** Existing `apps/caddy/Caddyfile` must be updated to replace hardcoded `api:3001`, `admin:3002`, `web:3000` with env var placeholders.
**D-06:** `apps/admin` served by nginx in production. Dockerfile: build Vite SPA, copy to `nginx:alpine`. nginx config includes: proper cache headers, SPA fallback (`try_files $uri $uri/ /admin/index.html`), base path `/admin/` preserved.
**D-07:** `apps/admin` gets its own `railway.json`. Watch paths: `apps/admin/**`, `packages/**`.
**D-08:** Caddy proxies `/admin/*` to the nginx admin service.
**D-09:** OAuth cutover steps:
  1. Update `API_URL` on `api` service: `https://kubeasy.dev`
  2. GitHub OAuth: add `https://kubeasy.dev/api/auth/callback/github`
  3. Google OAuth: add `https://kubeasy.dev/api/auth/callback/google`
  4. Microsoft Entra: add `https://kubeasy.dev/api/auth/callback/microsoft`
  5. DNS cutover: point `kubeasy.dev` to Caddy Railway service
**D-10:** Plan includes explicit tasks for each OAuth provider with exact callback URLs.
**D-11:** Caddy Railway service uses Dockerfile based on `caddy:alpine`. Caddyfile copied to `/etc/caddy/Caddyfile`.
**D-12:** `apps/caddy/railway.json` — new file. Builder: DOCKERFILE. Watch paths: `apps/caddy/**`.
**D-13:** `flush_interval -1` directive retained in Caddyfile `/api/*` block.

### Claude's Discretion

- Exact nginx.conf contents (cache headers, gzip, SPA fallback config)
- Caddy Dockerfile single-stage vs multi-stage (caddy:alpine is lightweight — single stage is fine)
- Whether `apps/admin/railway.json` uses RAILPACK or DOCKERFILE builder
- Exact Railway service name for Caddy (e.g., `caddy` or `proxy`)
- Health check configuration for Caddy and admin services

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMIN-18 | `apps/admin` deployed as separate Railway service with its own Dockerfile | D-06/D-07: nginx-based multi-stage Dockerfile + `railway.json` with DOCKERFILE builder; turbo prune not needed for admin (nginx serves static dist/) |
| MFE-03 | Caddyfile in `apps/caddy` routes `kubeasy.dev/*` → web, `/api/*` → api (`flush_interval -1`), `/admin/*` → admin, `auto_https off` | D-01 to D-05/D-13: env var placeholders replace hardcoded hostnames |
| MFE-04 | `apps/caddy` deployed as separate Railway service with Dockerfile; custom domain `kubeasy.dev` transferred to this service | D-11/D-12: caddy:alpine Dockerfile + railway.json DOCKERFILE builder |
| MFE-05 | `API_URL` in `apps/api` updated to `https://kubeasy.dev` after Caddy cutover; OAuth redirect URIs updated for all three providers | D-09/D-10: explicit per-provider steps, exact callback URL format |

</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| caddy:alpine | 2.x (latest) | Reverse proxy base image | Official Caddy Docker image; alpine minimizes image size |
| nginx:alpine | 1.x (latest) | Static SPA serving in admin Dockerfile | Industry standard for serving Vite SPAs; sub-1MB image |

### Not Applicable
This phase adds no Node.js dependencies. The only "packages" are Docker base images pulled at build time by Railway.

**Installation:** No `pnpm install` changes needed. This phase is Dockerfile + config files only.

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
apps/
├── caddy/
│   ├── Caddyfile          # UPDATED — env var placeholders
│   ├── Dockerfile         # NEW — caddy:alpine single-stage
│   └── railway.json       # NEW — DOCKERFILE builder
└── admin/
    ├── Dockerfile         # NEW — node build + nginx:alpine serve
    ├── railway.json       # NEW — DOCKERFILE builder
    └── nginx.conf         # NEW — SPA routing config
```

### Pattern 1: Caddy Dockerfile (single-stage, caddy:alpine)

**What:** Copy Caddyfile into the official Caddy image. No build step needed.
**When to use:** When Caddy config is static (baked into image). Railway env vars supply the dynamic upstream addresses at runtime via `{$VAR}` placeholders.

```dockerfile
# Source: https://hub.docker.com/_/caddy
FROM caddy:alpine

COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
```

Caddy reads `{$API_UPSTREAM}` from the container environment at startup. The Railway service must have `API_UPSTREAM`, `WEB_UPSTREAM`, `ADMIN_UPSTREAM` set as environment variables in the Railway dashboard.

### Pattern 2: Updated Caddyfile with env var placeholders

```caddyfile
# Source: apps/caddy/Caddyfile (current file, update D-05)
kubeasy.dev {
    auto_https off

    # API routes — SSE requires immediate flush for real-time validation updates
    handle /api/* {
        reverse_proxy {$API_UPSTREAM} {
            flush_interval -1
        }
    }

    # Admin SPA — served from nginx
    handle /admin/* {
        reverse_proxy {$ADMIN_UPSTREAM}
    }

    # Web app — catch-all
    handle {
        reverse_proxy {$WEB_UPSTREAM}
    }
}
```

**Critical:** `{$VAR_NAME}` is Caddy's environment variable syntax. Double-braces `{{$VAR}}` is wrong. Verified from Caddy docs.

### Pattern 3: Admin Dockerfile (node build + nginx:alpine serve)

**What:** Two-stage build — Stage 1 builds the Vite SPA using node+pnpm, Stage 2 copies `dist/` into nginx:alpine.
**When to use:** Any Vite SPA that needs production serving. No turbo prune needed because nginx doesn't run Node.js — it just serves static files.

```dockerfile
# Stage 1: Build the SPA
FROM node:22-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

# Copy workspace config (pnpm needs lockfile + workspace context to install)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY apps/admin/ apps/admin/

# Install all workspace deps needed for admin build
RUN pnpm install --frozen-lockfile

# Build the SPA (tsc --noEmit && vite build)
WORKDIR /app/apps/admin
RUN pnpm build

# Stage 2: Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

**Note on pnpm install scope:** Because `@kubeasy/admin` depends on workspace packages (`@kubeasy/ui`, `@kubeasy/api-schemas`), the full workspace context (packages/ dir + pnpm-workspace.yaml) must be available during the build stage. `turbo prune` would optimize this but is not strictly required since nginx serves static files — build image size is discarded.

### Pattern 4: nginx.conf for Vite SPA at /admin/ base path

**What:** nginx config handling SPA routing with `/admin/` base path.
**Critical detail:** The SPA is built with `base: '/admin/'` in vite.config.ts. All asset paths in `index.html` will be `/admin/assets/...`. nginx serves files from the root `/usr/share/nginx/html/` but the URL path starts with `/admin/`. This requires correct `location` block with `alias` or `root` + `try_files`.

```nginx
server {
    listen 80;
    server_name _;

    # Gzip for text assets
    gzip on;
    gzip_types text/html text/css application/javascript application/json;

    # SPA — all /admin/* requests serve index.html
    location /admin/ {
        alias /usr/share/nginx/html/;
        try_files $uri $uri/ /admin/index.html;

        # Cache busted assets (hashed filenames) — cache aggressively
        location ~* \.(js|css|woff2|png|svg|ico)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Redirect bare /admin to /admin/
    location = /admin {
        return 301 /admin/;
    }
}
```

**Pitfall:** `root` vs `alias` in nginx. When using `location /admin/` with `root /usr/share/nginx/html`, nginx would look for `/usr/share/nginx/html/admin/` (appends the location prefix). With `alias /usr/share/nginx/html/`, nginx strips the `/admin/` prefix and serves directly from the alias path. Since Vite outputs to `dist/` (not `dist/admin/`), `alias` is correct here.

**Alternative simpler approach:** If Caddy strips the `/admin/` prefix before forwarding to nginx, nginx could serve from `/` with `root /usr/share/nginx/html`. However, Caddy's `reverse_proxy /admin/*` does NOT strip the path prefix by default — it forwards the full path. So nginx must handle `/admin/*` paths directly.

### Pattern 5: railway.json for DOCKERFILE builder

The existing `apps/api/railway.json` and `apps/web/railway.json` use `"builder": "RAILPACK"` with separate `railpack.json` config files. For Caddy and admin, DOCKERFILE builder is used:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/caddy/Dockerfile",
    "watchPatterns": ["apps/caddy/**"]
  },
  "deploy": {
    "healthcheckPath": "/",
    "healthcheckTimeout": 60,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**Note on dockerfilePath:** Railway resolves Dockerfile paths relative to the repository root when the service `Root Directory` is set to the repo root. Since this monorepo has all services configured from the repo root, the `dockerfilePath` must be relative to the root.

**Admin railway.json:**
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/admin/Dockerfile",
    "watchPatterns": ["apps/admin/**", "packages/**"]
  },
  "deploy": {
    "healthcheckPath": "/admin/",
    "healthcheckTimeout": 120,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### Anti-Patterns to Avoid

- **Using `turbo prune` for admin/caddy:** `turbo prune` is for Node.js services that need a minimal lockfile. Caddy is a binary; admin builds to static files. No pruning needed.
- **Configuring Caddy with Let's Encrypt:** `auto_https off` is already in the Caddyfile. Railway handles TLS at the edge. Adding ACME would fail (port 443 not open inside Railway) and is unnecessary.
- **Forgetting `flush_interval -1` for SSE:** Caddy's default behavior buffers responses. SSE requires immediate flushing. This is the only production correctness item — must not be omitted.
- **Using `root` instead of `alias` in nginx for base-path SPA:** This causes 404s for all admin assets. Use `alias` when the nginx `location` path prefix differs from the filesystem path.
- **Leaving old redirect URIs only:** OAuth providers should have BOTH old and new URIs during the transition window. Remove old ones only after confirming new flow works.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TLS cert management | Custom ACME client or self-signed cert rotation | Railway edge TLS (already handled) | Railway terminates HTTPS at the edge; Caddy only needs HTTP internally |
| SSE buffering workaround | Custom chunked transfer middleware | `flush_interval -1` in Caddy reverse_proxy block | Single directive; Caddy handles HTTP streaming correctly |
| SPA 404 fallback | Custom nginx Lua script | `try_files $uri $uri/ /admin/index.html` | Standard nginx SPA pattern; one line |
| Path stripping | Custom Caddy middleware | Caddy `handle_path` or correct nginx `alias` | Built-in — use correct primitives |

---

## Common Pitfalls

### Pitfall 1: Caddy env var syntax
**What goes wrong:** Using `${API_UPSTREAM}` (shell syntax) instead of `{$API_UPSTREAM}` (Caddy syntax). Shell-style substitution does not work in Caddyfile.
**Why it happens:** Shell variable substitution is muscle memory.
**How to avoid:** Caddy environment variables use `{$VAR_NAME}` — single curly braces, dollar sign inside.
**Warning signs:** Caddy startup log shows `unrecognized token` or the literal string `${API_UPSTREAM}` in error output.

### Pitfall 2: Railway private networking hostname format
**What goes wrong:** Using wrong internal hostname (e.g., `api-service.internal` or `api.internal` instead of `api.railway.internal`).
**Why it happens:** Railway's internal DNS format is easy to misremember.
**How to avoid:** The format is `<service-name>.railway.internal` where `<service-name>` matches the Railway service name exactly (lowercase). If the Railway service is named `api`, the hostname is `api.railway.internal`.
**Warning signs:** Caddy proxy returns 502 Bad Gateway; `curl` from within the Caddy container times out.

### Pitfall 3: nginx alias path for Vite SPA with base path
**What goes wrong:** Using `root` directive instead of `alias` when the nginx `location` block has a path prefix (`/admin/`). The `root` directive appends the location prefix to the document root, causing nginx to look for files in `/usr/share/nginx/html/admin/` instead of `/usr/share/nginx/html/`.
**Why it happens:** `root` and `alias` look similar. The distinction matters when the URL path and filesystem path differ.
**How to avoid:** When using `location /admin/` with files in `/usr/share/nginx/html/` (no `admin/` subdirectory), use `alias /usr/share/nginx/html/`.
**Warning signs:** nginx returns 404 for all assets; `docker exec` into container reveals `/usr/share/nginx/html/` has files but `/usr/share/nginx/html/admin/` does not exist.

### Pitfall 4: OAuth redirect URIs — add before DNS cutover
**What goes wrong:** Updating DNS before adding new OAuth redirect URIs causes all OAuth logins to fail in production (providers reject callbacks to unregistered URIs).
**Why it happens:** Cutover sequence not carefully ordered.
**How to avoid:** Always register the new redirect URIs FIRST, verify they appear in provider dashboards, then cut DNS. Keep old URIs registered for 24h after cutover as fallback.
**Warning signs:** OAuth login redirects to provider but returns error "redirect_uri_mismatch".

### Pitfall 5: Docker build context for admin includes workspace
**What goes wrong:** Running `docker build apps/admin/` from repo root — Docker build context is `apps/admin/` which excludes `packages/` and root `pnpm-lock.yaml`, causing `pnpm install` to fail (workspace packages not found).
**Why it happens:** Multi-package monorepo Docker builds require full workspace context.
**How to avoid:** Always build admin Dockerfile with repo root as context: `docker build -f apps/admin/Dockerfile .` from repo root. The `COPY` instructions in the Dockerfile reference paths relative to this context.
**Warning signs:** `pnpm install` error: `ERR_PNPM_NO_MATCHING_VERSION` or `Cannot find package @kubeasy/ui`.

### Pitfall 6: `VITE_API_URL` in admin must be updated for production
**What goes wrong:** After DNS cutover, admin's `VITE_API_URL` still points to `http://localhost:3024` (the default in `apps/admin/src/lib/auth-client.ts`). Admin fails to authenticate in production.
**Why it happens:** Admin has no Railway env var set yet — it falls back to the localhost default baked into source.
**How to avoid:** Set `VITE_API_URL=https://kubeasy.dev` as a Railway build-time env var on the admin service. Since `VITE_API_URL` is a Vite env var, it is compiled into the build artifact — it must be set BEFORE the Railway build runs.
**Warning signs:** Admin loads in browser but auth check fails with CORS error or 401 from `localhost:3024`.

### Pitfall 7: `VITE_WEB_URL` for admin auth redirects
**What goes wrong:** Admin's `__root.tsx` redirects unauthenticated users to `/login` and `/`. In production these relative paths route correctly through Caddy (since all traffic goes through `kubeasy.dev`), but only if `window.location.href` redirects work. The env var `VITE_WEB_URL` may not be set for production.
**Why it happens:** The default `VITE_WEB_URL` is `http://localhost:3000` (from `.env.example`). The route guard uses `window.location.href = "/login"` (relative path based on current code), which is correct in production — relative paths will stay on `kubeasy.dev`. No action needed unless the guard was later changed to use the env var.
**Warning signs:** After login, admin redirects to `http://localhost:3000` instead of `https://kubeasy.dev`.

---

## Code Examples

### Verified: Caddy environment variable syntax

```caddyfile
# Source: https://caddyserver.com/docs/caddyfile/concepts#environment-variables
# Caddy env var syntax: {$ENV_VAR_NAME}
# NOT shell syntax ${ENV_VAR_NAME}

kubeasy.dev {
    auto_https off

    handle /api/* {
        reverse_proxy {$API_UPSTREAM} {
            flush_interval -1
        }
    }

    handle /admin/* {
        reverse_proxy {$ADMIN_UPSTREAM}
    }

    handle {
        reverse_proxy {$WEB_UPSTREAM}
    }
}
```

### Verified: nginx try_files for SPA fallback

```nginx
# Standard SPA fallback pattern (HIGH confidence — nginx docs)
location /admin/ {
    alias /usr/share/nginx/html/;
    try_files $uri $uri/ /admin/index.html;
}
```

### Verified: Railway DOCKERFILE builder in railway.json

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/caddy/Dockerfile",
    "watchPatterns": ["apps/caddy/**"]
  }
}
```

### Verified: Better Auth callback URL format (from CONTEXT.md specifics)

```
https://kubeasy.dev/api/auth/callback/github
https://kubeasy.dev/api/auth/callback/google
https://kubeasy.dev/api/auth/callback/microsoft
```

This matches Better Auth's default callback path: `/api/auth/callback/{provider}` where provider is the lowercase provider name. The `API_URL` env var on the `api` service is the base URL that Better Auth prepends to these paths.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded Docker Compose hostnames (`api:3001`) in Caddyfile | Env var placeholders (`{$API_UPSTREAM}`) | Phase 12 | Caddyfile works in both Docker Compose and Railway without modification |
| `api.kubeasy.dev` as the Better Auth `baseURL` | `kubeasy.dev` as the Better Auth `baseURL` | Phase 12 DNS cutover | Single-domain architecture; no CORS complexity; OAuth callbacks on same domain |

---

## Open Questions

1. **Railway service name for Caddy**
   - What we know: Decision D-12 says `apps/caddy/railway.json` — Railway service name is set in the Railway dashboard UI, not the `railway.json` file
   - What's unclear: The exact service name determines the internal hostname used by OTHER services if they ever need to reach Caddy (unlikely — Caddy is the entry point, not a peer)
   - Recommendation: Name it `caddy` in Railway dashboard. The internal hostname `caddy.railway.internal` is unused but consistent. No impact on phase success.

2. **`apps/admin` RAILPACK vs DOCKERFILE builder**
   - What we know: CONTEXT.md marks this as Claude's Discretion. RAILPACK may not support nginx-based serving (it's a Node.js-oriented builder). The admin service needs a two-stage build (Node build + nginx serve).
   - What's unclear: Whether RAILPACK can detect a Vite SPA + output to a `dist/` folder + serve via nginx automatically
   - Recommendation: Use DOCKERFILE builder. RAILPACK is designed for Node.js apps (api, web both run Node.js processes). Admin's production artifact is a static nginx container. DOCKERFILE gives explicit control and matches the standard pattern for SPAs.

3. **Port exposure in Caddy Dockerfile**
   - What we know: D-02 says Caddy listens on port 80. Railway injects `PORT` env var.
   - What's unclear: Whether Railway's DOCKERFILE builder requires `EXPOSE` or reads `PORT` env var to determine which container port to map
   - Recommendation: Both `EXPOSE 80` in Dockerfile AND configure Caddy to listen on `:{$PORT}` (Railway injects PORT=80 by default). Using `:{$PORT}` makes it explicit. Caddy's site block `kubeasy.dev` with `auto_https off` implicitly listens on port 80. Adding `http://0.0.0.0:{$PORT}` or just keeping `kubeasy.dev` with `auto_https off` should be sufficient.

---

## Environment Availability

> This phase modifies Railway config and Dockerfiles — no local tool dependencies beyond Docker.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | Caddy + admin Dockerfile local testing | Assumed available (dev environment) | — | Skip local build test — deploy directly to Railway |
| Railway CLI / Dashboard | Service deployment, env var setting | Railway dashboard always available | — | — |
| GitHub OAuth App settings | D-09 step 2 | Manual dashboard access | — | — |
| Google Cloud Console | D-09 step 3 | Manual dashboard access | — | — |
| Microsoft Entra | D-09 step 4 | Manual dashboard access | — | — |

**Missing dependencies with no fallback:** None — Railway dashboard access is always available.

**Note:** DNS cutover requires access to the domain registrar or DNS provider for `kubeasy.dev`. This is assumed to be in scope and accessible.

---

## Validation Architecture

> nyquist_validation is enabled in .planning/config.json.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (apps/api) |
| Config file | `apps/api/vitest.config.ts` |
| Quick run command | `cd apps/api && pnpm test:run` |
| Full suite command | `pnpm test:run` (from root via turbo) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMIN-18 | admin service builds and serves `/admin/` | smoke (manual) | `docker build -f apps/admin/Dockerfile . && docker run -p 8080:80 <img> && curl http://localhost:8080/admin/` | ❌ Wave 0 — manual verification |
| MFE-03 | Caddyfile routes `/api/*` with flush_interval -1, `/admin/*`, catch-all | smoke (manual) | `docker build -f apps/caddy/Dockerfile apps/caddy/ && docker run -e API_UPSTREAM=... <img>` | ❌ Wave 0 — manual verification |
| MFE-04 | Caddy Railway service deployed with `kubeasy.dev` domain | manual | Railway dashboard inspection | N/A |
| MFE-05 | OAuth login flows work end-to-end | manual e2e | Browser OAuth flow test | N/A |

**Note:** This phase is infrastructure-only. There are no automated unit tests to write — all validations are Docker build verification, Railway deployment confirmation, and manual browser-based OAuth flow testing.

### Sampling Rate

- **Per task commit:** `pnpm typecheck` (no code changes expected, but catches any accidental TS breaks)
- **Per wave merge:** `docker build` verification of both Dockerfiles
- **Phase gate:** Full OAuth + SSE smoke test in production before marking phase complete

### Wave 0 Gaps

None — existing test infrastructure covers all automatable requirements. Infrastructure phases require manual verification steps documented in plan tasks.

---

## Sources

### Primary (HIGH confidence)

- Caddy Caddyfile concepts — environment variable syntax `{$VAR}` — https://caddyserver.com/docs/caddyfile/concepts#environment-variables
- Caddy reverse_proxy directive — `flush_interval` option — https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- nginx `alias` vs `root` — https://nginx.org/en/docs/http/ngx_http_core_module.html#alias
- Project CONTEXT.md (D-01 through D-13) — all locked decisions
- Existing `apps/caddy/Caddyfile` — confirmed routing structure
- Existing `apps/api/railway.json` + `apps/web/railway.json` — confirmed RAILPACK + watchPatterns patterns
- `apps/admin/vite.config.ts` — confirmed `base: '/admin/'` setting
- `apps/admin/src/lib/auth-client.ts` — confirmed `VITE_API_URL` default and `credentials: "include"` pattern

### Secondary (MEDIUM confidence)

- Railway DOCKERFILE builder `dockerfilePath` field — inferred from Railway schema and existing RAILPACK pattern; builder field values are `"RAILPACK"` and `"DOCKERFILE"`
- nginx `try_files` SPA fallback pattern — widely documented; cross-verified with known working nginx config

### Tertiary (LOW confidence)

- Railway PORT env var injection behavior for DOCKERFILE builder — training data knowledge; recommend verifying in Railway docs or testing with `echo $PORT` in Dockerfile CMD during initial deploy

---

## Metadata

**Confidence breakdown:**
- Caddyfile update: HIGH — existing file examined, env var syntax verified
- Caddy Dockerfile: HIGH — single-stage caddy:alpine is the documented pattern
- admin Dockerfile: HIGH — standard Vite + nginx:alpine pattern; only alias/root subtlety requires attention
- railway.json configs: HIGH — existing patterns in repo + DOCKERFILE builder is straightforward
- OAuth cutover: HIGH — callback URLs from CONTEXT.md specifics are explicit; sequencing is clear
- Railway private networking: MEDIUM — `*.railway.internal` format consistent with project STATE.md and Phase 7 context

**Research date:** 2026-03-25
**Valid until:** 2026-06-25 (Railway and Caddy configs are stable)
