# Roadmap: Kubeasy

## Milestones

- ✅ **v1.0 Monorepo Refactoring** — Phases 1–7 (shipped 2026-03-23)
- 🚧 **v1.1 UI Parity + Micro-Frontend + Admin** — Phases 8–12 (in progress)

## Phases

<details>
<summary>✅ v1.0 Monorepo Refactoring (Phases 1–7) — SHIPPED 2026-03-23</summary>

- [x] Phase 1: Monorepo Scaffold (4/4 plans) — completed 2026-03-18
- [x] Phase 2: Hono API Migration (5/5 plans) — completed 2026-03-18
- [x] Phase 3: Authentication (3/3 plans) — completed 2026-03-18
- [x] Phase 4: Web Migration (4/4 plans) — completed 2026-03-18
- [x] Phase 5: Realtime SSE (3/3 plans) — completed 2026-03-23
- [x] Phase 5.1: Repair Workers Features (5/5 plans) — completed 2026-03-19 (INSERTED)
- [x] Phase 5.2: Missing Dashboard & Profile Features (3/3 plans) — completed 2026-03-20 (INSERTED)
- [x] Phase 6: Observability (4/4 plans) — completed 2026-03-21
- [x] Phase 7: Railway Deployment (3/3 plans) — completed 2026-03-23

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 UI Parity + Micro-Frontend + Admin (In Progress)

**Milestone Goal:** Restore full visual parity with the original website, extract a shared shadcn/ui package used by both apps, unify local dev routing via Turborepo micro-frontend proxy, migrate the admin interface to a standalone Vite SPA, and route all production traffic through a Caddy reverse proxy on Railway.

- [ ] **Phase 8: Shared UI Package** — Extract all shadcn/ui components into `packages/ui`, wire Tailwind v4 `@source`, refactor `apps/web` imports
- [x] **Phase 9: UI Parity** — Audit and correct all visual differences between `apps/web` and `../website` across all 4 page groups (completed 2026-03-24)
- [x] **Phase 10: Micro-Frontend Dev Proxy + Admin Scaffold** — Configure `microfrontends.json`, scaffold `apps/admin` Vite SPA with auth guard and draft Caddyfile (completed 2026-03-24)
- [ ] **Phase 11: Admin Features** — Build admin challenge management and user management pages, add all Hono admin API endpoints
- [ ] **Phase 12: Caddy Production + Railway Deployment** — Deploy Caddy service on Railway, DNS cutover to unified `kubeasy.dev`, update OAuth redirect URIs

## Phase Details

### Phase 8: Shared UI Package
**Goal**: `packages/ui` exists as the single source of shadcn/ui components — both `apps/web` and `apps/admin` import from `@kubeasy/ui` and nowhere else
**Depends on**: Phase 7 (v1.0 baseline stable)
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. All 17 shadcn components are importable from `@kubeasy/ui` with no TypeScript errors in either consuming app
  2. `apps/web/src/components/ui/` directory is deleted — no local shadcn copies remain in the web app
  3. CSS design tokens (colors, radius, etc.) are defined once in `packages/ui/src/styles/tokens.css` and imported by each consuming app
  4. `pnpm ls react` shows exactly one React instance per app — no duplicate React from wrong peer dep config
  5. Tailwind generates CSS classes from the shared package — a component class defined only in `packages/ui` appears in the built CSS of `apps/web`
**Plans:** 2 plans
Plans:
- [x] 08-01-PLAN.md — Create packages/ui with all 17 components, tokens, utils, and package config
- [x] 08-02-PLAN.md — Rewire apps/web imports to @kubeasy/ui, update deps, delete local ui/
**UI hint**: yes

### Phase 9: UI Parity
**Goal**: Every public-facing page in `apps/web` is visually indistinguishable from its counterpart in `../website`
**Depends on**: Phase 8 (shared UI package stable — parity corrections may land in `packages/ui`)
**Requirements**: PARITY-01, PARITY-02, PARITY-03, PARITY-04
**Success Criteria** (what must be TRUE):
  1. Blog list and article pages in `apps/web` match `../website` in typography, spacing, layout, and color — verified by side-by-side comparison
  2. Marketing pages (landing, pricing, about) in `apps/web` match `../website` visually
  3. Challenges list and challenge detail pages in `apps/web` match `../website` visually
  4. Dashboard and profile pages in `apps/web` match `../website` visually
**Plans:** 4/4 plans complete
Plans:
- [x] 09-01-PLAN.md — Blog pages parity (BlogCard featured/compact variants, prose-neo typography)
- [x] 09-02-PLAN.md — Marketing landing page parity (diff and fix 7 section components)
- [x] 09-03-PLAN.md — Challenges/themes/types pages parity (Back Button ghost variant)
- [x] 09-04-PLAN.md — Dashboard/profile pages parity (stats icons, grid layout, Quick Actions)
**UI hint**: yes

### Phase 10: Micro-Frontend Dev Proxy + Admin Scaffold
**Goal**: All three apps are accessible through a single `localhost:3024` dev proxy, and `apps/admin` exists as a functioning Vite SPA skeleton with auth guard protecting all admin routes
**Depends on**: Phase 8 (shared UI package — admin consumes `@kubeasy/ui` from day one)
**Requirements**: MFE-01, MFE-02, ADMIN-01, ADMIN-02
**Success Criteria** (what must be TRUE):
  1. Running `pnpm dev` serves `apps/web` at `localhost:3024`, `apps/api` at `localhost:3024/api`, and `apps/admin` at `localhost:3024/admin` — all via the Turborepo proxy
  2. A non-admin user visiting `localhost:3024/admin` is redirected to the main site — the route guard enforces role check via Better Auth session
  3. An admin user can log in and see the `apps/admin` shell layout with navigation — no features yet, but the authenticated shell renders without errors
  4. `vite build` succeeds for `apps/admin` and assets load correctly at `/admin/` path — no 404s on sub-path assets
**Plans:** 2/2 plans complete
Plans:
- [x] 10-01-PLAN.md — MFE proxy config + apps/admin Vite CSR SPA package bootstrap
- [x] 10-02-PLAN.md — Admin auth guard, top-nav shell, placeholder routes, Caddyfile
**UI hint**: yes

### Phase 11: Admin Features
**Goal**: Admin users can manage challenges and users through the `apps/admin` interface, backed by a complete set of Hono admin REST endpoints
**Depends on**: Phase 10 (admin scaffold with auth guard working)
**Requirements**: ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07, ADMIN-08, ADMIN-09, ADMIN-10, ADMIN-11, ADMIN-12, ADMIN-13, ADMIN-14, ADMIN-15, ADMIN-16, ADMIN-17
**Success Criteria** (what must be TRUE):
  1. Admin can view the challenges page with 4 stats cards (completion rate, success rate, total submissions, avg attempts) and a table of all challenges with per-row metrics — data matches what the API returns
  2. Admin can toggle a challenge's availability with an optimistic update — the UI reflects the change immediately and reverts if the API call fails
  3. Admin can view the users page with 4 stats cards (total, active, banned, admins) and a paginated table (50/page) showing avatar, role badge, XP, and ban status
  4. Admin can change a user's role (make admin / remove admin) and ban/unban a user with a reason dialog — self-action is blocked by the UI and the API
  5. All admin API endpoints (`GET /api/admin/challenges`, `GET /api/admin/challenges/stats`, `PATCH /api/admin/challenges/:id/available`, `GET /api/admin/users`, `GET /api/admin/users/stats`) return correct data and are protected by admin middleware; user mutations (ban/unban/role change) go through Better Auth adminClient (`POST /api/auth/admin/ban-user`, `POST /api/auth/admin/unban-user`, `POST /api/auth/admin/set-role`) per D-01
**Plans:** 3 plans
Plans:
- [ ] 11-01-PLAN.md — API endpoints: 5 Hono admin routes + user schemas in api-schemas + test stubs
- [ ] 11-02-PLAN.md — Challenges page UI: api-client, query-options, stats cards, table with toggle
- [ ] 11-03-PLAN.md — Users page UI: stats cards, paginated table, role/ban dropdown, ban dialog
**UI hint**: yes

### Phase 12: Caddy Production + Railway Deployment
**Goal**: All production traffic for `kubeasy.dev` routes through a single Caddy reverse proxy on Railway — web, API (with SSE support), and admin served from one domain
**Depends on**: Phase 11 (admin features complete and tested locally via dev proxy)
**Requirements**: ADMIN-18, MFE-03, MFE-04, MFE-05
**Success Criteria** (what must be TRUE):
  1. `kubeasy.dev`, `kubeasy.dev/api`, and `kubeasy.dev/admin` all load correctly in production — the Caddy service is the single entry point
  2. SSE-based real-time validation updates work in production — the `flush_interval -1` Caddy directive is confirmed by a successful challenge submission and live status update
  3. OAuth login flow works end-to-end in production via the new same-origin domain — GitHub, Google, and Microsoft redirect URIs are updated and functional
  4. `apps/admin` is deployed as an independent Railway service — Railway dashboard shows a dedicated admin service with its own Dockerfile build
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Monorepo Scaffold | v1.0 | 4/4 | Complete | 2026-03-18 |
| 2. Hono API Migration | v1.0 | 5/5 | Complete | 2026-03-18 |
| 3. Authentication | v1.0 | 3/3 | Complete | 2026-03-18 |
| 4. Web Migration | v1.0 | 4/4 | Complete | 2026-03-18 |
| 5. Realtime SSE | v1.0 | 3/3 | Complete | 2026-03-23 |
| 5.1 Repair Workers | v1.0 | 5/5 | Complete | 2026-03-19 |
| 5.2 Dashboard & Profile | v1.0 | 3/3 | Complete | 2026-03-20 |
| 6. Observability | v1.0 | 4/4 | Complete | 2026-03-21 |
| 7. Railway Deployment | v1.0 | 3/3 | Complete | 2026-03-23 |
| 8. Shared UI Package | v1.1 | 0/2 | Planning | — |
| 9. UI Parity | v1.1 | 4/4 | Complete   | 2026-03-24 |
| 10. Micro-Frontend Dev Proxy + Admin Scaffold | v1.1 | 2/2 | Complete    | 2026-03-24 |
| 11. Admin Features | v1.1 | 0/3 | Planned | — |
| 12. Caddy Production + Railway Deployment | v1.1 | 0/? | Not started | — |
