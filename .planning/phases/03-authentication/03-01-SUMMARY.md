---
phase: 03-authentication
plan: "01"
subsystem: auth
tags: [better-auth, oauth, bullmq, cors, cookies]
dependency_graph:
  requires: ["03-00"]
  provides: ["03-02"]
  affects: ["apps/api/src/lib/auth.ts", "apps/api/src/app.ts", "packages/jobs"]
tech_stack:
  added: ["@better-auth/api-key@1.5.5"]
  patterns: ["crossSubDomainCookies", "BullMQ fire-and-forget hook", "module-level queue singleton"]
key_files:
  created: []
  modified:
    - packages/jobs/src/queue-names.ts
    - packages/jobs/src/payloads.ts
    - packages/jobs/src/index.ts
    - apps/api/src/lib/auth.ts
    - apps/api/package.json
    - apps/api/src/app.ts
decisions:
  - "BullMQ queue initialized as module-level singleton using redis.options (not redis.options.host/port) — ioredis RedisOptions equals BullMQ ConnectionOptions, avoids fragile URL parsing"
  - "oAuthProxy plugin dropped entirely — Railway deployment does not need Vercel preview proxying"
  - "databaseHooks user.create.after dispatches fire-and-forget BullMQ job, never throws to ensure auth completes regardless of job failure"
  - "trustedOrigins and CORS origin list kept in sync: localhost:3000, localhost:3001, kubeasy.dev, api.kubeasy.dev — no vercel.app wildcard"
metrics:
  duration: "1 min"
  completed_date: "2026-03-18"
  tasks_completed: 3
  files_modified: 6
---

# Phase 03 Plan 01: Better Auth Full Config — OAuth, Cookies, apiKey Plugin, BullMQ Hook

Better Auth configured in Hono API with GitHub/Google/Microsoft OAuth, cross-subdomain cookies for .kubeasy.dev, apiKey plugin for CLI auth, and fire-and-forget BullMQ user lifecycle hook using redis.options singleton.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add USER_LIFECYCLE queue and UserSignupPayload to @kubeasy/jobs | 3bf59217b | packages/jobs/src/queue-names.ts, payloads.ts, index.ts |
| 2 | Configure Better Auth with OAuth, cookies, apiKey plugin, and BullMQ hook | eb2f2277a | apps/api/src/lib/auth.ts, apps/api/package.json |
| 3 | Update CORS allowHeaders and origin list in app.ts | 9af9d6849 | apps/api/src/app.ts |

## Decisions Made

1. **redis.options singleton pattern**: BullMQ queue initialized at module level using `redis.options` directly. ioredis parses `REDIS_URL` into `RedisOptions` which is structurally compatible with BullMQ `ConnectionOptions`. This avoids fragile host/port extraction and is guaranteed correct across all URL formats.

2. **oAuthProxy removed**: The oAuthProxy plugin from better-auth/plugins was dropped entirely. The Hono API deploys to Railway (not Vercel), so there is no need for OAuth proxying through a production URL.

3. **Fire-and-forget BullMQ job**: The `databaseHooks.user.create.after` callback dispatches the user-lifecycle job without `await`. Errors are caught and logged but never rethrown, ensuring OAuth signup always completes even if Redis is temporarily unavailable.

4. **Synced origin lists**: `trustedOrigins` in auth.ts and `origin` in the CORS middleware are kept identical: `["http://localhost:3000", "http://localhost:3001", "https://kubeasy.dev", "https://api.kubeasy.dev"]`. No `*.vercel.app` wildcard.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `pnpm --filter @kubeasy/jobs typecheck` — PASS
- `pnpm --filter @kubeasy/api typecheck` — PASS
- `grep -r "oAuthProxy" apps/api/src/` — empty (correct)
- `grep "User-Agent" apps/api/src/app.ts` — match found (correct)
- `grep -r "vercel.app" apps/api/src/` — only in test stub it.todo comment (correct)
- `grep "USER_LIFECYCLE" packages/jobs/src/queue-names.ts` — match found (correct)
- `grep "redis.options.host" apps/api/src/lib/auth.ts` — empty (correct)

## Self-Check: PASSED

Files exist:
- apps/api/src/lib/auth.ts: FOUND
- apps/api/src/app.ts: FOUND
- packages/jobs/src/queue-names.ts: FOUND
- packages/jobs/src/payloads.ts: FOUND
- packages/jobs/src/index.ts: FOUND

Commits verified:
- 3bf59217b: FOUND
- eb2f2277a: FOUND
- 9af9d6849: FOUND
