# Phase 3: Authentication - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire OAuth providers (GitHub, Google, Microsoft) on the Hono API, configure `crossSubdomainCookies` for cross-subdomain session sharing, activate the `apiKey()` Better Auth plugin, and add a Hono middleware that validates CLI Bearer tokens. Better Auth handler + CORS + session middleware were already installed in Phase 2.

AUTH-06 (apps/web Better Auth client) is deferred to Phase 4 — apps/web doesn't exist yet. Phase 3 ends at plan 03-03.

</domain>

<decisions>
## Implementation Decisions

### User Lifecycle Hooks
- All 3 hooks from the existing Next.js auth migrate to the Hono auth: PostHog signup tracking, Resend contact creation, `resendContactId` additional user field
- Hooks are dispatched via BullMQ as a **combined `user-signup` job** (non-blocking) inside the Better Auth `user.create` callback — never synchronous in the auth path
- Job payload: `{ userId, email }` — handler does PostHog identify + Resend contact creation
- Job type definition goes in `@kubeasy/jobs` package (new queue: `user-lifecycle` or similar)
- `resendContactId` declared as `additionalFields` in Better Auth config — column likely already in migrated schema (planner must verify against `apps/api/src/db/schema/auth.ts`)

```ts
user: {
  additionalFields: {
    resendContactId: {
      type: "string",
      required: false,
      input: false, // server-only
    },
  },
},
```

### OAuth Provider Configuration
- API production URL: `https://api.kubeasy.dev` — Better Auth `baseURL` updated to this
- OAuth callback URIs to register with all three providers:
  - `https://api.kubeasy.dev/api/auth/callback/github`
  - `https://api.kubeasy.dev/api/auth/callback/google`
  - `https://api.kubeasy.dev/api/auth/callback/microsoft`
- Local dev: `http://localhost:3001` (already configured in Phase 2)
- OAuth app registrations (GitHub, Google, Microsoft) must be updated to point to `api.kubeasy.dev` — this is a manual step outside the code

### Cross-Subdomain Cookies
- `crossSubdomainCookies: { enabled: true, domain: ".kubeasy.dev" }` — already locked in STATE.md
- Allows session cookies set by `api.kubeasy.dev` to be sent with requests from `kubeasy.dev` (web)

### oAuthProxy Plugin
- **Dropped entirely** — no Vercel preview deployments, moving to Railway
- Remove `oAuthProxy` import and usage from auth config
- `trustedOrigins` updated to: `["http://localhost:3000", "http://localhost:3001", "https://kubeasy.dev", "https://api.kubeasy.dev"]`
- `*.vercel.app` wildcard removed

### API Key Plugin (CLI Auth)
- `apiKey()` plugin from `@better-auth/api-key` activated in Better Auth config
- Users create/list/revoke API keys via the web interface (existing Next.js app for now, apps/web in Phase 4)
- A Hono middleware validates `Authorization: Bearer <key>` on CLI routes (`/api/cli/*`)
- On valid key: injects `user` into `c.var` (same shape as session middleware)
- On missing/invalid key: returns 401

### CORS — `User-Agent` header
- Success criteria 5 requires preflight for requests including `User-Agent` to succeed
- Add `User-Agent` to `allowHeaders` in the CORS middleware (already in `app.ts` — update `allowHeaders` array)

### AUTH-06 Timing
- Deferred to Phase 4 — `apps/web` (TanStack Start) doesn't exist in Phase 3
- Phase 3 plan breakdown: 03-01, 03-02, 03-03 only (no 03-04)

### Claude's Discretion
- BullMQ queue name for user lifecycle jobs (e.g. `user-lifecycle`)
- Error handling if BullMQ dispatch fails (don't fail the auth callback — log and continue)
- API key middleware: whether to share the middleware with `sessionMiddleware` or keep it separate

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing auth config (source of truth to migrate from)
- `lib/auth.ts` — Full existing Next.js Better Auth config: socialProviders, additionalFields, hooks, plugins. Reference for everything to port.
- `lib/auth-client.ts` — Existing client config with `apiKeyClient()` and `adminClient()` — reference for what the future apps/web client needs (Phase 4)

### Hono API auth (already in place from Phase 2)
- `apps/api/src/lib/auth.ts` — Current Hono auth config (no OAuth yet, no apiKey plugin) — this is what Phase 3 builds on
- `apps/api/src/app.ts` — CORS config + auth handler mount + session middleware — `allowHeaders` needs `User-Agent` added
- `apps/api/src/middleware/session.ts` — Session middleware pattern — API key middleware should follow same shape

### DB schema
- `apps/api/src/db/schema/auth.ts` — Migrated auth schema — verify `resend_contact_id` column exists on user table

### Jobs package
- `packages/jobs/src/index.ts` — Existing queue definitions — add `user-lifecycle` queue and payload type here

### Requirements
- `.planning/REQUIREMENTS.md` §AUTH — AUTH-01 through AUTH-06 (Phase 3 scope)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/lib/auth.ts`: Already has Drizzle adapter, `admin()` plugin, session cookie cache — Phase 3 adds socialProviders, crossSubdomainCookies, apiKey(), additionalFields, user.create hook
- `apps/api/src/middleware/session.ts`: Pattern for Hono middleware that injects into `c.var` — follow same pattern for API key middleware
- `packages/jobs/src/index.ts`: Existing `createQueue` factory — add `user-lifecycle` queue here
- `lib/auth.ts`: Full reference for additionalFields shape, socialProviders config, and hook implementations to port

### Established Patterns
- BullMQ jobs dispatch in fire-and-forget style (Phase 1 decision) — `queue.add(...)` without `await` on the result inside auth callbacks
- Hono middleware uses `createMiddleware<{ Variables: {...} }>` pattern (established in session.ts)
- `@better-auth/drizzle-adapter` as separate package (not `better-auth/adapters/drizzle`) — established in Phase 2

### Integration Points
- `apps/api/src/app.ts`: CORS `allowHeaders` needs `User-Agent` added
- `apps/api/src/lib/auth.ts`: Receives all Phase 3 additions (socialProviders, crossSubdomainCookies, apiKey, additionalFields, user.create hook)
- `packages/jobs`: Gets new `user-lifecycle` queue definition and `UserSignupPayload` type
- CLI routes (`/api/cli/*`): API key middleware added before route handlers

</code_context>

<specifics>
## Specific Ideas

- Better Auth `baseURL` must be `https://api.kubeasy.dev` in production (not `kubeasy.dev`) — OAuth callbacks are issued from the API domain
- OAuth provider redirectURIs must all point to `api.kubeasy.dev` explicitly (not derived from baseURL alone) — same pattern as existing Next.js config
- BullMQ dispatch in `user.create` hook should be fire-and-forget: if dispatch fails, log the error but don't throw (auth must complete regardless)
- The `resendContactId` column is written by the job handler after Resend API call — not written during auth callback

</specifics>

<deferred>
## Deferred Ideas

- AUTH-06 (apps/web Better Auth client — `createAuthClient` pointing to `api.kubeasy.dev`) — moved to Phase 4
- `apiKey` router (CRUD for API keys from web UI) — already deferred from Phase 2, still Phase 3 backend only (plugin enables the endpoints automatically)
- `emailPreference` and `onboarding` routers — still deferred

</deferred>

---

*Phase: 03-authentication*
*Context gathered: 2026-03-18*
