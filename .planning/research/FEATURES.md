# Feature Research

**Domain:** Micro-frontend monorepo expansion — shared UI library, admin SPA, production proxy
**Milestone:** v1.1 — UI Parity + Micro-Frontend + Admin
**Researched:** 2026-03-24
**Confidence:** HIGH (Turborepo/shadcn/Caddy verified via official docs and current sources)

---

## Context

This document covers five new feature areas being added to an existing Turborepo monorepo that already has `apps/api` (Hono) and `apps/web` (TanStack Start). The v1.0 architecture and feature set are complete and deployed. This milestone adds:

1. Turborepo microfrontend dev proxy (unified localhost routing)
2. Shared shadcn/ui package (`packages/ui`)
3. Admin SPA (`apps/admin` — Vite + React)
4. Caddy reverse proxy on Railway (production multi-app routing)
5. UI parity audit methodology (apps/web vs ../website visual diff)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features required for the milestone to be considered complete. Missing these means the architecture is broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Unified dev proxy (`turbo dev` routes all apps) | Devs must test admin + web + api together without CORS/cookie hacks | LOW | Turborepo built-in `microfrontends.json` + `turbo dev`. Default port 3024. One config file at monorepo root. No extra packages needed. |
| `packages/ui` with shadcn components | Both `apps/web` and `apps/admin` share primitive components — duplication without a shared package causes divergence | MEDIUM | `shadcn init` monorepo mode creates `packages/ui` with `components.json`. Apps import `@kubeasy/ui/components/button`. Single Tailwind v4 CSS file in the package, apps `@import` it. |
| Admin route guard (role check) | `/admin/*` must redirect non-admins — same pattern as old Next.js admin layout | LOW | Client-side check via `authClient.useSession()`. Redirect to `/` if `session.user.role !== "admin"`. API routes already have `requireAdmin` middleware. No SSR needed for admin SPA. |
| Admin challenge visibility toggle | Core admin feature already exists in old Next.js admin — must be migrated | MEDIUM | Switch component (shadcn) + `PATCH /api/admin/challenges/:slug` endpoint. Optimistic update + rollback on error (TanStack Query pattern). Existing Hono route at `/api/admin` exists but needs challenge enable/disable endpoint. |
| Admin user management (list + role/ban) | Exists in old website — must be migrated | MEDIUM | Paginated user table with role selector and ban toggle. Existing API: `GET /api/user` (admin list), `PATCH /api/user/:id` (role/ban). Confirm with API route audit before building UI. |
| Admin stats cards (challenge + user counts) | Exists in old website — dashboard-style overview | LOW | Two stat card components reusing `@kubeasy/ui/components/card`. Fetch from existing API endpoints. |
| Production routing under `kubeasy.dev` | All three apps must be reachable under one domain in production — `kubeasy.dev` (web), `kubeasy.dev/admin` (admin), `api.kubeasy.dev` (api already separate) | MEDIUM | Caddy reverse proxy as a Railway service. Caddyfile routes `/admin/*` to admin service, `/*` to web service. Internal Railway hostnames (`*.railway.internal`). |
| UI parity: visual match to old Next.js site | v1.1 goal is visual restoration — every page in `apps/web` must match `../website` pixel-for-pixel in layout, typography, spacing | HIGH | Component-by-component audit. Identify divergence, correct in `apps/web`. Not a feature to build — a quality gate to pass. |

### Differentiators (Kubeasy-Specific Patterns)

Features that are specific choices for this project and define the quality of the implementation.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Single Tailwind v4 CSS source in `packages/ui` | All apps share identical design tokens — no Tailwind config drift between web and admin | MEDIUM | `packages/ui/src/styles/globals.css` is the one source of truth. Apps do `@import "@kubeasy/ui/styles/globals.css"` in their own CSS entry. No duplicate `@theme` blocks. Tailwind v4's CSS-first config makes this clean. |
| Turborepo native microfrontend proxy (no `@vercel/microfrontends`) | Keeps stack free of Vercel dependency, which contradicts the Railway-first strategy | LOW | Built-in Turborepo proxy via `microfrontends.json` is sufficient for 2 frontend apps + 1 API. `@vercel/microfrontends` is an override layer — avoid unless Vercel features are needed. |
| TanStack Router in admin SPA (consistent with apps/web) | Admin shares routing mental model and query patterns with main web app — lower cognitive switching for devs | MEDIUM | TanStack Router works in pure SPA/client mode (no SSR). `createHashHistory` or `createBrowserHistory`. TanStack Query for data fetching — already used in `apps/web`, same patterns apply. |
| Admin SPA fully client-rendered (no SSR) | Admin is internal tool used by authenticated users only — SSR adds zero value and complicates Vite setup | LOW | Vite SPA mode: no TanStack Start, no SSR, no prerendering. Pure Vite + React 19 + TanStack Router (file-based routing via `@tanstack/router-plugin`). Simpler build, faster iteration. |
| `packages/ui` without a build step (JIT, source consumed directly) | Same pattern as existing packages — apps import TypeScript source, no compile step needed | LOW | `package.json` exports TypeScript source directly. Apps use `tsconfig` paths. No `tsc` or `vite build` for the UI package. Consistent with `@kubeasy/api-schemas` and `@kubeasy/logger` patterns. |
| Caddy over Nginx for Railway proxy | Caddy has zero-config HTTPS, simple Caddyfile DSL, Railway templates exist, hot-reload config | LOW | Railway already has first-party Caddy templates. Caddyfile is 10 lines for 2-app routing. Nginx requires more config overhead with no benefit on Railway (Railway handles TLS). |

### Anti-Features (Approaches to Deliberately Avoid)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Module Federation (Webpack/Vite) | True runtime micro-frontends with shared code at runtime | Massive complexity overhead. Each app needs runtime federation config. Shared dependencies must be explicitly declared. Build errors are cryptic. Not needed — apps/web and apps/admin are compiled independently, they share code at package level (build time), not at runtime. | Turborepo `packages/ui` shared at build time. Clean separation with no runtime coupling. |
| Next.js for apps/admin | Familiar Next.js patterns, same as old website | admin is an internal SPA — SSR, ISR, and App Router add zero value. Adds Railway service complexity (Node SSR process). Vite SPA is simpler, faster, and sufficient. | Vite + React 19 SPA. ~10x faster HMR, simpler production build. |
| Shared routing between apps/web and apps/admin | Fewer entry points, simpler config | Different rendering models (SSR vs SPA), different auth flows, different deployment targets. Mixing them creates irreversible coupling. Admin at `/admin` path prefix is a routing concern, not a code-sharing concern. | Separate apps that share `packages/ui` components. Caddy/proxy handles `/admin` routing in both dev and prod. |
| Embedding admin in apps/web as a route group | Simpler initially — one app to deploy | Pollutes apps/web bundle with admin code. Admin users would trigger download of admin JS on every page. Breaks separation of concerns. Hard to add admin-specific dependencies without affecting web. | Separate `apps/admin` Vite SPA. Served from distinct URL path by proxy. Zero shared runtime. |
| Custom dev proxy (http-proxy, nginx in docker) | Control, custom config, no Turborepo dependency | Maintenance burden. Requires rebuilding what Turborepo provides: hot reload forwarding, WebSocket proxying, route fallback. Docker nginx in dev means another service in docker-compose. | Turborepo `microfrontends.json` — purpose-built, zero maintenance, integrates with `turbo dev`. |
| Copying shadcn components per-app instead of sharing | Simpler initially, no package setup | Components diverge immediately. Bug fixes must be applied in multiple places. Design inconsistency. Same mistake the v1.0 → v1.1 upgrade is correcting for web vs old website. | `packages/ui` with single source. `shadcn add button` installs to package, all apps consume. |
| Cookie-based admin auth separate from main auth | "Extra security" for admin | better-auth already provides role-based access. Two auth systems = two sets of tokens, two logout flows, two session stores. Over-engineering. | Same `better-auth` session + `requireAdmin` middleware already in Hono API. Client-side role check gates the SPA routes. |

---

## Feature Dependencies

```
[packages/ui (shadcn shared)]
    └──requires──> [Tailwind v4 CSS config moved to package]
    └──requires──> [pnpm workspace alias @kubeasy/ui]
    └──enables──>  [apps/web consuming shared components]
    └──enables──>  [apps/admin consuming shared components]
    └──independent-of──> [Turborepo microfrontend proxy]

[apps/admin (Vite SPA)]
    └──requires──> [packages/ui for shared primitives]
    └──requires──> [@kubeasy/api-schemas for fetch types]
    └──requires──> [apps/api admin routes (existing + new endpoints)]
    └──requires──> [better-auth client for session check]
    └──enables──>  [Admin challenge management]
    └──enables──>  [Admin user management]

[Turborepo microfrontend dev proxy]
    └──requires──> [microfrontends.json at monorepo root]
    └──requires──> [apps/admin running on a port]
    └──requires──> [apps/web running on a port]
    └──requires──> [apps/api running on a port]
    └──independent-of──> [packages/ui]
    └──independent-of──> [Caddy prod proxy]

[Caddy Railway proxy (production)]
    └──requires──> [apps/admin deployed as Railway service]
    └──requires──> [apps/web already deployed as Railway service]
    └──requires──> [Railway internal hostnames (*.railway.internal)]
    └──mirrors──>  [Turborepo microfrontend proxy routing rules]
    └──independent-of──> [packages/ui]

[UI parity audit]
    └──requires──> [../website readable for component comparison]
    └──requires──> [packages/ui exists (some fixes land there)]
    └──enables──>  [Visual correctness before admin phase]
    └──blocks──>   [apps/admin styling (admin adopts corrected design)]

[Admin challenge visibility toggle]
    └──requires──> [apps/admin routing + layout]
    └──requires──> [packages/ui card, switch, table components]
    └──requires──> [Hono admin route: PATCH /api/admin/challenges/:slug/availability]

[Admin user management]
    └──requires──> [apps/admin routing + layout]
    └──requires──> [packages/ui table, badge, select components]
    └──requires──> [Hono user route: GET /api/user (admin list), PATCH /api/user/:id]
```

### Dependency Notes

- **packages/ui is the foundation:** Both apps/admin and the parity-corrected apps/web depend on it. Build packages/ui first, then audit/fix apps/web, then scaffold apps/admin.
- **microfrontends.json requires all apps to have stable ports:** Set fixed ports in each app's dev config before writing the proxy config. apps/web=3000, apps/api=3001, apps/admin=3002 is the natural assignment.
- **Caddy prod config mirrors dev proxy routing:** Define routing rules once (in microfrontends.json), replicate in Caddyfile. Any routing change must update both files.
- **Admin SPA requires API admin endpoints to exist:** The old website used tRPC procedures (`trpc.challenge.adminList`, `trpc.user.adminList`). These must be verified/added as Hono REST routes before building the admin UI. Some may already exist at `/api/admin/challenges-sync` but the full CRUD is not confirmed.
- **UI parity audit must precede admin styling decisions:** Admin SPA adopts the corrected design system. Auditing after admin is built means double work.

---

## MVP Definition

### Launch With (v1.1 milestone complete)

This is an expansion milestone, not a greenfield product. MVP = all five feature areas functional and integrated.

- [ ] `packages/ui` with all shadcn primitives currently used in `apps/web` (17 components migrated from `apps/web/src/components/ui/`)
- [ ] `apps/web` imports from `@kubeasy/ui` — no local `/components/ui/` shadcn copies remain
- [ ] UI parity audit complete — all divergent components in `apps/web` corrected against `../website`
- [ ] `microfrontends.json` at monorepo root — `turbo dev` serves all apps via unified proxy
- [ ] `apps/admin` scaffolded: Vite SPA, TanStack Router, TanStack Query, admin layout with nav
- [ ] Admin challenge page: list + enable/disable toggle
- [ ] Admin users page: paginated list + role/ban actions
- [ ] Admin stats overview cards
- [ ] Caddy service on Railway routing `/admin/*` → admin service, `/*` → web service
- [ ] Admin app deployed as Railway service

### Add After Validation (v1.x)

- [ ] Admin submissions view (view all submissions per user/challenge) — not in old website, but obvious next step
- [ ] Admin challenge detail editor (edit title/description from UI) — currently requires DB edit
- [ ] ISR for blog routes — full rebuild acceptable now, revisit when content velocity increases

### Future Consideration (v2+)

- [ ] Admin analytics dashboard (PostHog integration, user growth charts)
- [ ] Challenge import UI (sync from GitHub challenges repo via UI instead of CLI/admin API)
- [ ] Role-based admin sub-sections (content editor vs superadmin)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `packages/ui` extraction | HIGH (unblocks admin + parity) | MEDIUM | P1 |
| UI parity audit + fixes | HIGH (v1.1 goal #1) | HIGH | P1 |
| `microfrontends.json` dev proxy | HIGH (dev experience) | LOW | P1 |
| Admin challenge management | HIGH (operational need) | MEDIUM | P1 |
| Admin user management | HIGH (operational need) | MEDIUM | P1 |
| Caddy Railway proxy | HIGH (production routing) | LOW | P1 |
| apps/admin scaffold + layout | HIGH (required for admin features) | LOW | P1 |
| Admin stats cards | MEDIUM (nice overview) | LOW | P2 |
| Admin submissions view | MEDIUM (operational insight) | MEDIUM | P2 |
| Admin challenge detail editor | LOW (CLI workaround exists) | MEDIUM | P3 |

**Priority key:**
- P1: Required for v1.1 milestone to be complete
- P2: High-value follow-up, add in v1.1.x patch
- P3: Future consideration, does not block milestone

---

## Feature Inventory: What Already Exists

This table maps what exists in `../website` (old Next.js) to what must be built in `apps/admin`.

| Old Website Feature | Location | Status in apps/admin |
|--------------------|----------|----------------------|
| Admin layout (header, nav, auth guard) | `website/app/(admin)/layout.tsx` | Must build |
| Challenge list with enable/disable | `website/app/(admin)/admin/challenges/` | Must build |
| Challenge stats cards | `website/app/(admin)/admin/challenges/_components/admin-stats-cards.tsx` | Must build |
| User list with role/ban | `website/app/(admin)/admin/users/` | Must build |
| User stats cards | `website/app/(admin)/admin/users/_components/user-stats-cards.tsx` | Must build |
| Admin API: challenge adminList | tRPC `challenge.adminList` | Verify Hono equivalent exists |
| Admin API: challenge setAvailability | tRPC `challenge.setAvailability` | Must add to Hono `/api/admin` |
| Admin API: user adminList + adminStats | tRPC `user.adminList`, `user.adminStats` | Must add to Hono `/api/user` |

**Note on API parity:** The Hono API has `/api/admin/challenges-sync` (POST) but may not have the admin list/toggle endpoints. These must be audited and added before building the admin SPA. This is a non-trivial dependency.

---

## Complexity Heatmap by Area

| Area | Complexity | Why |
|------|-----------|-----|
| `packages/ui` setup | MEDIUM | Tailwind CSS v4 sharing across apps is a known tricky setup — CSS `@import` order matters, apps must not define their own `@theme` blocks |
| UI parity audit | HIGH | Subjective, labor-intensive, no automation. Requires side-by-side comparison of every page/component. Risk of missing subtle differences. |
| `microfrontends.json` dev proxy | LOW | Built-in Turborepo feature, well-documented, requires only port coordination |
| `apps/admin` scaffold | LOW | Vite SPA is the simplest possible setup. TanStack Router client-only mode is well-documented. |
| Admin feature migration | MEDIUM | Requires verifying Hono API routes exist for all admin actions. Some endpoints likely need to be added. |
| Caddy Railway proxy | LOW | Railway has first-party Caddy templates. Caddyfile for 2-app routing is ~10 lines. |

---

## Sources

- [Turborepo Microfrontends Guide](https://turborepo.dev/docs/guides/microfrontends) — `microfrontends.json` format, routing config, proxy port, WebSocket support (HIGH confidence)
- [shadcn/ui Monorepo Documentation](https://ui.shadcn.com/docs/monorepo) — `components.json` workspace alias, `packages/ui` structure, CLI `add` workflow (HIGH confidence)
- [Turborepo shadcn/ui integration guide](https://turborepo.dev/docs/guides/tools/shadcn-ui) — Turborepo-specific shadcn init and add commands (HIGH confidence)
- [Railway Caddy reverse proxy templates](https://railway.com/deploy/caddy-proxy) — Caddyfile multi-service routing, Railway internal hostnames (HIGH confidence)
- [Caddy reverse_proxy directive](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) — Upstream syntax, path matchers (HIGH confidence)
- [react-admin Vite installation](https://marmelab.com/react-admin/Vite.html) — Vite SPA admin panel patterns (MEDIUM confidence)
- [turborepo-shadcn-ui-tailwind-4 GitHub template](https://github.com/linkb15/turborepo-shadcn-ui-tailwind-4) — Tailwind v4 + shadcn in monorepo working reference (MEDIUM confidence)

---

*Feature research for: Kubeasy monorepo v1.1 — micro-frontend, shared UI, admin SPA*
*Researched: 2026-03-24*
