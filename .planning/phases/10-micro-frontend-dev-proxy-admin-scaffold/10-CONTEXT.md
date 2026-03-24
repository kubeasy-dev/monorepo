# Phase 10: Micro-Frontend Dev Proxy + Admin Scaffold - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Unified dev proxy at `localhost:3024` routing traffic to three apps (`apps/web`, `apps/api`, `apps/admin`), plus `apps/admin` as a functioning Vite SPA skeleton with TanStack Router, auth guard, and top-nav shell layout. No admin features yet — skeleton only. Also includes a reference Caddyfile template for prod routing.

</domain>

<decisions>
## Implementation Decisions

### Dev Proxy
- **D-01:** Use Turborepo's built-in proxy capability (2.x feature). Researcher must investigate exact API — whether `turbo.json` or a `microfrontends.json` config file supports routing `/admin/*` to a separate Vite dev server at `localhost:3002` and `/api/*` to `localhost:3001`.
- **D-02:** If Turborepo cannot do this natively, propose the minimal alternative (e.g., small Node proxy app). Researcher decides and proposes, but Turborepo-native is the preferred path.
- **D-03:** Proxy port: `localhost:3024` for the unified entry point. Sub-apps keep their individual ports (`web: 3000`, `api: 3001`, `admin: 3002`).

### apps/admin Stack
- **D-04:** Pure Vite + React CSR SPA — no SSR, no TanStack Start. Client-side only.
- **D-05:** **TanStack Router** for routing (same as apps/web — consistent monorepo). File-based routes.
- **D-06:** Consume `@kubeasy/ui` from day 1 using the same JIT pattern as apps/web (sub-path imports, no build step).
- **D-07:** Neo-brutalist design tokens from `@kubeasy/ui/styles/tokens` — same visual identity as apps/web.

### Admin Auth Guard
- **D-08:** Client-side auth check in `__root.tsx` using Better Auth client's `useSession()`.
  - If loading → show `<LoadingSpinner />`
  - If no session → redirect to `http://localhost:3000/login` (in dev) / `https://kubeasy.dev/login` (in prod)
  - If session but `role !== 'admin'` → redirect to `http://localhost:3000` (in dev) / `https://kubeasy.dev` (in prod)
  - If admin → render `<Outlet />`
- **D-09:** Redirect targets are env-var driven (`VITE_WEB_URL`) so they work in both dev and prod.
- **D-10:** The existing `requireAdmin` middleware in `apps/api/src/middleware/admin.ts` already protects all API `/admin/*` routes — no changes needed there.

### Admin Shell Layout
- **D-11:** **Top navigation bar** — horizontal nav at the top with links: Challenges, Users, Settings (placeholder).
- **D-12:** Skeleton nav items: `Challenges`, `Users`, `Settings`. These are placeholders — no real content until Phase 11.
- **D-13:** Top nav includes: Kubeasy logo/brand on left, nav links in center/right, user avatar + signout on far right.

### Scaffold Route Structure
- **D-14:** File-based TanStack Router routes:
  ```
  apps/admin/src/routes/
    __root.tsx        # Shell layout + auth guard
    index.tsx         # Redirect to /challenges
    challenges/
      index.tsx       # Placeholder "Challenges coming in Phase 11"
    users/
      index.tsx       # Placeholder "Users coming in Phase 11"
  ```

### Caddyfile
- **D-15:** Reference template only — documents intended prod routing but is NOT used locally. Local dev uses the Turbo/proxy approach instead.
- **D-16:** Location: `apps/proxy/Caddyfile` or project root `Caddyfile` — researcher decides.

### Claude's Discretion
- Exact Turborepo proxy config syntax (pending research)
- Loading spinner implementation in admin
- Exact Tailwind/CSS setup for apps/admin (mirroring apps/web's globals.css approach)
- TypeScript config for apps/admin (extend from `@kubeasy/typescript-config`)

</decisions>

<specifics>
## Specific Ideas

- "microfrontends.json" was mentioned in ROADMAP — researcher should look for Turborepo's built-in multi-app dev server feature by this name specifically, then fall back to alternatives if not supported in current Turborepo 2.8.x.
- The Caddyfile is a prod reference artifact — it will feed into Phase 12 (Caddy Production deployment).
- Admin SPA at `/admin` path — Vite base path must be configured to `/admin/` so assets load correctly when served behind the proxy.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and success criteria
- `.planning/ROADMAP.md` §Phase 10 — Success criteria (4 must-pass items), MFE-01/02, ADMIN-01/02 requirements

### Existing infrastructure
- `apps/api/src/middleware/admin.ts` — `requireAdmin` middleware (already exists, no changes needed)
- `apps/api/src/routes/admin/index.ts` — current admin route setup (only challenges/sync today)
- `turbo.json` — current Turborepo pipeline (dev task, no proxy yet)
- `package.json` (root) — `pnpm dev` script: `turbo dev --filter=./apps/*`

### Shared UI package pattern
- `.planning/phases/08-shared-ui-package/08-01-SUMMARY.md` — JIT pattern, sub-path exports, peerDeps setup that admin must replicate
- `packages/ui/package.json` — exports map for `@kubeasy/ui`

### Apps/web as reference implementation
- `apps/web/vite.config.ts` — Vite setup to mirror for apps/admin
- `apps/web/src/routes/__root.tsx` — Root layout pattern (auth guard equivalent)
- `apps/web/src/lib/auth-client.ts` — Better Auth client config to replicate in apps/admin

### No external specs
Requirements are fully captured in ROADMAP.md success criteria and decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/middleware/admin.ts` (`requireAdmin`): API-level admin enforcement already done — admin SPA only needs client-side guard
- `packages/ui/*`: All 17 shadcn components available for admin shell immediately
- `apps/web/src/lib/auth-client.ts`: Better Auth client pattern to copy into `apps/admin/src/lib/auth-client.ts`

### Established Patterns
- JIT `@kubeasy/ui` imports: `import { Button } from "@kubeasy/ui/button"` — admin follows same pattern
- TanStack Router file-based routes: `apps/web/src/routes/` structure mirrors what admin should use
- `@kubeasy/typescript-config`: `tsconfig.json` extends base/react config — admin does the same

### Integration Points
- `turbo.json` needs updating to include `apps/admin` in dev pipeline + proxy task
- `package.json` root `pnpm dev` script may need adjustment if proxy is separate
- `apps/admin/vite.config.ts` must set `base: '/admin/'` for correct asset paths when proxied

</code_context>

<deferred>
## Deferred Ideas

- Admin challenge management UI (table, stats, toggle availability) → Phase 11
- Admin user management UI (table, ban/unban, role change) → Phase 11
- Admin Hono API endpoints (GET /admin/challenges, GET /admin/users, stats, etc.) → Phase 11
- TLS termination and DNS cutover → Phase 12
- Caddy Railway deployment → Phase 12

</deferred>

---

*Phase: 10-micro-frontend-dev-proxy-admin-scaffold*
*Context gathered: 2026-03-24*
