# Phase 4: Web Migration - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Create `apps/web` (TanStack Start + TanStack Router) that replaces the Next.js monolith for all user-facing pages. All tRPC hooks are removed — data fetching uses typed `fetch` wrappers against `@kubeasy/api-schemas`, orchestrated by TanStack Query. SSG for landing/blog, SSR for challenges/dashboard. Better Auth client (AUTH-06, deferred from Phase 3) is implemented here.

**Pages in scope:** landing, blog (listing + articles), challenges (listing + detail), dashboard, /onboarding, /profile, /get-started, /(admin).
**Out of scope:** /docs (separate Fumadocs app — stays out of this milestone).

</domain>

<decisions>
## Implementation Decisions

### Component & Style Migration
- **shadcn v4** — use the new shadcn v4 CLI/format for the fresh install in `apps/web`. Not v3.
- Fresh install: run `shadcn init` in `apps/web`, then port only the components actually used. No wholesale copy of the old `components/` directory.
- **globals.css** — copy the existing 10.4K `globals.css` (Tailwind 4 tokens) exactly as-is into `apps/web`. Feature parity, not a redesign.
- **Images** — use `@unpic/react` as a near drop-in replacement for `next/image`. Do NOT use plain `<img>` tags.
- **Navigation** — replace `next/link` with `<Link>` from TanStack Router throughout.
- **next/navigation** hooks (`useRouter`, `usePathname`, etc.) — replace with TanStack Router equivalents (`useNavigate`, `useLocation`, etc.).

### Blog SSG + Notion
- Prerender both the blog listing page **and** all individual article pages at build time (full SSG parity with current Next.js behavior).
- If Notion API is unavailable or fails during build → **fail the build**. No partial/stale deploys.
- Notion client (`lib/notion.ts` or similar) lives inside `apps/web/lib/` — it is a web-only concern, no shared package needed.
- The existing Notion integration code (fetching, rendering) is ported directly into `apps/web`.

### Auth Flow & Protected Routes
- Protected routes (dashboard, profile, admin, etc.) use **`beforeLoad`** on the route definition: `beforeLoad: ({ context }) => { if (!context.user) throw redirect({ to: '/login' }) }`. Declarative, no component-level guard.
- Post-login destination: **return to previous page** — not always /dashboard. The intended URL is passed as `callbackURL` to `authClient.signIn.social()` so Better Auth forwards it through the OAuth cross-domain flow.
- Better Auth client (AUTH-06): `createAuthClient({ baseURL: 'https://api.kubeasy.dev' })` with `apiKeyClient()` and `adminClient()` plugins — mirrors the existing `lib/auth-client.ts` shape but points to the Hono API.
- All fetch calls include `credentials: 'include'` (cross-domain cookie sharing with api.kubeasy.dev).

### Pages in Scope
- **SSG routes**: landing (homepage), blog listing, blog article `[slug]`
- **SSR routes with loader prefetch**: challenges listing, challenge detail `[slug]`, dashboard
- **Auth-gated routes**: dashboard, profile, admin (redirect to /login if no session)
- **Additional pages to migrate**: /onboarding, /profile, /get-started, /(admin)
- **Deferred (out of scope)**: /docs — separate concern, not migrated in this milestone

### WEB-06 (SSE realtime) — Phase 5 concern
- The SSE `EventSource` consumer and `queryClient.invalidateQueries` wiring is Phase 5.
- Phase 4 only builds the static/SSR data layer; realtime validation status updates come in Phase 5.

### Claude's Discretion
- TanStack Query `queryClient` setup (staleTime, gcTime defaults)
- Exact route file structure under `routes/` (file-based routing conventions)
- Error boundary and 404 page implementation
- Loading skeleton / suspense boundary design

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Next.js app (source of truth to migrate from)
- `app/` — Full Next.js App Router directory: all page components to port. Key subdirs: `(main)/`, `(admin)/`, `blog/`, `auth/`, `login/`, `onboarding/`
- `components/` — Existing React components (shadcn/ui + page-level). Reference for which components apps/web needs.
- `lib/auth-client.ts` — Existing Better Auth client config with `apiKeyClient()` and `adminClient()` plugins — port this for AUTH-06
- `app/globals.css` — Tailwind 4 theme tokens and global styles to copy as-is

### Hono API (backend apps/web consumes)
- `apps/api/src/routes/` — All REST endpoints: understand the URLs, request/response shapes
- `packages/api-schemas/src/` — Zod schemas for all API endpoints — the type contracts for fetch wrappers

### Auth (cross-domain cookies)
- `apps/api/src/lib/auth.ts` — Better Auth config on the API side: `baseURL`, `trustedOrigins`, `crossSubdomainCookies` — these constrain what the web client must do
- `.planning/phases/03-authentication/03-CONTEXT.md` — Phase 3 auth decisions (trusted origins, cookie domain, OAuth callback URIs)

### Requirements
- `.planning/REQUIREMENTS.md` §WEB — WEB-01 through WEB-07 (Phase 4 scope)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/` — shadcn/ui components (Button, Card, Badge, Input, etc.): reference for which ones to re-install via shadcn v4 CLI in apps/web
- `lib/notion.ts` (or equivalent in root `lib/`): Notion API client — port into `apps/web/lib/notion.ts`
- `lib/utils.ts` (`cn` helper, etc.): port into `apps/web/lib/utils.ts`
- `lib/constants.ts`: port into `apps/web/lib/constants.ts`
- `packages/api-schemas/src/`: already-typed Zod schemas — use with `z.infer<>` for fetch wrapper return types

### Established Patterns
- BullMQ fire-and-forget (Phase 1): apps/web doesn't dispatch jobs directly
- Hono sub-router Variables typing (Phase 2): apps/web is a consumer, not affected
- `@better-auth/drizzle-adapter` as separate package (Phase 2): only affects apps/api
- `crossSubdomainCookies` on `.kubeasy.dev` (Phase 3): apps/web fetch calls must always include `credentials: 'include'`

### Integration Points
- `apps/api` REST endpoints: apps/web's `lib/api-client.ts` fetches these. All calls need `credentials: 'include'` and base URL from env.
- TanStack Query provider: wraps the root layout, provides `queryClient` to all routes
- TanStack Router: file-based routes under `routes/` (or `src/routes/`), root route provides auth context via `beforeLoad`

</code_context>

<specifics>
## Specific Ideas

- shadcn v4 specifically — use the latest shadcn CLI version that supports v4 format, not v3
- `@unpic/react` as the image component — user confirmed it's a near drop-in for `next/image`
- Return-to-previous-page after login: pass the intended URL as `callbackURL` in `signIn.social()` — Better Auth handles the cross-domain forwarding
- `beforeLoad` pattern for auth guards is the right TanStack Router idiom — not component-level guards

</specifics>

<deferred>
## Deferred Ideas

- /docs migration — separate Fumadocs concern, out of scope for this milestone
- WEB-06 (SSE EventSource + queryClient.invalidateQueries) — Phase 5
- Admin API key management UI (creating/revoking API keys from the web) — backend already supports it (Phase 3), UI can be added in Phase 4 admin migration or as a follow-up
- ISR (Incremental Static Regeneration) for blog — v2 requirement (OPENAPI-02), full rebuild at deploy is acceptable for v1

</deferred>

---

*Phase: 04-web-migration*
*Context gathered: 2026-03-18*
