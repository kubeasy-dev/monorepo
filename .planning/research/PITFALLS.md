# Pitfalls Research

**Domain:** Adding micro-frontend + shared shadcn/ui package + admin Vite SPA to existing Turborepo (Hono API + TanStack Start)
**Researched:** 2026-03-24
**Confidence:** MEDIUM-HIGH (critical pitfalls verified with official docs or multiple community sources; Railway-specific items are MEDIUM due to limited official documentation)

---

## Critical Pitfalls

### Pitfall 1: Turborepo micro-frontend proxy is local-dev only — no production path

**What goes wrong:**
Turborepo's built-in microfrontend proxy (`turbo serve` / `turbo get-mfe-port`) is explicitly documented as "meant for local usage only." Developers scaffold the dev proxy, it works locally, and they assume it provides the production routing strategy. Production routing between the three apps (web, admin, api) falls apart because there is no Turborepo-native production proxy — that responsibility belongs entirely to Caddy on Railway.

**Why it happens:**
The Turborepo microfrontends guide is paired with Vercel's microfrontend product. Teams not deploying to Vercel read the guide, implement the dev proxy, and discover too late that the production piece is missing. The dev/prod parity gap is not prominent in the Turborepo docs.

**How to avoid:**
Treat the Turborepo proxy as a local convenience only. Design the production Caddy routing independently and test it early — the Caddy config and the local proxy config should map to each other 1:1 so local dev reflects production paths. Write the Caddyfile first, then mirror it in the Turborepo proxy config.

**Warning signs:**
- Local dev works end-to-end but production requests for `/admin/*` return 404
- CORS errors that only appear in production (different origins than dev)
- SSE connections break in production but not locally

**Phase to address:** Phase 9 (Micro-Frontend + Shared UI) — establish both configs before building admin routes.

---

### Pitfall 2: SPA cross-application navigation breaks through the proxy

**What goes wrong:**
When `apps/web` (TanStack Start) links to `/admin/...` using `<Link>` or `navigate()`, the client-side router attempts to handle the navigation within the current app. Since `/admin` is a separate Vite SPA, the TanStack Router has no matching route and renders a 404 or redirects to a fallback. This is silent — the link appears correct, the URL changes, but the admin app never loads.

**Why it happens:**
SPA navigation is intra-application by design. A `<Link to="/admin">` in TanStack Start tells TanStack Router to do a client-side transition, not a full browser navigation. Crossing a micro-frontend boundary requires a full page load.

**How to avoid:**
Use standard `<a href="/admin">` HTML anchor tags (or `window.location.href`) for any link that crosses micro-frontend boundaries. Never use TanStack Router's `<Link>` for cross-app navigation. Document this rule explicitly in a comment in any component that links to `/admin`.

**Warning signs:**
- Blank white page after clicking a link to the other app
- Browser URL shows `/admin/...` but the admin bundle is never fetched in the Network tab
- Console errors: "No route found for path /admin/..."

**Phase to address:** Phase 9 (Micro-Frontend + Shared UI) — enforce this pattern during initial proxy setup.

---

### Pitfall 3: Tailwind v4 `@source` not configured — shared UI components render without styles

**What goes wrong:**
`packages/ui` contains shadcn/ui components using Tailwind utility classes. The consumer apps (`apps/web`, `apps/admin`) run Tailwind's scanner, but by default the scanner only covers files within the app's own directory. It does not traverse `packages/ui`. The compiled CSS contains no styles for those components. In development the component renders unstyled; in production the same thing happens, silently.

**Why it happens:**
Tailwind v4 uses automatic content detection based on the current working directory. When Vite builds `apps/web`, its Tailwind scanner root is `apps/web/`. The symlinked workspace package in `node_modules/@kubeasy/ui` is followed, but `packages/ui/` source is not scanned unless explicitly declared.

**How to avoid:**
In each consuming app's CSS entrypoint (e.g. `apps/web/src/styles/globals.css` and `apps/admin/src/styles/globals.css`), add:
```css
@source "../../../packages/ui/src";
```
Alternatively, add a `source()` call in the `@import "tailwindcss"` line. Verify by inspecting the generated CSS for a class that only exists in the shared package (e.g. a Button variant class). Never assume discovery works — always verify during package setup.

**Warning signs:**
- Components from `packages/ui` render as unstyled HTML in both dev and prod
- `tailwind --debug` or Vite's CSS output does not mention the shared package path
- Styles work in `apps/web` but not in `apps/admin` (or vice versa) depending on which app was checked first

**Phase to address:** Phase 9 (Micro-Frontend + Shared UI) — verify `@source` during initial shared package wiring.

---

### Pitfall 4: CSS variables defined in `apps/web` are not available in `packages/ui`

**What goes wrong:**
The custom neobrutalism theme (`--background`, `--primary`, `--border`, etc.) is declared in `apps/web/src/styles/globals.css`. Components in `packages/ui` use `bg-background`, `text-primary`, etc. When `apps/admin` imports components from `packages/ui`, the CSS variables are undefined — they were never injected into the admin app's stylesheet. Components render with fallback/inherited colors or transparent backgrounds.

**Why it happens:**
The CSS variable declarations live in the consumer app's stylesheet, not in the shared package. The admin app imports the components but has no stylesheet that declares the tokens. This is easy to miss because `apps/web` already works correctly.

**How to avoid:**
The CSS variable declarations (`:root { --background: ... }`) must be imported by every consuming app. Two valid approaches:
1. Move the theme variable declarations into `packages/ui/src/styles/tokens.css` and have each app import it: `@import "@kubeasy/ui/styles/tokens.css"`.
2. Copy the `:root` block into `apps/admin/src/styles/globals.css` (acceptable if only two consumers, but becomes a maintenance burden).

Option 1 is correct for this setup. The `packages/ui` package.json `exports` field must expose the CSS file.

**Warning signs:**
- Admin app renders but buttons are unstyled or the wrong color
- Browser DevTools shows `--primary` as empty/undefined in the admin app
- Components look correct in web but broken in admin

**Phase to address:** Phase 9 (Micro-Frontend + Shared UI) — set up package CSS exports before building any admin UI.

---

### Pitfall 5: Duplicate React instance from `packages/ui` — hooks crash at runtime

**What goes wrong:**
When `packages/ui` lists `react` and `react-dom` as regular `dependencies` instead of `peerDependencies`, pnpm installs a separate copy of React inside `packages/ui/node_modules`. At runtime, the app has two React instances. Hooks that depend on React's internal fiber (like `useState`, `useContext`, and all Radix UI hooks) throw: "Invalid hook call. Hooks can only be called inside of the body of a function component."

**Why it happens:**
Developers add `react` to `dependencies` (the default when running `pnpm add react` inside the package) rather than `peerDependencies`. With pnpm's strict isolation, this creates two separate module instances even if they are the same version.

**How to avoid:**
In `packages/ui/package.json`:
```json
{
  "peerDependencies": {
    "react": ">=19",
    "react-dom": ">=19"
  },
  "devDependencies": {
    "react": "19.x",
    "react-dom": "19.x"
  }
}
```
`react` is a peer dep (satisfied by the consumer app) and also a dev dep (for local type checking/storybook if needed). Never put it in `dependencies`. Also add `dedupePeerDependents=true` to `.npmrc` at the monorepo root.

**Warning signs:**
- "Invalid hook call" errors only when importing from `packages/ui`, not from `apps/web/src/components/ui`
- `pnpm ls react` shows more than one entry per app
- Works in one app, breaks in the other

**Phase to address:** Phase 9 (Micro-Frontend + Shared UI) — enforce at package creation time; check with `pnpm ls react` before first commit.

---

### Pitfall 6: Better Auth cookies fail for the admin SPA — session always null

**What goes wrong:**
`apps/admin` is a pure client-side Vite SPA at `kubeasy.dev/admin`. It calls `apps/api` (`api.kubeasy.dev`) for auth and data. The Better Auth client is initialized with `baseURL: "https://api.kubeasy.dev"`. Login redirects work, but after redirect, the session is null. The API set the cookie correctly, but the browser does not send it back because the cookie's `Domain` attribute does not cover `kubeasy.dev/admin` or the SameSite policy blocks it.

**Why it happens:**
Same root cause as the v1.0 web/api cookie split (already solved), but `apps/admin` is a new consumer that needs the same configuration applied. Additionally, the admin app is served from `kubeasy.dev/admin` (path-based, same domain as web) via the Caddy proxy — this actually makes cookies work more naturally than expected, but the Better Auth client must still be configured with `credentials: "include"` and the API's CORS allowlist must explicitly include the admin origin.

**How to avoid:**
1. Add `"https://kubeasy.dev"` (and `"http://localhost:3000"` for dev) to `allowedOrigins` in `apps/api/src/lib/cors.ts` — it should already be there, but verify it covers the admin SPA path too (path doesn't affect CORS origin matching, only the origin matters).
2. Initialize the Better Auth client in `apps/admin` identically to `apps/web`: `baseURL: import.meta.env.VITE_API_URL`, `fetchOptions: { credentials: "include" }`.
3. Configure local dev proxy in `apps/admin/vite.config.ts` to forward `/api/auth/*` to the local API to avoid CORS issues during development.

**Warning signs:**
- Auth callback redirects work but `authClient.getSession()` returns null
- Network tab shows auth cookies are set after login but not sent on subsequent requests
- Works in web app, breaks in admin app despite identical auth code

**Phase to address:** Phase 10 (Admin App) — configure auth at the start of admin app scaffolding.

---

### Pitfall 7: Vite SPA `base` config missing or wrong — assets 404 in production

**What goes wrong:**
`apps/admin` is served from `kubeasy.dev/admin` (path-based routing via Caddy). If the Vite `base` config is left at the default `/`, all asset imports in the built HTML are absolute paths starting with `/assets/...`. Caddy serves the Vite SPA files from a subdirectory context, but the assets are requested at `/assets/...` rather than `/admin/assets/...`. This produces HTTP 404 for all JS/CSS bundles. The page is a blank white screen.

**Why it happens:**
Vite defaults to `base: "/"`, which works when the app is served at the root domain. When the app is at a sub-path, all asset paths must be prefixed. This is a Vite-level concern that is completely invisible during local development (which typically runs the admin at its own port, not under `/admin`).

**How to avoid:**
Set `base: "/admin/"` in `apps/admin/vite.config.ts`:
```typescript
export default defineConfig({
  base: "/admin/",
  ...
})
```
Also configure Caddy to strip the `/admin` prefix before passing requests to the Vite SPA's static file server, or serve the admin build output at the correct path. Test the production build locally with `vite preview --base /admin/` before deploying.

**Warning signs:**
- Blank page in production but works fine locally (where admin runs at its own port)
- Network tab shows 404 for `/assets/index-xxx.js` instead of `/admin/assets/index-xxx.js`
- `index.html` loads (200) but all script/link tags load the wrong paths

**Phase to address:** Phase 10 (Admin App) — set during initial Vite config scaffold; test with `vite build && vite preview` before writing any features.

---

### Pitfall 8: Caddy on Railway — `auto_https` causes HTTP → HTTPS confusion

**What goes wrong:**
Railway terminates TLS at its edge and forwards plain HTTP to the Caddy service. Caddy, seeing requests arrive on port 80 without TLS, attempts to redirect to HTTPS or serve an HTTPS listener, depending on configuration. Requests loop, Caddy logs "Client sent an HTTP request to an HTTPS server", and the proxy is completely non-functional.

**Why it happens:**
Caddy's default behavior is to provision TLS for any site address that looks like a domain name. On Railway, this conflicts with the infrastructure-level TLS termination. Developers who are familiar with Caddy's "automatic HTTPS" feature enable it and break the setup.

**How to avoid:**
In the Caddyfile's global options block, disable auto HTTPS:
```
{
  auto_https off
}
```
Configure site blocks with `http://` scheme explicitly, not bare domain names:
```
http://:80 {
  reverse_proxy /api/* http://api.railway.internal:3001
  reverse_proxy /admin/* http://admin.railway.internal:4173
  reverse_proxy /* http://web.railway.internal:3000
}
```
This is the standard pattern for all Railway Caddy proxy setups.

**Warning signs:**
- Caddy container starts but all requests return a redirect loop or TLS error
- Railway service logs show "tls: failed to verify certificate"
- Caddy logs "Client sent an HTTP request to an HTTPS server"

**Phase to address:** Phase 9 (Micro-Frontend + Shared UI) — get Caddy working with web + api routing before admin exists.

---

### Pitfall 9: Railway internal networking not available at container startup

**What goes wrong:**
Caddy's Caddyfile references internal service hostnames (`web.railway.internal`, `api.railway.internal`). During startup, if the upstream services have not yet registered their internal DNS entries, Caddy's active health checks or upstream probes fail, and Caddy refuses to start or enters a retry loop. The Caddy service shows as unhealthy on Railway.

**Why it happens:**
Railway's private networking uses Wireguard and DNS. Internal DNS entries are created when a service starts, but there is a propagation delay. If Caddy starts before the other services (or before they register), DNS resolution fails.

**How to avoid:**
1. Configure Caddy's health check with a reasonable failure tolerance:
```
reverse_proxy http://web.railway.internal:3000 {
  health_uri /
  health_interval 10s
  fail_duration 30s
  max_fails 5
}
```
2. In Railway, set the deploy order so Caddy starts last (web and api first).
3. Use `try_duration` in the reverse proxy to retry upstream connection on startup.
4. Alternatively, configure Caddy to start without active health checks and rely on passive health checking only.

**Warning signs:**
- Caddy deploy fails but web and api services are healthy
- Railway logs show "dial tcp: lookup web.railway.internal: no such host"
- Caddy works after manual restart (when other services are already running)

**Phase to address:** Phase 9 (Micro-Frontend + Shared UI) — configure health check tolerances in the initial Caddyfile.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copying shadcn component files into each app instead of shared package | Avoid shared package setup complexity | CSS and component variants diverge; updates must be applied 2-3 times | Never — the whole point of v1.1 is the shared package |
| Using `<Link>` from TanStack Router for cross-app navigation | Consistent code style | Silent routing failure between micro-frontends | Never |
| Declaring `react` in `dependencies` of `packages/ui` | Simpler package.json | Duplicate React, broken hooks at runtime | Never |
| Hardcoding `base: "/"` in admin Vite config during dev | Works locally | Assets 404 in production path-based routing | Never for production; only acceptable if admin will always be served from root |
| Keeping CSS theme tokens only in `apps/web` | No refactor needed | Admin app has no theme; components render unstyled | Never |
| Starting with Caddy `auto_https` enabled | "It might work" | Startup failure, TLS loop on Railway | Never on Railway |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Turborepo proxy + Caddy | Treating Turbo proxy config as the source of truth for routing | Caddyfile is canonical; Turbo proxy mirrors it |
| `packages/ui` + Tailwind v4 | Importing `@import "tailwindcss"` in the shared package CSS | The shared package exports only tokens CSS; apps own the Tailwind import |
| Better Auth + Vite SPA | Not configuring `credentials: "include"` in the admin auth client | Every fetch from admin to API must include credentials |
| Caddy + Railway private networking | Using HTTPS scheme for upstream internal services | Use `http://` — Wireguard already encrypts internal traffic |
| `apps/admin` base path | Testing Vite `base` only with `vite dev` (always uses `/`) | Always test with `vite build && vite preview` against the correct base path |
| pnpm + `packages/ui` peer deps | Running `pnpm add react` inside the package (adds to `dependencies`) | Manually add to `peerDependencies` in package.json |
| Railway service discovery | Referencing internal hostname before services start | Set deploy order in Railway; add startup retry config to Caddy |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Each app includes full Tailwind CSS independently | Large, duplicate CSS payloads per app | Shared `packages/ui` owns the design tokens; apps use `@source` not `@import "tailwindcss"` separately | At any scale — it is a bundle size issue |
| Admin SPA loads all admin routes eagerly | Slow initial admin load for rarely-used pages | Use `React.lazy` + `Suspense` for admin route groups from the start | When admin grows beyond 10-15 routes |
| Caddy proxying to public Railway URLs instead of internal network | Extra latency + egress costs | Always use `*.railway.internal` hostnames inside Railway | At any scale; internal networking is cheaper |
| SSE connection through Caddy proxy timing out | SSE stream drops every 60-120s | Configure Caddy `flush_interval -1` for streaming endpoints | Immediately — SSE is broken without this |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Admin SPA auth check only on frontend | Admin UI accessible by anyone who knows the URL; backend unprotected | Every admin API route must enforce the `admin` middleware in Hono regardless of UI routing |
| Caddy forwarding requests to admin without auth check at proxy level | Direct requests to `/admin/` bypass React auth guard | Add a `forward_auth` directive in Caddy pointing to the Better Auth session check endpoint, or enforce at the Hono API level |
| CORS `allowedOrigins` too permissive after adding admin app | Unexpected origins can make credentialed requests | Keep origin list explicit; never use wildcard with `credentials: true` |
| Admin app environment variables prefixed `VITE_` | Client-side JS bundles exposed in browser | Only safe public values get `VITE_` prefix; secrets stay server-side (API only) |
| Railway internal service exposed on public port | Bypasses Caddy proxy, exposes API directly | Ensure only Caddy service has a public Railway domain; API and admin use internal networking only |

---

## "Looks Done But Isn't" Checklist

- [ ] **Shared UI package:** Check that `pnpm ls react` in each app shows exactly ONE React instance — not two.
- [ ] **Tailwind source scanning:** Build the admin app and inspect the output CSS — verify that Button/Card variants from `packages/ui` are present.
- [ ] **CSS variables in admin:** Open admin app in browser, open DevTools, confirm `--primary` and `--background` are defined on `:root`.
- [ ] **Base path in production:** Run `vite build && vite preview --base /admin/` and navigate to a deep admin route — assets must load.
- [ ] **Cross-app navigation:** Click a "Go to Admin" link from the web app — verify the browser performs a full page load (not SPA navigation).
- [ ] **Caddy in Railway:** Trigger a redeploy of only the Caddy service when other services are already running — it must come up healthy.
- [ ] **SSE through proxy:** Open the web app through the Caddy proxy URL and verify SSE stays connected for > 2 minutes.
- [ ] **Admin auth flow:** Complete full OAuth login from the admin app — session must persist after redirect.
- [ ] **Admin API protection:** Make a direct `curl` request to an admin API endpoint without a session cookie — must return 401.
- [ ] **Railway private networking only:** Confirm web, api, and admin services have NO public Railway domains; only Caddy has one.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicate React from wrong peer dep config | MEDIUM | Move `react` to `peerDependencies` in `packages/ui`, run `pnpm install`, restart dev server |
| CSS variables missing in admin | LOW | Add `@import "@kubeasy/ui/styles/tokens.css"` to admin globals.css |
| Tailwind not scanning shared package | LOW | Add `@source` directive in admin CSS, rebuild |
| Asset 404 from wrong base path | LOW | Set `base: "/admin/"` in vite.config.ts, rebuild and redeploy |
| Caddy auto_https loop | LOW | Add `auto_https off` to global Caddyfile block, redeploy |
| Railway DNS failure on startup | MEDIUM | Add health check `fail_duration 60s` + `max_fails 10` to Caddy config; set service start order in Railway |
| SPA cross-app navigation broken | LOW | Replace `<Link>` with `<a href>` at the boundary component |
| Admin auth session null | MEDIUM | Verify CORS origins, `credentials: "include"` in auth client, re-test full OAuth flow |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Turbo proxy = local only, no prod path | Phase 9 — Micro-Frontend setup | Caddyfile written and tested before admin routes exist |
| SPA cross-app navigation | Phase 9 — Micro-Frontend setup | E2E click test across app boundary |
| Tailwind `@source` missing | Phase 9 — Shared UI package | CSS output inspection for shared component classes |
| CSS variables not in admin | Phase 9 — Shared UI package | DevTools `:root` variable audit |
| Duplicate React from peer deps | Phase 9 — Shared UI package | `pnpm ls react` check at package creation |
| Better Auth cookies in admin SPA | Phase 10 — Admin App | Full OAuth login test in admin app |
| Vite `base` path wrong | Phase 10 — Admin App | `vite build && vite preview` with correct base |
| Caddy `auto_https` on Railway | Phase 9 — Micro-Frontend setup | Caddy service health check passes |
| Railway internal DNS startup race | Phase 9 — Micro-Frontend setup | Caddy redeploy test while other services are running |

---

## Sources

- Turborepo micro-frontends official guide: https://turborepo.dev/docs/guides/microfrontends
- shadcn/ui monorepo docs: https://ui.shadcn.com/docs/monorepo
- Tailwind v4 monorepo `@source` issue: https://github.com/tailwindlabs/tailwindcss/issues/13136
- Tailwind v4 Turborepo setup (community): https://medium.com/@philippbtrentmann/setting-up-tailwind-css-v4-in-a-turbo-monorepo-7688f3193039
- Better Auth cross-domain cookies: https://better-auth.com/docs/concepts/cookies
- Better Auth cross-domain issue (GitHub): https://github.com/better-auth/better-auth/issues/4038
- Railway Caddy proxy template: https://railway.com/deploy/caddy-proxy
- Caddy + Railway private networking Q&A: https://station.railway.com/questions/private-networking-unavailable-caddy-re-8f00af81
- Railway private networking docs: https://docs.railway.com/networking/private-networking
- Vite base config guide: https://vite.dev/config/shared-options (base option)
- pnpm duplicate peer deps issue: https://github.com/pnpm/pnpm/issues/3558

---
*Pitfalls research for: Turborepo v1.1 — micro-frontend + shared shadcn/ui + admin Vite SPA + Caddy Railway*
*Researched: 2026-03-24*
