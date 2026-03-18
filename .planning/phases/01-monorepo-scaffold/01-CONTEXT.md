# Phase 1: Monorepo Scaffold - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the Turborepo + pnpm workspace structure, create shared packages (`@kubeasy/api-schemas`, `@kubeasy/jobs`, `@kubeasy/typescript-config`), and bring up local dev infra via docker-compose (PostgreSQL, Redis, OTel Collector). The current Next.js app is NOT moved — it stays at the repo root. No app code is written in this phase.

</domain>

<decisions>
## Implementation Decisions

### Repo Restructuring Strategy
- The current Next.js 15 app stays at the repo root throughout Phase 1 — no file moves
- Phase 1 only creates `packages/` structure and root monorepo config files (turbo.json, updated pnpm-workspace.yaml, biome.json)
- `apps/api` is created fresh in Phase 2 (Hono API Migration)
- The Next.js app moves to `apps/web` in Phase 4 (Web Migration) — not before
- Root Next.js app IS included as a workspace member in pnpm-workspace.yaml (adds `.` to packages list so it can consume `@kubeasy/*` packages via workspace protocol)
- No `apps/` directory created in Phase 1

### api-schemas Content Scope
- Full coverage NOW — all existing tRPC procedure shapes ported to Zod in Phase 1
- Domains covered: challenges, themes, progress, XP, submissions, auth
- One file per domain: `schemas/challenges.ts`, `schemas/themes.ts`, `schemas/progress.ts`, `schemas/xp.ts`, `schemas/submissions.ts`, `schemas/auth.ts`
- Zod schemas only — NO route path constants (those live in apps/api and apps/web separately)
- JIT strategy: TypeScript source exported directly, no `dist/` build step (already decided)

### @kubeasy/jobs Package Scope
- Exports: BullMQ queue names, `JobPayload` types, `createQueue(name, redis)` factory
- No `Worker` implementation — just dispatch-side definitions
- No imports from any `apps/` package (strict unidirectional dependency)

### docker-compose Infra
- Three services: PostgreSQL, Redis, OTel Collector
- Named volumes: `postgres_data` and `redis_data` — data persists across restarts
- OTel Collector: debug exporter (stdout) ONLY for local dev — no real backend configured in Phase 1
- OTel Collector ports: `4317` (gRPC OTLP), `4318` (HTTP OTLP), `55679` (zpages debug UI)

### Biome/Tooling Config Structure
- Single root `biome.json` with shared rules — packages/apps extend it via `extends: ['../../biome.json']`
- Existing biome.json is preserved and becomes the monorepo root config
- `packages/typescript-config` provides three configs: `base.json` (strict shared), `node.json` (for apps/api — no DOM, nodenext/commonjs module), `react.json` (for apps/web — jsx, bundler resolution)
- `turbo.json` defines all four pipelines from the start: `build`, `typecheck`, `dev`, `lint`
- Turborepo pipeline respects `dependsOn: ["^build"]` so packages compile before apps

### Turbo env vars
- `envMode: "loose"` for Phase 1 only (declared in STATE.md decision) — must switch to strict before Phase 7 Railway deploy
- Declared env vars in cache key inputs: `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`

### Claude's Discretion
- Exact Zod schema field names (should mirror existing tRPC types in `server/api/routers/`)
- Node.js version in `.nvmrc` / `engines` field
- OTel Collector config file name and location (e.g. `docker/otel-collector-config.yaml` or root level)
- Exact postgres and redis image versions in docker-compose
- Whether to add a root `dev` script that orchestrates docker-compose + Next.js dev server

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing tRPC shapes (for api-schemas port)
- `server/api/routers/challenge.ts` — All challenge queries/mutations to port to Zod schemas
- `server/api/routers/theme.ts` — Theme queries
- `server/api/routers/userProgress.ts` — Progress tracking, submitChallenge, getLatestValidationStatus
- `server/api/routers/xpTransaction.ts` — XP balance and history
- `server/api/root.ts` — appRouter shape overview

### Existing DB schema (for @kubeasy/jobs types alignment)
- `server/db/schema/challenge.ts` — Challenge, userProgress, userSubmission, xpTransaction, challengeObjective tables
- `server/db/schema/auth.ts` — User, session, account tables

### Requirements
- `.planning/REQUIREMENTS.md` §INFRA-01 through PKG-04 — All Phase 1 requirements

### Existing config to restructure
- `biome.json` — Root config to preserve and extend for monorepo
- `tsconfig.json` — Existing TS config, base for packages/typescript-config/react.json
- `pnpm-workspace.yaml` — Must be updated to add workspace packages

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/api/routers/*.ts`: These are the source of truth for what `@kubeasy/api-schemas` must cover — read each router to extract input/output shapes
- `biome.json`: Already well-configured (Tailwind CSS 4 at-rules, warn-not-error for array index keys) — preserve all rules, just convert to monorepo root config
- `tsconfig.json`: Current `module: "esnext"` + `moduleResolution: "bundler"` settings become the basis for `react.json` in typescript-config package
- `pnpm-workspace.yaml`: Exists but only has `onlyBuiltDependencies` — needs `packages:` array added with `'packages/*'` and `'.'` (root)

### Established Patterns
- Zod already used throughout (`schemas/challengeFilters.ts`, tRPC input validation) — @kubeasy/api-schemas follows same Zod style
- `env.js` uses `@t3-oss/env-nextjs` — Phase 1 doesn't touch this, but packages/ should not depend on it
- Biome linting already enforced via Husky pre-commit hooks — monorepo should preserve this

### Integration Points
- Root `package.json` becomes the monorepo root — `name: "kubeasy-monorepo"` (private), scripts updated to `turbo run ...`
- Root Next.js app is workspace member — it can `import { ChallengeSchema } from '@kubeasy/api-schemas'` after Phase 1

</code_context>

<specifics>
## Specific Ideas

No specific references beyond decisions above — open to standard Turborepo monorepo patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-monorepo-scaffold*
*Context gathered: 2026-03-18*
