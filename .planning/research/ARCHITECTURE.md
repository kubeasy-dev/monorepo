# Architecture Research

**Domain:** Turborepo monorepo micro-frontend + shared shadcn/ui + Vite admin SPA
**Researched:** 2026-03-24
**Confidence:** HIGH

## Standard Architecture

### System Overview (v1.1 target state)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     LOCAL DEV (Turborepo proxy :3024)                    │
│                                                                          │
│  localhost:3024/          → apps/web  (TanStack Start SSR  :3000)        │
│  localhost:3024/admin/*   → apps/admin (Vite React SPA     :3002)        │
│  localhost:3024/api/*     → apps/api  (Hono REST + SSE     :3001)        │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                     PRODUCTION (Railway — 5 services)                    │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Caddy reverse proxy  (kubeasy.dev — Railway private networking) │   │
│  │                                                                  │   │
│  │  kubeasy.dev/          → web service   (Railway private domain)  │   │
│  │  kubeasy.dev/admin/*   → admin service (Railway private domain)  │   │
│  │  kubeasy.dev/api/*     → api service   (Railway private domain)  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│  │ web service │  │admin service│  │ api service │                     │
│  │ TanStack    │  │ Vite SPA    │  │ Hono + BullMQ│                    │
│  │ Start SSR   │  │ (static)    │  │ + Drizzle   │                     │
│  └─────────────┘  └─────────────┘  └─────────────┘                     │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐                                       │
│  │ PostgreSQL  │  │   Redis     │  (Railway plugins — shared)            │
│  └─────────────┘  └─────────────┘                                       │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                     PACKAGES (no build step — JIT TS)                    │
│                                                                          │
│  packages/ui             ← NEW: shadcn/ui components (Tailwind CSS 4)   │
│  packages/api-schemas    ← existing Zod contracts                       │
│  packages/jobs           ← existing BullMQ definitions                  │
│  packages/logger         ← existing Pino wrapper                        │
│  packages/typescript-config ← existing tsconfig bases                   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `apps/web` | Public-facing SSR/SSG site: landing, blog, challenges, dashboard | Existing — receives shared `packages/ui` |
| `apps/api` | REST API + SSE, auth, DB, BullMQ workers | Existing — no structural changes in v1.1 |
| `apps/admin` | Client-only SPA for admin tasks; consumes `apps/api` admin routes | NEW |
| `packages/ui` | shadcn/ui component library shared between web and admin | NEW |
| Caddy service | Production reverse proxy routing all traffic under `kubeasy.dev` | NEW |
| Turbo proxy | Dev-only proxy at :3024 routing to the three apps | Config change only |

---

## Recommended Project Structure

```
kubeasy/app/
├── microfrontends.json          # NEW — Turborepo proxy routing config
├── turbo.json                   # Updated — proxy task integration
├── apps/
│   ├── web/                     # Existing — add @kubeasy/ui dep, remove local ui/ dir
│   │   ├── components.json      # shadcn config pointing to @kubeasy/ui
│   │   └── src/
│   │       └── components/      # Only app-specific compositions remain
│   ├── api/                     # Existing — unchanged code
│   └── admin/                   # NEW
│       ├── package.json         # name: "@kubeasy/admin"
│       ├── vite.config.ts       # base: "/admin", port: $TURBO_MFE_PORT
│       ├── components.json      # shadcn config pointing to @kubeasy/ui
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── routes/          # TanStack Router or react-router for SPA routing
│           ├── components/      # Admin-specific components only
│           ├── lib/
│           │   ├── auth-client.ts  # Better Auth client (same config as web)
│           │   └── api-client.ts   # Fetch wrapper to VITE_API_URL
│           └── styles/
│               └── globals.css  # @import "@kubeasy/ui/styles" + @source directive
├── packages/
│   ├── ui/                      # NEW
│   │   ├── package.json         # name: "@kubeasy/ui"
│   │   ├── components.json      # shadcn monorepo config (root of components)
│   │   ├── src/
│   │   │   ├── components/      # shadcn primitives (button, card, dialog, etc.)
│   │   │   ├── hooks/           # shadcn hooks (use-mobile, etc.)
│   │   │   └── lib/
│   │   │       └── utils.ts     # cn() helper
│   │   └── styles/
│   │       └── globals.css      # @theme CSS variables (Tailwind CSS 4)
│   ├── api-schemas/             # Existing
│   ├── jobs/                    # Existing
│   ├── logger/                  # Existing
│   └── typescript-config/       # Existing
└── docker/
    └── Caddyfile                # NEW — production reverse proxy config
```

### Structure Rationale

- **`microfrontends.json` at root:** Turborepo reads it automatically when `turbo dev` runs; proxy port defaults to 3024.
- **`packages/ui/` as component source of truth:** shadcn CLI installs components here; apps import from `@kubeasy/ui`; no duplication between web and admin.
- **`apps/admin/` as Vite SPA:** Client-side only — no SSR needed for admin, keeps it simple and fast to build. Served as static files.
- **`docker/Caddyfile`:** Keeps infra config colocated with repo; Caddy Railway service uses it via a Docker image or mounted config.

---

## Architectural Patterns

### Pattern 1: Turborepo Proxy via `microfrontends.json`

**What:** A `microfrontends.json` at the repo root instructs `turbo dev` to spin up a proxy server that routes requests across apps based on path prefixes. Apps receive their assigned port via `$TURBO_MFE_PORT`.

**When to use:** All local development. Lets the browser hit one origin (`localhost:3024`) while apps run on different ports — solving cross-origin auth cookie issues with Better Auth.

**Trade-offs:** Proxy is dev-only; production requires Caddy. The proxy port (3024 by default) is where developers point their browser, not 3000/3001/3002.

**Config example:**
```json
// microfrontends.json
{
  "$schema": "https://turborepo.dev/schema/microfrontends.json",
  "applications": {
    "web": {
      "development": { "local": { "port": 3000 } }
    },
    "admin": {
      "development": { "local": { "port": 3002 } },
      "routing": [{ "path": "/admin" }]
    },
    "api": {
      "development": { "local": { "port": 3001 } },
      "routing": [{ "path": "/api" }]
    }
  },
  "options": { "localProxyPort": 3024 }
}
```

`web` has no routing entry — it is the default catch-all app.

**Dev script update in apps:**
```jsonc
// apps/admin/package.json
"dev": "vite dev --port $TURBO_MFE_PORT"
// apps/web/package.json
"dev": "vinxi dev --port $TURBO_MFE_PORT"
// apps/api/package.json — no change needed (not a frontend)
```

### Pattern 2: `packages/ui` as shadcn Component Library

**What:** shadcn/ui components live in `packages/ui` with their own `components.json`. Consumer apps (`web`, `admin`) each have their own `components.json` pointing aliases at `@kubeasy/ui`. The package exports no compiled JS — apps import TypeScript source directly (same JIT pattern as the other shared packages).

**When to use:** Any shared UI primitive (Button, Card, Dialog, Badge, etc.). App-specific layout compositions stay in the app.

**Trade-offs:** No build step needed (Vite/Vinxi resolves TypeScript workspace imports directly). Tailwind CSS 4 `@source` directive must be configured in each consumer app to scan `packages/ui/src/**` for utility classes — otherwise styles are not generated.

**Config example:**
```json
// packages/ui/package.json
{
  "name": "@kubeasy/ui",
  "exports": {
    "./components/*": "./src/components/*.tsx",
    "./hooks/*": "./src/hooks/*.tsx",
    "./lib/*": "./src/lib/*.ts",
    "./styles": "./styles/globals.css"
  }
}
```

```json
// packages/ui/components.json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "tailwind": { "baseColor": "slate", "cssVariables": true },
  "aliases": {
    "components": "@kubeasy/ui/components",
    "utils": "@kubeasy/ui/lib/utils",
    "hooks": "@kubeasy/ui/hooks"
  }
}
```

```css
/* apps/admin/src/styles/globals.css */
@import "tailwindcss";
@import "@kubeasy/ui/styles";
@source "../../packages/ui/src/**/*.{ts,tsx}";
```

### Pattern 3: Caddy Path-Based Reverse Proxy (Production)

**What:** A Caddy service on Railway receives all traffic at `kubeasy.dev` and forwards to three Railway private-domain services based on path prefix. Uses Railway's internal networking (no public internet hop between services).

**When to use:** Production only. Caddy replaces the need for separate subdomains per service. All three apps share the same `kubeasy.dev` origin — auth cookies work as same-origin without cross-subdomain config.

**Trade-offs:** Caddy is an additional Railway service (small cost). Caddy must know private domain names of other services via env vars (Railway reference variables). TLS termination is handled by Railway's load balancer upstream — Caddy runs in plain HTTP mode internally on `$PORT`.

**Caddyfile pattern:**
```
{
  auto_https off
}

:{$PORT} {
  handle /api/* {
    reverse_proxy {$API_PRIVATE_URL} {
      flush_interval -1
    }
  }
  handle /admin/* {
    reverse_proxy {$ADMIN_PRIVATE_URL}
  }
  handle {
    reverse_proxy {$WEB_PRIVATE_URL}
  }
}
```

Railway injects `$PORT` automatically. `API_PRIVATE_URL`, `ADMIN_PRIVATE_URL`, `WEB_PRIVATE_URL` are set as Railway reference variables pointing to each service's private domain.

### Pattern 4: Admin SPA with `base: "/admin"`

**What:** Vite config sets `base: "/admin"` so all asset paths are prefixed correctly when served from a sub-path. The SPA router must also use a matching base path.

**When to use:** Any SPA served from a non-root path. Critical — without this, Vite emits root-relative `/assets/…` paths that return 404 when the app is served under `/admin/`.

**Trade-offs:** `base` must match exactly between dev proxy routing and Caddy routing in prod. Trailing-slash normalization in Caddy must be consistent with what Vite expects.

```typescript
// apps/admin/vite.config.ts
export default defineConfig({
  base: "/admin",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  }
})
```

---

## Data Flow

### Request Flow — Admin User Managing Challenges

```
Admin Browser → kubeasy.dev/admin/challenges
    ↓
Railway LB → Caddy (/admin/* → admin service)
    ↓
admin service serves index.html (Vite static build)
    ↓
React app boots → router renders /admin/challenges
    ↓
useQuery → fetch("/api/admin/challenges")  [same origin — Caddy routes it]
    ↓
Caddy (/api/* → api service)
    ↓
Hono apps/api — admin middleware (role check) → DB query
    ↓
JSON response → React renders challenge list
```

In dev: all requests go through the Turbo proxy at :3024 which routes to :3001/:3002/:3000 respectively. Same path logic applies.

### Auth Cookie Flow — Simplified in v1.1

```
v1.0 state:
  web on kubeasy.dev, api on api.kubeasy.dev
  → Better Auth cookie domain: .kubeasy.dev  (cross-subdomain)

v1.1 state:
  web + admin + api all under kubeasy.dev/* via Caddy
  → Better Auth cookie domain: kubeasy.dev  (same-origin, simpler)
```

`API_URL` env var on `apps/api` must change from `https://api.kubeasy.dev` to `https://kubeasy.dev`. OAuth redirect URIs registered in GitHub/Google/Microsoft OAuth apps must be updated to match.

### SSE Flow — Real-time Validation Updates

SSE connections (`GET /api/sse`) travel through Caddy to `apps/api`. Long-lived connections require `flush_interval -1` on the `/api/*` handle block to prevent Caddy from buffering SSE frames. Without this, clients receive no events until the buffer fills.

### Build Dependency Graph

```
packages/typescript-config  (no deps)
      ↑
packages/logger       packages/api-schemas    packages/jobs    packages/ui [NEW]
      ↑                     ↑                     ↑                ↑
      └─────────────────────┴─────────────────────┴────────────────┘
                                    ↑
                  apps/api     apps/web     apps/admin [NEW]

Turbo build order (topological via "dependsOn": ["^build"]):
1. All packages/* in parallel  (no cross-package deps)
2. All apps/* in parallel      (after packages complete)
```

`packages/ui` needs no build step — Vite and Vinxi resolve TypeScript workspace imports directly. Turbo's `typecheck` pipeline (`"dependsOn": ["^typecheck"]`) ensures packages typecheck before apps.

---

## New vs Modified: Explicit Inventory

### New (v1.1)

| Artifact | Type | Notes |
|----------|------|-------|
| `microfrontends.json` | Config | Root-level Turborepo proxy config |
| `apps/admin/` | New app | Vite + React 19 SPA, port via `$TURBO_MFE_PORT`, base `/admin` |
| `packages/ui/` | New package | shadcn/ui shared component library, no build step |
| `docker/Caddyfile` | Config | Production reverse proxy rules |
| Caddy Railway service | Infrastructure | New Railway service, receives `kubeasy.dev` custom domain |

### Modified (v1.1)

| Artifact | Change | Risk |
|----------|--------|------|
| `turbo.json` | May need `proxy` task or `dev` config update for microfrontends | Low |
| `apps/web/package.json` | Add `@kubeasy/ui` dep, update dev script to use `$TURBO_MFE_PORT` | Low |
| `apps/web/components.json` | Point aliases to `@kubeasy/ui` paths | Medium — existing component imports in web must be updated |
| `apps/web/src/components/ui/` | Remove shadcn primitives now living in `packages/ui` | Medium — import paths refactor across web |
| `apps/web/src/styles/*.css` | Add `@source "../../packages/ui/src/**/*.{ts,tsx}"` | Low |
| `apps/api` `API_URL` env | Change from `https://api.kubeasy.dev` to `https://kubeasy.dev` | High — OAuth redirects and auth cookies break if wrong |
| Railway `web` service | Transfer `kubeasy.dev` custom domain to Caddy service | High — DNS/routing change, plan rollback |
| `apps/api/src/lib/cors.ts` | Verify `kubeasy.dev/admin` is an allowed origin | Low |

### Unchanged (v1.1)

| Artifact | Reason |
|----------|--------|
| `apps/api` source code | No new routes needed in Phase 9; existing `/api/admin/*` routes already exist |
| `packages/api-schemas` | Contracts unchanged |
| `packages/jobs` | No new jobs |
| DB schema | Explicitly out of scope for v1.1 |
| Railway PostgreSQL + Redis plugins | Shared by all services — no changes |
| OTel / SigNoz | Unchanged; admin app may add OTel optionally post-Phase 10 |

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Railway | Caddy added as new service; existing services use private domain env refs | Remove `kubeasy.dev` custom domain from web service, assign to Caddy service |
| Better Auth / OAuth providers | `API_URL` on `apps/api` changes to `https://kubeasy.dev` | OAuth redirect URIs in GitHub/Google/Microsoft developer consoles need updating |
| PostHog | No change — event tracking in web and api unchanged | Admin app may add PostHog later |
| SigNoz OTel | No change for v1.1 | |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `apps/admin` ↔ `apps/api` | HTTP REST fetch via `VITE_API_URL/api/admin/*` | In prod, `VITE_API_URL=""` (same origin, Caddy routes `/api/*`); in dev, `VITE_API_URL="http://localhost:3024"` (Turbo proxy) |
| `apps/web` ↔ `packages/ui` | TypeScript workspace import, no build step | Tailwind must `@source` scan `packages/ui/src` to generate utility classes |
| `apps/admin` ↔ `packages/ui` | TypeScript workspace import, no build step | Same Tailwind `@source` constraint |
| Caddy ↔ `apps/api` SSE | Long-lived HTTP streams | Requires `flush_interval -1` in Caddyfile on the `/api/*` handle |
| Turbo proxy ↔ all frontend apps | `$TURBO_MFE_PORT` env injection | Dev scripts must use `$TURBO_MFE_PORT`, not hardcoded ports |

---

## Anti-Patterns

### Anti-Pattern 1: Hardcoding Ports in Dev Scripts

**What people do:** `"dev": "vite --port 3002"` in apps/admin/package.json

**Why it's wrong:** Turborepo microfrontends proxy injects `$TURBO_MFE_PORT` and expects apps to use it. Hardcoding means the proxy cannot manage port allocation and routing breaks.

**Do this instead:** `"dev": "vite dev --port $TURBO_MFE_PORT"`

### Anti-Pattern 2: Omitting `base` in Vite Config for Sub-Path Apps

**What people do:** Ship `apps/admin` with default `base: "/"` in vite.config.ts

**Why it's wrong:** All asset paths (`/assets/index-abc123.js`) are root-relative. When Caddy serves the app at `/admin/*`, the browser requests `/assets/…` (not `/admin/assets/…`) — 404 on all JS and CSS.

**Do this instead:** Set `base: "/admin"` in `vite.config.ts` and matching `basename="/admin"` in the SPA router.

### Anti-Pattern 3: Duplicating shadcn Components Across Apps

**What people do:** Run `npx shadcn add button` independently in both `apps/web` and `apps/admin`

**Why it's wrong:** Components diverge immediately. Two copies of Button, two sets of CSS variables, two versions to maintain and keep in sync.

**Do this instead:** Run `npx shadcn add button --cwd packages/ui`. Both apps import `@kubeasy/ui/components/button`.

### Anti-Pattern 4: Keeping `api.kubeasy.dev` Custom Domain After Caddy Migration

**What people do:** Leave `apps/api` with its own `api.kubeasy.dev` Railway custom domain AND expose it via Caddy at `kubeasy.dev/api/*`

**Why it's wrong:** Better Auth OAuth redirects conflict. Cookie domains are inconsistent. Two public entry points for the same service create CORS and auth confusion.

**Do this instead:** Remove the `api.kubeasy.dev` custom domain from the `api` Railway service after Caddy is routing `/api/*`. The API becomes private-network only; Caddy is the single public entry point.

### Anti-Pattern 5: Forgetting `flush_interval -1` for SSE Through Caddy

**What people do:** Standard `reverse_proxy` config for all paths including `/api/*`

**Why it's wrong:** Caddy buffers responses by default. SSE streams stall until the buffer fills — clients never receive real-time events.

**Do this instead:** Add `flush_interval -1` to the `/api/*` handle block in the Caddyfile.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (< 1k users) | Caddy + 3 Railway services is sufficient. Caddy adds ~1ms latency vs direct routing — negligible. |
| 1k–50k users | Extract BullMQ workers from `apps/api` into a dedicated Railway service using existing `packages/jobs` abstraction. Caddy is unaffected. |
| 50k+ users | Static assets for `apps/admin` and `apps/web` SSG pages move to CDN (Cloudflare). Caddy handles dynamic routing only. |

### Scaling Priorities

1. **First bottleneck:** `apps/api` CPU/memory under concurrent BullMQ workers + HTTP load. Mitigation: extract workers to separate service (already architected in `packages/jobs`).
2. **Second bottleneck:** PostgreSQL connection pool exhaustion. Mitigation: PgBouncer or Railway's connection pooling addon.

---

## Sources

- Turborepo microfrontends guide (official): https://turborepo.dev/docs/guides/microfrontends — HIGH confidence
- Turborepo Vite framework guide (official): https://turborepo.dev/docs/guides/frameworks/vite — HIGH confidence
- shadcn/ui monorepo docs (official): https://ui.shadcn.com/docs/monorepo — HIGH confidence
- Caddy reverse proxy patterns (official): https://caddyserver.com/docs/caddyfile/patterns — HIGH confidence
- Caddy reverse_proxy directive (official): https://caddyserver.com/docs/caddyfile/directives/reverse_proxy — HIGH confidence
- Railway Caddy deployment template: https://railway.com/deploy/caddy-backend-proxy — MEDIUM confidence
- Path-based Caddy proxying example: https://dev.to/vizalo/path-based-reverse-proxying-with-caddy-3gjm — MEDIUM confidence (verified against official Caddy docs)

---

*Architecture research for: Kubeasy monorepo v1.1 micro-frontend + shared UI + admin SPA*
*Researched: 2026-03-24*
