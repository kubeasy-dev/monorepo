# Stack Research

**Domain:** TypeScript monorepo — Hono API + TanStack Start frontend + BullMQ + OpenTelemetry
**Researched:** 2026-03-24 (v1.1 addendum)
**Confidence:** HIGH (versions match already-installed packages in apps/web; Turborepo micro-frontend is built-in, no extra package)

> This file documents the **v1.1 additions only**. The v1.0 baseline stack (Hono, TanStack Start, Drizzle, BullMQ, Better Auth, OTel) is already validated in production and documented in the original research (2026-03-18). Do not re-research those.

---

## Context: What v1.1 Adds

| Feature | What Changes | Scope |
|---------|-------------|-------|
| Unified dev proxy | `microfrontends.json` in apps/web | Turborepo built-in, zero new packages |
| `packages/ui` | New shared shadcn/ui package | New workspace package |
| `apps/admin` | New Vite + React SPA | New app, client-side only |
| Caddy on Railway | New `apps/caddy` service | Replaces direct-domain routing |

---

## New: Turborepo Micro-Frontends Proxy

**Confidence:** HIGH — verified against Turborepo 2.6 release notes and official docs.

### How It Works

Turborepo 2.6+ ships a built-in dev proxy. No package to install. Add a `microfrontends.json` file inside one app (the "host"), and `turbo dev` will start all apps plus a routing proxy.

**Key facts:**
- Built into `turbo` binary — zero additional dependencies
- Proxy starts on port 3024 by default (configurable via `options.localProxyPort`)
- Injects `TURBO_MFE_PORT` env var into all running tasks
- Supports WebSocket connections (HMR passthrough works)
- One app is the "default" catch-all (no `routing` key). All others declare path groups.
- If `@vercel/microfrontends` is installed anywhere in the workspace, Turborepo defers to it instead. Do NOT install it — the built-in is sufficient and avoids Vercel coupling.

### Configuration File

Place `microfrontends.json` in `apps/web/` (the host app — handles `/` and all unmatched routes):

```json
{
  "applications": {
    "web": {
      "development": { "local": { "port": 3000 } }
    },
    "admin": {
      "development": { "local": { "port": 5173 } },
      "routing": [{ "paths": ["/admin", "/admin/:path*"] }]
    },
    "api": {
      "development": { "local": { "port": 3001 } },
      "routing": [{ "paths": ["/api", "/api/:path*"] }]
    }
  },
  "options": {
    "localProxyPort": 3024
  }
}
```

**Result in dev:** `http://localhost:3024` routes `/admin/*` → port 5173, `/api/*` → port 3001, everything else → port 3000.

**What NOT to do:**
- Do not install `@vercel/microfrontends` — overrides the built-in and introduces Vercel dependency
- Do not use a separate `http-proxy` or `nginx` in dev — the built-in handles it

---

## New: packages/ui — Shared shadcn/ui Package

**Confidence:** HIGH — Official shadcn/ui monorepo docs verified; Tailwind v4 support confirmed in shadcn changelog.

### Why a Shared Package

Both `apps/web` and `apps/admin` need shadcn components. Without `packages/ui`:
- Components diverge between apps
- shadcn CLI installs duplicate copies with duplicate Radix deps
- Theming (CSS variables) must be maintained twice

With `packages/ui`:
- Single source of truth for all primitives
- `shadcn add` in `packages/ui` propagates to both apps automatically
- Tailwind v4 CSS source scanning handles class discovery across the monorepo

### Package Structure

```
packages/ui/
  package.json          # @kubeasy/ui
  tsconfig.json         # extends @kubeasy/typescript-config/react.json
  components.json       # shadcn CLI config pointing at packages/ui paths
  src/
    components/         # shadcn primitives (button, card, dialog, etc.)
    lib/
      utils.ts          # cn() helper (clsx + tailwind-merge)
    styles/
      globals.css       # CSS variables (@theme block, OKLCH tokens)
```

### package.json (packages/ui)

```json
{
  "name": "@kubeasy/ui",
  "private": true,
  "type": "module",
  "exports": {
    "./components/*": "./src/components/*.tsx",
    "./lib/*": "./src/lib/*.ts",
    "./styles/*": "./src/styles/*.css",
    ".": "./src/index.ts"
  },
  "dependencies": {
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "lucide-react": "0.577.0",
    "tailwind-merge": "3.5.0"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@kubeasy/typescript-config": "workspace:*",
    "@types/react": "19.2.14",
    "@types/react-dom": "19.2.3",
    "tailwindcss": "4.2.2",
    "typescript": "5.9.3"
  }
}
```

**No build step.** Apps import TypeScript source directly (same JIT pattern as `packages/api-schemas`). No tsc emit needed in the package itself.

### components.json (packages/ui)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@kubeasy/ui/components",
    "utils": "@kubeasy/ui/lib/utils",
    "ui": "@kubeasy/ui/components",
    "lib": "@kubeasy/ui/lib",
    "hooks": "@kubeasy/ui/hooks"
  }
}
```

### tsconfig.json (packages/ui)

```json
{
  "extends": "@kubeasy/typescript-config/react.json",
  "compilerOptions": {
    "paths": {
      "@kubeasy/ui/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

### How Apps Consume packages/ui

**In apps/web and apps/admin:**

1. Add to `package.json`: `"@kubeasy/ui": "workspace:*"`
2. In each app's `vite.config.ts`, add path alias:
   ```ts
   resolve: {
     alias: { "@kubeasy/ui": path.resolve(__dirname, "../../packages/ui/src") }
   }
   ```
3. Import CSS in app root: `import "@kubeasy/ui/styles/globals.css"`
4. Import components: `import { Button } from "@kubeasy/ui/components/button"`

**Tailwind v4 scanning:** The packages/ui CSS file should use `@source` directives to scan across the monorepo:
```css
@import "tailwindcss";
@source "../../apps/web/src";
@source "../../apps/admin/src";
@source "../ui/src";
```

**Migration from apps/web's existing ui/:** Move `src/components/ui/*.tsx` → `packages/ui/src/components/`. Remove the `@radix-ui/*` deps from `apps/web/package.json` (they move to `packages/ui/package.json`). Keep `apps/web`'s `components.json` only if you want app-specific components; otherwise remove it and update path aliases.

### Radix UI Dependencies

Move all `@radix-ui/*` packages from `apps/web` to `packages/ui`. Current list (from apps/web/package.json):

| Package | Version |
|---------|---------|
| @radix-ui/react-avatar | 1.1.11 |
| @radix-ui/react-dialog | 1.1.15 |
| @radix-ui/react-dropdown-menu | 2.1.16 |
| @radix-ui/react-label | 2.1.8 |
| @radix-ui/react-navigation-menu | 1.2.14 |
| @radix-ui/react-select | 2.2.6 |
| @radix-ui/react-separator | 1.1.8 |
| @radix-ui/react-slot | 1.2.4 |
| @radix-ui/react-switch | 1.2.6 |

Add additional Radix packages to `packages/ui` as new components are needed.

---

## New: apps/admin — Vite + React SPA

**Confidence:** HIGH — Vite 8.x and @vitejs/plugin-react 6.x are already installed in apps/web; identical versions for apps/admin.

### Why Client-Side Only (No SSR)

Admin is internal tooling, not public-facing. No SEO requirements. No SSR needed. Pure Vite SPA keeps the build simple and Railway deployment trivial (static files or a simple static server).

### Core Stack

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| vite | 8.0.2 | Build tool + dev server | Same version as apps/web; zero new dependency risk; Rolldown-based, fast |
| @vitejs/plugin-react | 6.0.1 | React HMR + JSX transform | Same version as apps/web; Oxc-based (no Babel), smaller install |
| react | 19.2.4 | UI framework | Same version as apps/web; workspace consistency |
| react-dom | 19.2.4 | DOM rendering | Same as above |
| @tanstack/react-router | 1.168.3 | Client-side routing | Type-safe, file-based; reuses the router already used in apps/web; avoids adding React Router |
| @tanstack/react-query | 5.95.2 | Data fetching / server state | Already used in apps/web; consistent patterns across apps |
| @kubeasy/ui | workspace:* | Shared components | The whole point of packages/ui |
| better-auth | 1.5.6 | Auth client | Same instance as apps/web; admin must authenticate against the same API |
| tailwindcss | 4.2.2 | Styling | Same version as apps/web |

### Supporting Libraries

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| @kubeasy/api-schemas | workspace:* | Shared types | Reuse existing contracts |
| lucide-react | 0.577.0 | Icons | In packages/ui; no separate install needed |
| sonner | 2.0.7 | Toast notifications | Same version as apps/web; consistent UX |
| zod | 4.3.6 | Form validation | Same version as workspace |

### Package Structure

```
apps/admin/
  package.json        # @kubeasy/admin
  tsconfig.json       # extends @kubeasy/typescript-config/react.json
  vite.config.ts
  index.html
  src/
    main.tsx          # Entry point (no server.tsx — client-only)
    routes/           # TanStack Router file-based routes
    components/       # Admin-specific components
    lib/              # auth-client, query-client
    styles/
      globals.css     # imports @kubeasy/ui/styles/globals.css
```

### vite.config.ts (apps/admin)

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [tanstackRouter(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@kubeasy/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
  server: {
    port: 5173,
  },
});
```

**Note:** `@tailwindcss/vite` is required (same as apps/web). Add it as a devDependency.

### Turbo Integration

Add to turbo.json `outputs`:
```json
"outputs": [".next/**", "!.next/cache/**", "dist/**", ".output/**"]
```

`apps/admin` builds to `dist/` (standard Vite SPA output). No `.output/` because no Nitro.

### Railway Deployment

Three options for serving the static SPA on Railway:

**Option A (recommended): Caddy serves the admin static files directly.**
The `apps/caddy` service serves `dist/` from apps/admin at the `/admin` path prefix. Admin SPA files are baked into the Caddy Docker image at build time.

**Option B: Separate static service.**
Add a dedicated Railway service for apps/admin using `caddy:2-alpine` or `nginx:alpine` as the base. Simplest isolation but more Railway services.

**Option C: TanStack Start serves admin.**
Not recommended — couples the admin app to apps/web's SSR infrastructure.

Use Option A for simplicity in this milestone.

---

## New: apps/caddy — Railway Reverse Proxy

**Confidence:** MEDIUM-HIGH — Railway Caddy templates confirmed active (March 2026); private networking DNS pattern verified; Caddyfile multi-handle syntax is standard Caddy 2 docs.

### Why Caddy

In production, `kubeasy.dev` currently routes:
- `kubeasy.dev` → apps/web (TanStack Start SSR)
- `api.kubeasy.dev` → apps/api (Hono)

v1.1 adds `/admin` path under `kubeasy.dev`. This requires a routing layer in front of web + admin. Options:

| Option | Verdict |
|--------|---------|
| Caddy as Railway service | **Use this** — lightweight, Railway-native, Caddyfile is simple |
| Nginx | Works but heavier; Caddy has automatic HTTPS and simpler config |
| Railway custom domains per service | Can't share a domain across services without a proxy |
| Vercel Edge / Cloudflare Workers | Contradicts self-hosted Railway goal |

### Caddy Version

Use `caddy:2-alpine` Docker image (currently Caddy 2.11.2 as of March 2026). Pin to `caddy:2` for auto-patch updates within v2.

### Service Structure

```
apps/caddy/
  Dockerfile
  Caddyfile
```

### Caddyfile

```caddyfile
{
  admin off
}

kubeasy.dev {
  handle /api/* {
    reverse_proxy {$API_HOST}:{$API_PORT}
  }

  handle /admin* {
    reverse_proxy {$ADMIN_HOST}:{$ADMIN_PORT}
  }

  handle {
    reverse_proxy {$WEB_HOST}:{$WEB_PORT}
  }
}
```

### Railway Environment Variables

Railway private networking uses DNS names in the format `<service-name>.railway.internal`. Set these as Railway reference variables in the `caddy` service:

```
API_HOST=${{api.RAILWAY_PRIVATE_DOMAIN}}
API_PORT=3001
WEB_HOST=${{web.RAILWAY_PRIVATE_DOMAIN}}
WEB_PORT=3000
ADMIN_HOST=${{admin.RAILWAY_PRIVATE_DOMAIN}}
ADMIN_PORT=5173
```

**If admin is baked into Caddy (Option A above):** Replace the `/admin*` upstream with a `file_server` block pointing to the compiled SPA files. The environment variable for admin host/port is not needed.

### Dockerfile (apps/caddy — Option A, static files baked in)

```dockerfile
FROM node:24-alpine AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=@kubeasy/admin

FROM caddy:2-alpine
COPY --from=builder /app/apps/admin/dist /srv/admin
COPY apps/caddy/Caddyfile /etc/caddy/Caddyfile
```

```caddyfile
{
  admin off
}

kubeasy.dev {
  handle /api/* {
    reverse_proxy {$API_HOST}:{$API_PORT}
  }

  handle /admin* {
    uri strip_prefix /admin
    root * /srv/admin
    try_files {path} /index.html
    file_server
  }

  handle {
    reverse_proxy {$WEB_HOST}:{$WEB_PORT}
  }
}
```

**SPA routing:** `try_files {path} /index.html` is required so that direct navigation to `/admin/users` doesn't 404 — it serves `index.html` and lets TanStack Router handle the route client-side.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@vercel/microfrontends` | Overrides Turborepo's built-in proxy; introduces Vercel dependency for a self-hosted app | `microfrontends.json` with Turborepo built-in |
| Module Federation (Webpack) | Overkill for 2 apps; no code sharing at runtime needed; adds Webpack to a Vite monorepo | Shared `packages/ui` imported at build time |
| `single-spa` | Framework for runtime micro-frontends; this project needs path-based routing, not component-level federation | Path routing via Caddy (prod) + Turborepo proxy (dev) |
| React Router v6/v7 in apps/admin | Introduces a second routing library when @tanstack/react-router is already in the workspace | `@tanstack/react-router` |
| Separate Tailwind config in apps/admin | Tailwind v4 does not use `tailwind.config.js` — config lives in CSS; separate configs cause token drift | Single `globals.css` in `packages/ui` imported by each app |
| Build step in packages/ui | Adds tsc emit complexity; JIT import pattern (same as api-schemas) is simpler | `"type": "module"` + direct TS source exports |
| nginx for apps/admin | Heavier than Caddy; separate Railway service wastes resources | Bake static files into the Caddy service |

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| vite | 8.0.2 | @vitejs/plugin-react 6.0.1 | Already confirmed in apps/web |
| @vitejs/plugin-react | 6.0.1 | react 19.x, vite 8.x | Oxc transform, no Babel dependency |
| @tanstack/react-router | 1.168.3 | react 19.x, vite 8.x | Already used in apps/web |
| tailwindcss | 4.2.2 | @tailwindcss/vite 4.2.2 | CSS-first config; no tailwind.config.js |
| caddy | 2.11.2 (image tag: 2-alpine) | Railway Docker runtime | Pin to `caddy:2` for patch auto-updates |
| turbo | 2.8.17 | microfrontends.json built-in | microfrontends feature added in Turborepo 2.6 |

---

## Installation

```bash
# packages/ui — new package
# (create package.json manually, then:)
cd packages/ui
pnpm add class-variance-authority clsx lucide-react tailwind-merge
pnpm add -D tailwindcss @types/react @types/react-dom typescript

# Move @radix-ui/* from apps/web to packages/ui
# (remove from apps/web/package.json, add to packages/ui/package.json)
pnpm add @radix-ui/react-avatar @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu @radix-ui/react-label \
  @radix-ui/react-navigation-menu @radix-ui/react-select \
  @radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-switch

# apps/admin — new app
cd apps/admin
pnpm add react react-dom @tanstack/react-router @tanstack/react-query \
  better-auth sonner zod \
  @kubeasy/ui@workspace:* @kubeasy/api-schemas@workspace:*
pnpm add -D vite @vitejs/plugin-react @tailwindcss/vite tailwindcss \
  @tanstack/router-plugin typescript @types/react @types/react-dom \
  @kubeasy/typescript-config@workspace:*

# apps/web — add workspace dep on packages/ui, remove migrated @radix-ui/* deps
cd apps/web
pnpm add @kubeasy/ui@workspace:*
# (remove individual @radix-ui/* from package.json after migration)

# No new packages needed at repo root for microfrontends proxy
# Turborepo 2.8.17 already has it built-in
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Turborepo built-in microfrontends proxy | http-proxy-middleware in a custom script | When not using Turborepo, or when needing conditional middleware logic beyond path routing |
| packages/ui JIT (no build step) | Build step with tsc + declarations | When packages/ui is published to npm or consumed outside the monorepo |
| Caddy on Railway | Nginx on Railway | Either works; Caddy is smaller, has automatic HTTPS, simpler config syntax |
| @tanstack/react-router in apps/admin | React Router v7 | If the team is more familiar with React Router and the project doesn't use TanStack Router elsewhere |
| Static files baked into Caddy image | Separate Railway service for admin | When admin has its own deployment cadence independent of the proxy service |

---

## Sources

- [Turborepo Microfrontends docs](https://turborepo.dev/docs/guides/microfrontends) — built-in proxy, microfrontends.json structure, `@vercel/microfrontends` override behavior — HIGH confidence
- [Turborepo 2.6 blog](https://turborepo.dev/blog/turbo-2-6) — when microfrontends feature was introduced — HIGH confidence
- [shadcn/ui Monorepo docs](https://ui.shadcn.com/docs/monorepo) — components.json structure, CLI path behavior — HIGH confidence
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — @theme inline, @source directives — HIGH confidence
- [Turborepo shadcn/ui guide](https://turborepo.dev/docs/guides/tools/shadcn-ui) — official integration guide — HIGH confidence
- [Vite 8.0 announcement](https://vite.dev/blog/announcing-vite8) — current stable Vite version — HIGH confidence
- [@vitejs/plugin-react npm](https://www.npmjs.com/package/@vitejs/plugin-react) — v6.0.1 current, Oxc-based — HIGH confidence
- [Railway Caddy reverse proxy templates](https://railway.com/deploy/caddy-backend-proxy) — confirmed active March 2026 — MEDIUM confidence (Railway template docs, not primary Railway docs)
- [Caddy reverse_proxy directive docs](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) — handle routing, try_files for SPA — HIGH confidence
- [Railway private networking docs](https://docs.railway.com/networking/private-networking/how-it-works) — `<service>.railway.internal` DNS pattern — HIGH confidence
- [Caddy Docker Hub](https://hub.docker.com/_/caddy) — caddy:2-alpine current (2.11.2) — HIGH confidence
- apps/web/package.json (this repo) — confirmed current versions for vite, @vitejs/plugin-react, react, tailwindcss, shadcn, @radix-ui/* — HIGH confidence

---

*Stack research for: Kubeasy v1.1 — micro-frontend proxy, packages/ui, apps/admin, Caddy Railway*
*Researched: 2026-03-24*
