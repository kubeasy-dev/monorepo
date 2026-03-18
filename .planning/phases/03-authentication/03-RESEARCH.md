# Phase 3: Authentication - Research

**Researched:** 2026-03-18
**Domain:** Better Auth on Hono — OAuth providers, cross-subdomain cookies, API key plugin, BullMQ lifecycle jobs
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- All 3 user lifecycle hooks from existing Next.js auth migrate to the Hono auth: PostHog signup tracking, Resend contact creation, `resendContactId` additional user field
- Hooks are dispatched via BullMQ as a **combined `user-signup` job** (non-blocking) inside the Better Auth `user.create` callback — never synchronous in the auth path
- Job payload: `{ userId, email }` — handler does PostHog identify + Resend contact creation
- Job type definition goes in `@kubeasy/jobs` package (new queue: `user-lifecycle` or similar)
- `resendContactId` declared as `additionalFields` in Better Auth config — column is confirmed present on `apps/api/src/db/schema/auth.ts` user table (`resend_contact_id`)
- API production URL: `https://api.kubeasy.dev` — Better Auth `baseURL` updated to this
- OAuth callback URIs: `https://api.kubeasy.dev/api/auth/callback/{github,google,microsoft}`
- Local dev: `http://localhost:3001` (already configured in Phase 2)
- `crossSubdomainCookies: { enabled: true, domain: ".kubeasy.dev" }` — already locked in STATE.md
- `oAuthProxy` plugin dropped entirely — no Vercel preview deployments, moving to Railway
- `trustedOrigins` updated to: `["http://localhost:3000", "http://localhost:3001", "https://kubeasy.dev", "https://api.kubeasy.dev"]`
- `*.vercel.app` wildcard removed
- `apiKey()` plugin from `@better-auth/api-key` activated in Better Auth config
- A Hono middleware validates `Authorization: Bearer <key>` on CLI routes (`/api/cli/*`)
- On valid key: injects `user` into `c.var` (same shape as session middleware)
- On missing/invalid key: returns 401
- Add `User-Agent` to `allowHeaders` in the CORS middleware
- AUTH-06 deferred to Phase 4 — `apps/web` (TanStack Start) doesn't exist in Phase 3
- Phase 3 plan breakdown: 03-01, 03-02, 03-03 only (no 03-04)

### Claude's Discretion

- BullMQ queue name for user lifecycle jobs (e.g. `user-lifecycle`)
- Error handling if BullMQ dispatch fails (don't fail the auth callback — log and continue)
- API key middleware: whether to share the middleware with `sessionMiddleware` or keep it separate

### Deferred Ideas (OUT OF SCOPE)

- AUTH-06 (apps/web Better Auth client — `createAuthClient` pointing to `api.kubeasy.dev`) — moved to Phase 4
- `apiKey` router (CRUD for API keys from web UI) — already deferred from Phase 2, still Phase 3 backend only (plugin enables the endpoints automatically)
- `emailPreference` and `onboarding` routers — still deferred
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Better Auth configured in `apps/api` with Drizzle adapter, handler on `GET/POST /api/auth/*` | Already done in Phase 2 — handler mounted, adapter wired. Phase 3 extends the existing config. |
| AUTH-02 | OAuth providers GitHub, Google, Microsoft configured in Better Auth côté API | `socialProviders` block added to `apps/api/src/lib/auth.ts`. Exact `redirectURI` values documented below. |
| AUTH-03 | `@hono/cors` configured before Better Auth handler with `credentials: true` and trusted origins listed | CORS already in `app.ts`. Phase 3 only adds `User-Agent` to `allowHeaders` and removes `*.vercel.app`. |
| AUTH-04 | `apiKey()` Better Auth plugin activated — users can create, list, revoke API keys | `@better-auth/api-key` installed in root `package.json`. Must be added to `apps/api/package.json`. Plugin exposes REST endpoints automatically under `/api/auth/api-key/**`. |
| AUTH-05 | Hono middleware validates `Authorization: Bearer <key>` on CLI routes, injects user into `c.var` | `auth.api.verifyApiKey({ body: { key } })` returns `{ valid, key, error }`. Middleware follows `sessionMiddleware` pattern in `apps/api/src/middleware/session.ts`. |
| AUTH-06 | Deferred to Phase 4 | Not researched (out of scope). |
</phase_requirements>

---

## Summary

Phase 3 extends the existing Hono Better Auth config (scaffolded in Phase 2) with three concrete additions: OAuth providers for web login, cross-subdomain session cookies for the `kubeasy.dev` domain split, and the API key plugin for CLI authentication.

The existing `apps/api/src/lib/auth.ts` is a clean base with just the Drizzle adapter and `admin()` plugin. Everything in Phase 3 is additive: append `socialProviders`, `crossSubdomainCookies`, `additionalFields`, a `user.create` BullMQ hook, and the `apiKey()` plugin. The CORS fix in `app.ts` is a one-liner (`allowHeaders` array update). The API key middleware is a new file that mirrors `session.ts` exactly.

The `resend_contact_id` column is confirmed present in `apps/api/src/db/schema/auth.ts` — no schema migration needed. The `@kubeasy/jobs` package is already a dependency in `apps/api/package.json` — just add the new queue name + payload type. The only new package dependency is `@better-auth/api-key` which needs to be added to `apps/api/package.json` (it is in the root `package.json` at `1.5.5`).

**Primary recommendation:** All Phase 3 changes are isolated to four files — `apps/api/src/lib/auth.ts`, `apps/api/src/app.ts`, a new `apps/api/src/middleware/api-key.ts`, and `packages/jobs/src/` (queue name + payload). No DB migrations required.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `better-auth` | 1.5.5 | Auth server — OAuth, sessions, plugins | Already installed in `apps/api` |
| `@better-auth/api-key` | 1.5.5 | API key plugin (separate package) | Already installed in workspace root; must add to `apps/api` |
| `@better-auth/drizzle-adapter` | 1.5.5 | Drizzle ORM adapter for Better Auth | Already installed in `apps/api` |
| `bullmq` | ^5.71.0 | Job queue for async user lifecycle hooks | Already in `@kubeasy/jobs` package |
| `ioredis` | ^5.6.1 | Redis client for BullMQ connection | Already installed in `apps/api` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `hono/cors` | built-in | CORS middleware | Already mounted in `app.ts` — update `allowHeaders` only |
| `hono/factory` | built-in | `createMiddleware` for typed Hono middleware | Follow existing `session.ts` pattern for API key middleware |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@better-auth/api-key` | Custom JWT/HMAC | `@better-auth/api-key` integrates with Better Auth DB and user model — no custom token storage or rotation logic |
| BullMQ fire-and-forget for hooks | Inline `await` in auth callback | Inline awaits block the OAuth flow — BullMQ ensures auth completes regardless of email/analytics failures |

**Installation (add to `apps/api`):**
```bash
pnpm --filter @kubeasy/api add @better-auth/api-key@1.5.5
```

---

## Architecture Patterns

### Recommended File Layout for Phase 3 Changes

```
apps/api/src/
├── lib/
│   └── auth.ts              # ADD: socialProviders, crossSubdomainCookies,
│                            #      additionalFields, user.create hook, apiKey()
├── app.ts                   # UPDATE: allowHeaders += "User-Agent",
│                            #         trustedOrigins cleanup
└── middleware/
    ├── session.ts           # NO CHANGE — reference pattern for api-key.ts
    └── api-key.ts           # NEW: Bearer token validation middleware

packages/jobs/src/
├── queue-names.ts           # ADD: USER_LIFECYCLE = "user-lifecycle"
├── payloads.ts              # ADD: UserSignupPayload interface + JobPayload entry
└── index.ts                 # ADD: export UserSignupPayload, USER_LIFECYCLE
```

### Pattern 1: socialProviders in Hono Better Auth

**What:** Add OAuth providers to `apps/api/src/lib/auth.ts` following the same shape as the existing Next.js `lib/auth.ts`.
**When to use:** AUTH-02

```typescript
// Source: lib/auth.ts (existing Next.js config — canonical reference)
// apps/api/src/lib/auth.ts — add to betterAuth({...})
socialProviders: {
  github: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    redirectURI: `${process.env.API_URL ?? "http://localhost:3001"}/api/auth/callback/github`,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectURI: `${process.env.API_URL ?? "http://localhost:3001"}/api/auth/callback/google`,
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    redirectURI: `${process.env.API_URL ?? "http://localhost:3001"}/api/auth/callback/microsoft`,
  },
},
```

**Production value of `API_URL`:** `https://api.kubeasy.dev`

### Pattern 2: crossSubdomainCookies + trustedOrigins cleanup

**What:** Enable cookie sharing across `kubeasy.dev` subdomains, remove Vercel wildcard.
**When to use:** AUTH-02, AUTH-03 (cookie requirement implied by cross-domain session)

```typescript
// Source: https://better-auth.com/docs/concepts/cookies
// apps/api/src/lib/auth.ts
trustedOrigins: [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://kubeasy.dev",
  "https://api.kubeasy.dev",
],
advanced: {
  crossSubDomainCookies: {
    enabled: true,
    domain: ".kubeasy.dev",
  },
},
```

**Note:** The config key is `advanced.crossSubDomainCookies` (capital D) — confirmed from official docs. The STATE.md uses `crossSubdomainCookies` (lowercase d) — verify against official docs at implementation time. Official docs URL: https://better-auth.com/docs/concepts/cookies

### Pattern 3: apiKey plugin + additionalFields

**What:** Activate the API key plugin and declare the `resendContactId` additional field.
**When to use:** AUTH-04

```typescript
// Source: https://better-auth.com/docs/plugins/api-key + existing lib/auth.ts
import { apiKey } from "@better-auth/api-key";
import { admin } from "better-auth/plugins";

// In betterAuth({ plugins: [...] })
plugins: [
  admin(),
  apiKey({
    rateLimit: {
      enabled: false, // See lib/auth.ts note: built-in rate limit doesn't work programmatically
    },
  }),
],
user: {
  additionalFields: {
    resendContactId: {
      type: "string",
      required: false,
      input: false,
    },
  },
},
```

**DB schema:** `resend_contact_id` column confirmed present in `apps/api/src/db/schema/auth.ts` line 26 — no migration needed.

### Pattern 4: user.create BullMQ hook (fire-and-forget)

**What:** Dispatch a `user-lifecycle` BullMQ job inside `databaseHooks.user.create.after` without blocking the auth flow.
**When to use:** AUTH-01 (user lifecycle on signup)

```typescript
// Source: apps/api/src/lib/auth.ts + packages/jobs/src/factory.ts pattern
// Dispatch is fire-and-forget — queue.add() result is NOT awaited
import { createQueue, QUEUE_NAMES } from "@kubeasy/jobs";
import { redis } from "../lib/redis.js";

const userLifecycleQueue = createQueue(QUEUE_NAMES.USER_LIFECYCLE, {
  host: redis.options.host,
  port: redis.options.port,
});

databaseHooks: {
  user: {
    create: {
      after: async (user) => {
        try {
          userLifecycleQueue.add("user-signup", {
            userId: user.id,
            email: user.email,
          });
          // NOTE: no await — fire and forget
        } catch (error) {
          console.error("[auth] user-lifecycle job dispatch failed", error);
          // Never throw — auth must complete regardless
        }
      },
    },
  },
},
```

**Note on existing Next.js hooks:** The existing `lib/auth.ts` uses two separate `databaseHooks` — `user.create.after` for Resend and `account.create.after` for PostHog (because providerId isn't available at `user.create` time). The CONTEXT.md decision merges both into a single `user-signup` job. The job handler must read providerId from the DB itself if PostHog tracking needs it — or accept that Phase 3 backend just dispatches the job and the handler logic is defined separately.

### Pattern 5: API key middleware (AUTH-05)

**What:** Hono middleware that validates `Authorization: Bearer <key>` and injects `user` into `c.var`.
**When to use:** Applied to `/api/cli/*` routes

```typescript
// Source: apps/api/src/middleware/session.ts (pattern)
//         https://better-auth.com/docs/plugins/api-key
import { createMiddleware } from "hono/factory";
import { auth } from "../lib/auth.js";

export const apiKeyMiddleware = createMiddleware<{
  Variables: {
    user: SessionUser | null;
    session: null;
  };
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const key = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (!key) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const result = await auth.api.verifyApiKey({ body: { key } });

  if (!result.valid || !result.key) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Fetch user from DB using result.key.userId (referenceId post-1.5 rename)
  // Inject into c.var to match sessionMiddleware shape
  c.set("user", /* fetched user */ );
  c.set("session", null);
  await next();
});
```

**Key API surface (HIGH confidence — verified from official docs):**
- `auth.api.verifyApiKey({ body: { key: string } })` returns `{ valid: boolean, key: ApiKey | null, error: { message, code } | null }`
- The `key` object contains `referenceId` (userId) — renamed from `userId` in recent versions (1.5.x)
- Must fetch full user object from DB after key verification (verifyApiKey returns key metadata, not full user)

### Pattern 6: CORS `allowHeaders` update

**What:** Add `User-Agent` to `allowHeaders` in `app.ts`.
**When to use:** AUTH-03 success criterion 5

```typescript
// apps/api/src/app.ts — update cors() call
cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "https://kubeasy.dev"],
  allowHeaders: ["Content-Type", "Authorization", "User-Agent"],  // ADD User-Agent
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}),
```

### Pattern 7: @kubeasy/jobs extension

**What:** Add `USER_LIFECYCLE` queue name and `UserSignupPayload` type to the jobs package.
**When to use:** Required before auth.ts can import from `@kubeasy/jobs`

```typescript
// packages/jobs/src/queue-names.ts — add entry
export const QUEUE_NAMES = {
  CHALLENGE_SUBMISSION: "challenge-submission",
  XP_AWARD: "xp-award",
  USER_LIFECYCLE: "user-lifecycle",    // ADD
} as const;

// packages/jobs/src/payloads.ts — add interface + JobPayload entry
export interface UserSignupPayload {
  userId: string;
  email: string;
}

export type JobPayload = {
  [K in typeof QUEUE_NAMES.CHALLENGE_SUBMISSION]: ChallengeSubmissionPayload;
} & {
  [K in typeof QUEUE_NAMES.XP_AWARD]: XpAwardPayload;
} & {
  [K in typeof QUEUE_NAMES.USER_LIFECYCLE]: UserSignupPayload;   // ADD
};

// packages/jobs/src/index.ts — add exports
export type { UserSignupPayload } from "./payloads";
```

### Anti-Patterns to Avoid

- **Awaiting BullMQ dispatch in auth hooks:** Blocks the OAuth callback. Always fire-and-forget inside `databaseHooks`.
- **Inline Resend/PostHog calls in auth callback:** Same problem — network latency in the auth path causes timeouts. Move all side-effects to the BullMQ job handler.
- **`oAuthProxy` plugin:** Dropped entirely — do not import or use.
- **Using `auth.api.verifyApiKey` without extracting `referenceId`:** The key object has `referenceId` (not `userId`) as of better-auth 1.5+. Must verify field name at implementation time.
- **Creating the BullMQ Queue object per request:** Initialize `userLifecycleQueue` at module level (singleton), not inside the hook callback.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth callback handling | Custom state/PKCE logic | `auth.handler()` + `socialProviders` config | OAuth state management, CSRF prevention, token exchange are all handled by Better Auth |
| Cookie scoping across subdomains | Manual `Set-Cookie` domain attribute | `crossSubDomainCookies` in Better Auth | Better Auth manages cookie rotation, refresh, and expiry across all auth endpoints |
| API key storage + verification | Custom DB table + constant-time comparison | `apiKey()` plugin | Plugin handles secure key hashing, rate limiting config, expiry, and the `apikey` table is already in the migrated schema |
| User lifecycle side-effects | Inline `await` in auth hooks | BullMQ `user-lifecycle` queue | Decouples auth latency from email/analytics APIs; retry on failure |

---

## Common Pitfalls

### Pitfall 1: `crossSubDomainCookies` key capitalization

**What goes wrong:** Config uses `crossSubdomainCookies` (lowercase d) vs official docs `crossSubDomainCookies` (capital D in Domain).
**Why it happens:** STATE.md and CONTEXT.md use lowercase `d` but Better Auth's TypeScript types use `crossSubDomainCookies`.
**How to avoid:** At implementation time, rely on TypeScript autocomplete from the installed `better-auth` package — the TS type will reject wrong key names. Check `node_modules/better-auth/dist/types.d.ts` if unsure.
**Warning signs:** TypeScript error on the property key; cookies not being set with the `.kubeasy.dev` domain attribute.

### Pitfall 2: API key `referenceId` vs `userId`

**What goes wrong:** Accessing `result.key.userId` after `verifyApiKey` returns undefined.
**Why it happens:** Better Auth 1.5 renamed the field from `userId` to `referenceId` on the ApiKey object.
**How to avoid:** Use `result.key.referenceId` to get the user ID, then query the user table.
**Warning signs:** `undefined` user injected into `c.var`; subsequent `requireAuth` returning 401 for valid API keys.

### Pitfall 3: `@better-auth/api-key` not in `apps/api/package.json`

**What goes wrong:** Import of `apiKey` from `@better-auth/api-key` resolves from workspace root, not `apps/api` node_modules — may fail in production Docker image or with pnpm hoisting.
**Why it happens:** Package is installed in root `package.json` (for the Next.js app) but not declared in `apps/api/package.json`.
**How to avoid:** Run `pnpm --filter @kubeasy/api add @better-auth/api-key@1.5.5` before implementing.
**Warning signs:** TypeScript type errors in `apps/api`, runtime "Cannot find module" in built Docker image.

### Pitfall 4: BullMQ Queue instantiated inside auth hook

**What goes wrong:** A new `Queue` object is created on every user signup — Redis connection leak.
**Why it happens:** `createQueue()` opens a Redis connection per call.
**How to avoid:** Initialize `userLifecycleQueue` at module top-level in `auth.ts`, not inside the `databaseHooks` callback.
**Warning signs:** Redis connection count grows over time; eventual EMFILE errors.

### Pitfall 5: CORS origin list missing `api.kubeasy.dev`

**What goes wrong:** Browser fetch from `kubeasy.dev` to `api.kubeasy.dev` blocked by CORS — `trustedOrigins` allows the web request but `cors()` middleware in `app.ts` also needs to list the origin.
**Why it happens:** Two separate lists must be kept in sync: `trustedOrigins` in Better Auth config and `origin` in `cors()` middleware.
**How to avoid:** Update both `trustedOrigins` (Better Auth) and `origin` (cors middleware in `app.ts`) in the same commit.
**Warning signs:** Preflight 403; CORS error in browser console even after Better Auth config update.

### Pitfall 6: Existing Next.js auth uses two databaseHooks; Phase 3 merges to one

**What goes wrong:** PostHog signup tracking in the existing code runs in `account.create.after` (not `user.create.after`) because `providerId` is needed. Merging into `user.create` BullMQ job means the job handler won't have `providerId` unless it queries the DB.
**Why it happens:** Better Auth creates user first, then account — `providerId` is only available after account creation.
**How to avoid:** The job handler in a future worker must query the `account` table for `providerId`. The job payload `{ userId, email }` is intentionally minimal. Document this in the job handler's code comment.
**Warning signs:** PostHog events missing provider info — not a blocking auth bug, just an analytics gap.

---

## Code Examples

### Full auth.ts diff (what Phase 3 adds)

```typescript
// Source: apps/api/src/lib/auth.ts — Phase 3 additions
import { apiKey } from "@better-auth/api-key";       // NEW
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { createQueue, QUEUE_NAMES } from "@kubeasy/jobs";  // NEW
import { db } from "../db/index.js";
import * as schema from "../db/schema/auth.js";
import { redis } from "../lib/redis.js";              // NEW

// NEW: module-level queue singleton
const userLifecycleQueue = createQueue(QUEUE_NAMES.USER_LIFECYCLE, {
  host: redis.options.host,
  port: redis.options.port,
});

export const auth = betterAuth({
  baseURL: process.env.API_URL ?? "http://localhost:3001",
  trustedOrigins: [                                   // UPDATED
    "http://localhost:3000",
    "http://localhost:3001",
    "https://kubeasy.dev",
    "https://api.kubeasy.dev",
  ],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  plugins: [
    admin(),
    apiKey({ rateLimit: { enabled: false } }),        // NEW
  ],
  user: {                                             // NEW
    additionalFields: {
      resendContactId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  advanced: {                                         // NEW
    crossSubDomainCookies: {
      enabled: true,
      domain: ".kubeasy.dev",
    },
  },
  session: {
    cookieCache: { enabled: true, maxAge: 60 * 60 * 24 * 7 },
  },
  socialProviders: {                                  // NEW
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      redirectURI: `${process.env.API_URL ?? "http://localhost:3001"}/api/auth/callback/github`,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURI: `${process.env.API_URL ?? "http://localhost:3001"}/api/auth/callback/google`,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      redirectURI: `${process.env.API_URL ?? "http://localhost:3001"}/api/auth/callback/microsoft`,
    },
  },
  databaseHooks: {                                    // NEW
    user: {
      create: {
        after: async (user) => {
          try {
            userLifecycleQueue.add("user-signup", {
              userId: user.id,
              email: user.email,
            });
          } catch (error) {
            console.error("[auth] user-lifecycle dispatch failed", error);
          }
        },
      },
    },
  },
});
```

### API key middleware (`apps/api/src/middleware/api-key.ts`)

```typescript
// Source: session.ts pattern + https://better-auth.com/docs/plugins/api-key
import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { db } from "../db/index.js";
import { user as userTable } from "../db/schema/auth.js";
import { auth } from "../lib/auth.js";
import type { SessionUser } from "./session.js";

export const apiKeyMiddleware = createMiddleware<{
  Variables: {
    user: SessionUser | null;
    session: null;
  };
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const key = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (!key) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const result = await auth.api.verifyApiKey({ body: { key } });

  if (!result.valid || !result.key) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // result.key.referenceId is the userId (renamed from userId in better-auth 1.5+)
  const [foundUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, result.key.referenceId))
    .limit(1);

  c.set("user", foundUser ?? null);
  c.set("session", null);
  await next();
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `oAuthProxy` plugin for Vercel previews | Dropped — Railway deployment has fixed URLs | Phase 3 decision | Simpler `trustedOrigins`, no proxy redirect logic |
| Inline Resend + PostHog calls in auth hooks | BullMQ `user-lifecycle` job | Phase 3 decision | Auth latency decoupled from email/analytics APIs |
| `userId` field on ApiKey object | `referenceId` field | better-auth 1.5.x | All middleware must use `referenceId` to look up user |
| `account.create.after` for PostHog (needs providerId) | `user.create.after` dispatching a job | Phase 3 decision | Job handler reads providerId from DB asynchronously |

**Confirmed not needed / deprecated for this project:**
- `oAuthProxy`: Dropped (Railway, not Vercel)
- `better-all` package (used in old Next.js `getServerSession`): Not applicable on Hono
- Neon serverless driver: Already replaced by postgres.js in Phase 2

---

## Open Questions

1. **`crossSubDomainCookies` exact config key capitalization**
   - What we know: Official docs use `crossSubDomainCookies` (capital D); CONTEXT.md/STATE.md use `crossSubdomainCookies` (lowercase d)
   - What's unclear: Whether the TypeScript type in better-auth 1.5.5 uses camelCase `Domain` or lowercase
   - Recommendation: At implementation time, check TypeScript autocomplete from the installed package. If both forms work as aliases, use the TypeScript-inferred name.

2. **BullMQ queue connection from `redis` module**
   - What we know: `apps/api/src/lib/redis.ts` creates an `ioredis` Redis instance. `createQueue` in `@kubeasy/jobs` accepts `ConnectionOptions` (not an ioredis instance directly).
   - What's unclear: Whether `redis.options.host` and `redis.options.port` are always populated when Redis is configured via `REDIS_URL`.
   - Recommendation: Pass `{ url: process.env.REDIS_URL ?? "redis://localhost:6379" }` as the ConnectionOptions directly — simpler and guaranteed to work.

3. **`apiKey()` rateLimit behavior with programmatic `verifyApiKey`**
   - What we know: The existing Next.js `lib/auth.ts` has a comment: "Rate limiting disabled because Better Auth's built-in rate limiting only works with Better Auth's built-in endpoints (`/api-key/verify`), not when calling `auth.api.verifyApiKey()` programmatically."
   - What's unclear: Whether this is fixed in 1.5.5 vs the version the comment was written for.
   - Recommendation: Keep `rateLimit: { enabled: false }` for now (matching existing decision). The submit endpoint already has Hono-level rate limiting via `slidingWindowRateLimit`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `apps/api/vitest.config.ts` |
| Quick run command | `pnpm --filter @kubeasy/api test:run` |
| Full suite command | `pnpm --filter @kubeasy/api test:run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | `GET /api/auth/session` returns 200 (handler mounted) | smoke | `pnpm --filter @kubeasy/api test:run -- --reporter=verbose` | ❌ Wave 0 |
| AUTH-02 | OAuth providers configured (no runtime test — manual OAuth flow) | manual-only | N/A — requires browser + OAuth provider | N/A |
| AUTH-03 | Preflight with `User-Agent` header returns 200, not 403 | unit | `pnpm --filter @kubeasy/api test:run` | ❌ Wave 0 |
| AUTH-04 | `apiKey()` plugin exposes `/api/auth/api-key/**` endpoints | smoke | `pnpm --filter @kubeasy/api test:run` | ❌ Wave 0 |
| AUTH-05 | Bearer token middleware returns 401 on missing/invalid key, injects user on valid key | unit | `pnpm --filter @kubeasy/api test:run` | ❌ Wave 0 |
| AUTH-05 | `/api/cli/*` route rejects session cookie auth (only API key) | unit | `pnpm --filter @kubeasy/api test:run` | ❌ Wave 0 |

**Manual-only justification for AUTH-02:** OAuth provider flows require browser redirect + real OAuth app credentials — cannot be unit tested. Verify manually on staging environment.

### Sampling Rate
- **Per task commit:** `pnpm --filter @kubeasy/api test:run`
- **Per wave merge:** `pnpm --filter @kubeasy/api test:run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/__tests__/auth.test.ts` — covers AUTH-01 (handler mounted), AUTH-03 (CORS preflight with User-Agent), AUTH-04 (apiKey plugin endpoints discoverable)
- [ ] `apps/api/src/__tests__/api-key-middleware.test.ts` — covers AUTH-05 (Bearer token validation, 401 on missing/invalid, user injection on valid)

*(Existing test files `middleware.test.ts`, `cli.test.ts`, `submit.test.ts` all have `.todo` stubs — no implementation yet. Framework is fully configured.)*

---

## Sources

### Primary (HIGH confidence)
- `apps/api/src/lib/auth.ts` — Existing Hono auth config (Phase 2 output, source of truth for what exists)
- `lib/auth.ts` — Existing Next.js auth config with full `socialProviders`, `apiKey()`, `additionalFields`, hooks — canonical migration reference
- `apps/api/src/middleware/session.ts` — Established Hono middleware pattern
- `apps/api/src/db/schema/auth.ts` — Confirmed `resend_contact_id` column at line 26
- `packages/jobs/src/` — Existing queue factory and payload patterns
- https://better-auth.com/docs/plugins/api-key — `verifyApiKey` API signature confirmed
- https://better-auth.com/docs/concepts/cookies — `crossSubDomainCookies` config structure confirmed
- https://better-auth.com/docs/integrations/hono — Hono session middleware pattern confirmed

### Secondary (MEDIUM confidence)
- https://better-auth.com/docs/reference/options — `trustedOrigins` and `baseURL` config
- https://better-auth.com/blog/1-5 — `referenceId` rename from `userId` on ApiKey object

### Tertiary (LOW confidence)
- GitHub issue https://github.com/better-auth/better-auth/issues/6258 — `verifyApiKey` returning "Invalid API key" errors (known issue, mentioned as context for why rate limiting is disabled)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages verified in existing `package.json` files
- Architecture: HIGH — all patterns derived from existing codebase files, not hypothetical
- Pitfalls: HIGH (key capitalization, referenceId rename) / MEDIUM (BullMQ connection URL form)
- API surface: HIGH — verified against official Better Auth docs via WebFetch

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (Better Auth 1.5.x is stable; API key plugin API unlikely to change)
