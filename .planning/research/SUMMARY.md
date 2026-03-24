# Project Research Summary

**Project:** Kubeasy monorepo — v1.1 UI Parity + Micro-Frontend + Admin
**Domain:** Turborepo micro-frontend expansion — shared UI library, admin SPA, production reverse proxy
**Researched:** 2026-03-24
**Confidence:** HIGH

## Executive Summary

Kubeasy v1.1 is a well-scoped monorepo expansion milestone, not a greenfield project. The v1.0 baseline (Hono API, TanStack Start frontend, Drizzle, BullMQ, Better Auth) is already deployed and stable. This milestone adds three net-new artifacts — `packages/ui` (shared shadcn/ui library), `apps/admin` (Vite SPA), and `apps/caddy` (Railway reverse proxy) — plus configuration changes to enable a Turborepo micro-frontend dev proxy. The recommended approach is to build in strict dependency order: shared UI package first, then UI parity audit, then admin scaffold, then admin features, then production proxy. Deviation from this order causes rework because both admin and the corrected web app depend on the shared package being stable.

The most consequential architectural decision is consolidating all traffic under a single `kubeasy.dev` domain via a Caddy reverse proxy on Railway, replacing the current split between `kubeasy.dev` (web) and `api.kubeasy.dev` (API). This simplifies auth cookie handling significantly — Better Auth can use a same-origin cookie rather than a cross-subdomain one — but requires updating `API_URL` on `apps/api`, re-registering OAuth redirect URIs with GitHub/Google/Microsoft, and transferring the custom domain from the web service to the Caddy service. These are high-risk production steps that must be executed with a rollback plan.

The main implementation risks are infrastructure-level rather than feature-level: Caddy's `auto_https` behavior on Railway, Railway's internal DNS startup race, the Vite SPA `base` path requirement for sub-path serving, and the Tailwind v4 `@source` scanning requirement for the shared package. All have clear, well-documented solutions, but each will silently appear to work locally while failing in production if skipped. The research provides explicit prevention checklists for all nine identified pitfalls.

---

## Key Findings

### Recommended Stack

The v1.1 stack introduces no new technology categories — every addition reuses versions already present in `apps/web`. The micro-frontend proxy is built into Turborepo 2.6+ via `microfrontends.json` and requires zero new packages (provided `@vercel/microfrontends` is never installed — it overrides the built-in). The admin SPA uses the same Vite 8/React 19/TanStack Router combination already in use on the web app. `packages/ui` follows the same no-build-step JIT import pattern already used by `packages/api-schemas` and `packages/logger`.

**Core new technologies:**
- **Turborepo built-in micro-frontend proxy** (`microfrontends.json`): unified localhost routing at `:3024` — zero additional packages; dev-only
- **`packages/ui` (shadcn/ui, Tailwind v4)**: shared component library; no tsc emit; JIT TypeScript source exports via workspace alias; `react`/`react-dom` as `peerDependencies` only
- **`apps/admin`** (Vite 8 + React 19 + TanStack Router 1.168.x): client-side SPA; same versions as `apps/web`; `base: "/admin/"` required in `vite.config.ts`
- **Caddy 2.11 (`caddy:2-alpine`)**: Railway reverse proxy; `auto_https off`; `flush_interval -1` for SSE paths; admin static files baked into image

See `/Users/paul/Workspace/kubeasy/app/.planning/research/STACK.md` for full version matrix, exact `package.json` snippets, Dockerfile, and Caddyfile.

### Expected Features

The milestone is an operational expansion. Features split between infrastructure and migrated admin capabilities from the deprecated `../website` Next.js app.

**Must have (table stakes — v1.1 incomplete without these):**
- Turborepo `microfrontends.json` dev proxy — all apps testable via single `localhost:3024` origin
- `packages/ui` with all 17 shadcn components migrated from `apps/web/src/components/ui/`
- `apps/web` imports from `@kubeasy/ui` only — no local shadcn copies remain
- UI parity audit complete — every page in `apps/web` visually matches `../website`
- Admin layout with route guard (role check via `authClient.useSession()`)
- Admin challenge list with enable/disable toggle
- Admin user list with role/ban actions
- Admin stats overview cards
- Caddy Railway service routing `/admin/*` and `/*` correctly
- `apps/admin` deployed as Railway service

**Should have (v1.1.x patch):**
- Admin submissions view (per user/challenge)
- Admin challenge detail editor

**Defer (v2+):**
- Admin analytics dashboard (PostHog integration)
- Challenge import UI (sync from GitHub challenges repo via UI)
- Role-based admin sub-sections (content editor vs superadmin)

See `/Users/paul/Workspace/kubeasy/app/.planning/research/FEATURES.md` for full dependency graph, feature inventory mapped against `../website`, and complexity heatmap.

### Architecture Approach

The v1.1 architecture keeps all three application services (`apps/web`, `apps/api`, `apps/admin`) as independent Railway deployments communicating over Railway private networking. A fourth Caddy service becomes the single public entry point for `kubeasy.dev`, routing by path prefix. In local development, Turborepo's built-in proxy mirrors this routing at `localhost:3024`. The shared `packages/ui` package is consumed at build time by both `apps/web` and `apps/admin` — there is no runtime code sharing or module federation.

**Major components:**
1. **`packages/ui`** — shadcn/ui primitives; exports TypeScript source + CSS tokens; all `@radix-ui/*` deps consolidated here; `react`/`react-dom` as peer deps
2. **`apps/admin`** — client-only Vite SPA; TanStack Router with `basename="/admin"`; `base: "/admin/"` in Vite config; authenticates via same Better Auth session as web app
3. **`apps/caddy`** — Docker image baking admin static files + Caddyfile; routes `/api/*` (with `flush_interval -1`), `/admin/*`, `/*` to internal Railway services
4. **`microfrontends.json`** (repo root) — dev proxy config mirroring Caddy routing; web=3000, api=3001, admin=3002, proxy=3024; apps use `$TURBO_MFE_PORT` in dev scripts
5. **Modified `apps/web`** — imports from `@kubeasy/ui`; local `src/components/ui/` removed; dev script uses `$TURBO_MFE_PORT`; `API_URL` env updated to `https://kubeasy.dev`

See `/Users/paul/Workspace/kubeasy/app/.planning/research/ARCHITECTURE.md` for full directory tree, data flow diagrams, auth cookie flow comparison (v1.0 vs v1.1), and explicit new/modified/unchanged artifact inventory.

### Critical Pitfalls

1. **Turborepo proxy is dev-only — production path is entirely separate** — Write the Caddyfile first; Turborepo proxy config is a mirror of it. Test Caddy on Railway before building admin routes, not after. Production blank pages from missing Caddy config are a common trap.

2. **Vite SPA `base` path omitted** — Set `base: "/admin/"` in `apps/admin/vite.config.ts` at scaffold time. Test with `vite build && vite preview --base /admin/` before any feature work. Default `base: "/"` produces asset 404s in production that are invisible in dev.

3. **Tailwind `@source` not configured for shared package** — Add `@source "../../../packages/ui/src"` to each consuming app's CSS entrypoint. Verify by inspecting generated CSS for a class that only exists in the shared package. Tailwind v4's auto-detection does not traverse workspace packages.

4. **Duplicate React instance from wrong peer dep config** — Declare `react` and `react-dom` as `peerDependencies` in `packages/ui/package.json`. Verify with `pnpm ls react` — must show exactly one instance per app. Wrong config causes "Invalid hook call" at runtime from all Radix UI components.

5. **CSS theme variables missing in admin** — Move `:root` CSS variable declarations into `packages/ui/src/styles/tokens.css` and export them. Every consuming app must import this file. Verify with DevTools — `--primary` and `--background` must be defined in the admin app.

6. **Caddy `auto_https` on Railway causes startup loop** — Railway terminates TLS at its edge. Add `auto_https off` to the global Caddyfile block. Use `http://` scheme (or bare `:{$PORT}`) in site blocks. Caddy's automatic HTTPS conflicts with Railway's infrastructure-level TLS.

7. **Railway internal DNS startup race** — Caddy resolves upstream service hostnames at startup; if upstream services haven't registered yet, Caddy fails to start. Configure `fail_duration 60s` + `max_fails 10` on health checks. Set Railway deploy order so Caddy starts last.

8. **Better Auth cookies fail in admin SPA** — Initialize admin auth client with `credentials: "include"`. Verify `kubeasy.dev` is in `apps/api` CORS `allowedOrigins`. Test full OAuth flow end-to-end in admin app before building any admin features.

9. **Cross-app SPA navigation silently broken** — Use `<a href="/admin">` (full page navigation) for any link from `apps/web` to `apps/admin`. Never use TanStack Router's `<Link>` across app boundaries — it intercepts as a client-side transition and the admin bundle never loads.

---

## Implications for Roadmap

The hard dependency chain is: `packages/ui` → UI parity audit → `apps/admin` scaffold → admin features → Caddy production deployment. The Turborepo dev proxy is a low-effort config change that should be set up alongside the admin scaffold (both require knowing stable port assignments).

### Phase 1: Shared UI Package

**Rationale:** Everything else depends on this. Both the UI parity audit and the admin app require the shared component library to exist and be stable first. Building admin before extracting the shared package forces a second import refactor pass.

**Delivers:** `packages/ui` with all shadcn primitives migrated from `apps/web/src/components/ui/`; `apps/web` import paths refactored to `@kubeasy/ui`; all `@radix-ui/*` deps consolidated; Tailwind v4 `@source` wired in both apps; CSS tokens exported from package.

**Addresses:** FEATURES.md `packages/ui` P1 item; elimination of component duplication that "the whole point of v1.1 is correcting."

**Avoids:** Pitfall 3 (Tailwind `@source` — verify during package wiring), Pitfall 4 (CSS variables — move to package before admin exists), Pitfall 5 (duplicate React — enforce peer deps at creation, verify with `pnpm ls react`).

**Research flag:** Standard patterns — well-documented in shadcn/ui monorepo docs and Turborepo integration guide. No additional research needed. The Tailwind v4 `@source` with workspace symlinks needs empirical verification during this phase (community reports of edge cases).

---

### Phase 2: UI Parity Audit

**Rationale:** The audit requires `packages/ui` to exist (some corrections land in the shared package). Admin adopts the corrected design system — auditing after admin is built means double styling work. This is the highest-complexity item in the milestone (subjective, labor-intensive, no automation).

**Delivers:** Visual match between `apps/web` and `../website` on every public page; design system in a known-good state before admin styling decisions are made.

**Addresses:** FEATURES.md "UI parity" P1 item and quality gate that blocks admin styling decisions.

**Avoids:** Design token drift between the two apps once admin is built on top of a corrected baseline.

**Research flag:** No research needed — this is a manual inspection and correction task, not a development task. Methodology: side-by-side comparison, page by page, component by component, using `../website` as the reference.

---

### Phase 3: Micro-Frontend Dev Proxy + Admin Scaffold

**Rationale:** The Turborepo proxy (`microfrontends.json`) and the `apps/admin` skeleton should be built together — both require stable port assignments, and writing the Caddyfile mirror at this point forces production routing to be designed upfront rather than bolted on later.

**Delivers:** `microfrontends.json` at repo root; unified `localhost:3024` dev routing; `apps/admin` Vite SPA scaffold with TanStack Router, auth client, admin layout, route guard, and `base: "/admin/"` configured; draft `apps/caddy/Caddyfile` mirroring proxy routing.

**Addresses:** FEATURES.md `microfrontends.json` P1 item and `apps/admin` scaffold P1 item.

**Avoids:** Pitfall 1 (write Caddyfile alongside dev proxy — they must mirror each other), Pitfall 2 (set `base: "/admin/"` at scaffold, verify with `vite build` before writing features), Pitfall 6 (configure Better Auth in admin at scaffold, test OAuth before building features), Pitfall 9 (document `<a href>` rule in the initial scaffold — not a TanStack Router `<Link>`).

**Research flag:** Standard patterns — Turborepo and Vite docs are well-documented. The combination of Vite `base: "/admin/"` + TanStack Router `basename="/admin"` trailing slash behavior should be smoke-tested empirically during this phase.

---

### Phase 4: Admin Features (Challenge Management + User Management)

**Rationale:** Admin features require a working scaffold (Phase 3) and confirmed Hono API endpoints. FEATURES.md flags a non-trivial dependency: the old tRPC procedures (`challenge.adminList`, `challenge.setAvailability`, `user.adminList`, `user.adminStats`) must be confirmed as Hono REST equivalents or added. This API audit must happen before UI work.

**Delivers:** Admin challenge list with enable/disable toggle; admin user list with role/ban actions; admin stats cards; all backed by verified Hono REST endpoints at `/api/admin/challenges`, `PATCH /api/admin/challenges/:slug/availability`, `/api/user?admin=true`, `PATCH /api/user/:id`.

**Addresses:** FEATURES.md admin challenge management, admin user management, admin stats (all P1).

**Avoids:** Building UI against non-existent API endpoints (explicit dependency flag in FEATURES.md).

**Research flag:** Needs light audit before feature work — inspect `apps/api/src/routes/admin/` and `apps/api/src/routes/user/` to confirm which endpoints exist vs. need adding. Not a full research-phase, but an explicit verification step at the start.

---

### Phase 5: Caddy Production Proxy + Railway Deployment

**Rationale:** The full Railway deployment — DNS cutover, `API_URL` change, OAuth redirect URI updates — should happen last. It affects live production and requires a rollback plan. The Caddyfile itself was drafted in Phase 3; this phase deploys and validates it.

**Delivers:** `apps/caddy` Docker service on Railway; `kubeasy.dev/admin/*` → admin service, `kubeasy.dev/api/*` → API service (with SSE flush), `kubeasy.dev/*` → web service; auth cookies simplified to same-origin; `api.kubeasy.dev` custom domain removed from API service.

**Addresses:** FEATURES.md production routing P1 item; ARCHITECTURE.md auth cookie simplification; SSE `flush_interval -1` for real-time validation updates.

**Avoids:** Pitfall 6 (Caddy `auto_https off`), Pitfall 7 (Railway DNS startup race — `fail_duration 60s`, deploy Caddy last), ARCHITECTURE.md Anti-Pattern 4 (remove `api.kubeasy.dev` after Caddy is stable, not before).

**Research flag:** Railway DNS startup race mitigation is MEDIUM confidence (Railway private networking docs are sparse). Test Caddy redeploy while other services are running in a staging environment before production cutover. The `API_URL` env change and OAuth redirect URI re-registration are the highest-risk steps — keep `api.kubeasy.dev` active in parallel until new routing is confirmed stable.

---

### Phase Ordering Rationale

- **Shared UI must come before parity audit and admin** — both depend on the design system being stable and co-located. Any feature built before this forces a second import refactor.
- **Parity audit before admin styling** — admin adopts whatever state the design system is in; auditing after admin is built doubles styling work.
- **Dev proxy and admin scaffold together** — they share port configuration; writing the Caddyfile mirror at this point forces production routing to be designed upfront.
- **Admin features after scaffold** — API endpoint verification must precede UI work; discovering missing Hono routes mid-feature is a phase-blocker.
- **Caddy deployment last** — involves DNS changes, OAuth reconfiguration, and production traffic migration; all other phases can be completed with current routing intact.

### Research Flags

Needs investigation at phase start:
- **Phase 4:** Audit Hono admin routes before building UI — `GET /api/admin/challenges`, `PATCH /api/admin/challenges/:slug/availability`, `GET /api/user?admin=true`, `PATCH /api/user/:id` need to be confirmed or added.
- **Phase 5:** Test Caddy redeploy while upstream services are running in staging — do not wait until production cutover to discover Railway DNS timing issues.

Standard patterns (skip research-phase):
- **Phase 1:** shadcn/ui monorepo setup is fully documented; Tailwind v4 `@source` pattern is explicit in official docs. Needs empirical verification, not research.
- **Phase 2:** Manual inspection task — no research needed.
- **Phase 3:** Turborepo `microfrontends.json` is well-documented; Vite SPA setup is standard.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against existing `apps/web/package.json`; Turborepo 2.6 micro-frontend feature confirmed in release notes; Caddy 2.11 current on Docker Hub; no new technology categories introduced |
| Features | HIGH | Feature inventory derived from existing `../website` codebase; Turborepo/shadcn/Caddy integration patterns from official docs; anti-features are explicit |
| Architecture | HIGH | Component boundaries derived from official Turborepo, Vite, and Caddy docs; Railway private networking pattern verified; data flow diagrams are explicit |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls (Vite base, Tailwind source, React peer deps, Caddy auto_https) verified with official docs or known issue trackers; Railway-specific items (DNS startup race) are MEDIUM — Railway private networking docs are sparse |

**Overall confidence:** HIGH

### Gaps to Address

- **Hono admin route inventory:** FEATURES.md flags that the Hono API may be missing `challenge.adminList`, `challenge.setAvailability`, `user.adminList`, `user.adminStats` equivalents. Must audit `apps/api` before Phase 4. Not blocking Phases 1-3.

- **Railway deploy order UI:** Railway does not clearly document multi-service start ordering. The health check retry approach (`fail_duration 60s`, `max_fails 10`) is the documented fallback. Test in staging before production.

- **Tailwind v4 `@source` with workspace symlinks:** Community reports suggest Tailwind v4 may behave differently when scanning through `node_modules` symlinks vs. direct source paths. The `@source` directive with a relative path to `packages/ui/src` is recommended, but must be verified empirically during Phase 1.

- **TanStack Router + Vite `base` trailing slash:** TanStack Router's `basename` prop combined with Vite `base: "/admin/"` has known edge cases. The `vite build && vite preview` verification step in Phase 3 is the empirical check — no blocker, but requires explicit testing before declaring Phase 3 done.

---

## Sources

### Primary (HIGH confidence)
- Turborepo microfrontends guide — `microfrontends.json`, proxy behavior, `@vercel/microfrontends` override: https://turborepo.dev/docs/guides/microfrontends
- Turborepo 2.6 release notes — micro-frontend feature introduction: https://turborepo.dev/blog/turbo-2-6
- shadcn/ui monorepo docs — `components.json`, workspace aliases, CLI behavior: https://ui.shadcn.com/docs/monorepo
- shadcn/ui Tailwind v4 docs — `@theme`, `@source` directives: https://ui.shadcn.com/docs/tailwind-v4
- Turborepo shadcn/ui integration guide: https://turborepo.dev/docs/guides/tools/shadcn-ui
- Caddy reverse_proxy directive — handle routing, `flush_interval`, `try_files` for SPA: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy Caddyfile patterns — path-based routing: https://caddyserver.com/docs/caddyfile/patterns
- Railway private networking — `<service>.railway.internal` DNS pattern: https://docs.railway.com/networking/private-networking
- Caddy Docker Hub — caddy:2-alpine current version (2.11.2): https://hub.docker.com/_/caddy
- Vite base config option: https://vite.dev/config/shared-options (base option)
- `apps/web/package.json` (this repo) — verified current versions for all shared dependencies

### Secondary (MEDIUM confidence)
- Railway Caddy reverse proxy templates — confirmed active March 2026: https://railway.com/deploy/caddy-backend-proxy
- Railway Caddy private networking Q&A — DNS startup race pattern: https://station.railway.com/questions/private-networking-unavailable-caddy-re-8f00af81
- Tailwind v4 monorepo `@source` issue: https://github.com/tailwindlabs/tailwindcss/issues/13136
- Tailwind v4 Turborepo community setup guide: https://medium.com/@philippbtrentmann/setting-up-tailwind-css-v4-in-a-turbo-monorepo-7688f3193039
- Better Auth cross-domain cookies: https://better-auth.com/docs/concepts/cookies
- Better Auth cross-domain issue (confirmed behavior): https://github.com/better-auth/better-auth/issues/4038
- turborepo-shadcn-ui-tailwind-4 working reference: https://github.com/linkb15/turborepo-shadcn-ui-tailwind-4

### Tertiary (LOW confidence)
- pnpm duplicate peer deps behavior — fix is authoritative: https://github.com/pnpm/pnpm/issues/3558

---

*Research completed: 2026-03-24*
*Ready for roadmap: yes*
