# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Kubeasy is a platform for learning Kubernetes through interactive challenges. This is a **pnpm monorepo** orchestrated with **Turbo**.

## Monorepo Structure

```
apps/
  web/          # Frontend — Vite + React 19 + TanStack Router/Start
  api/          # Backend  — Hono.js + Drizzle ORM + BullMQ

packages/
  api-schemas/         # Shared Zod schemas and TypeScript types
  jobs/                # BullMQ job definitions (queue names, payloads, factory)
  logger/              # Shared Pino + OpenTelemetry logger
  typescript-config/   # Shared tsconfig base files
```

Each app/package has its own `CLAUDE.md` with detailed guidance.

## Top-Level Commands

```bash
# Install all dependencies
pnpm install

# Start both apps in dev mode (requires infra running)
pnpm dev

# Start local infrastructure (PostgreSQL + Redis via Docker)
pnpm dev:infra

# Build all apps
pnpm build

# Type-check the entire monorepo
pnpm typecheck

# Lint and format with Biome
pnpm check              # Check only
pnpm check:write        # Check and auto-fix
pnpm check:unsafe       # Check and auto-fix with unsafe fixes

# Run all tests
pnpm test
pnpm test:run           # Run once (no watch mode)

# Detect unused code
pnpm knip
```

## Key Rules

- **Package manager**: Always use `pnpm`. Never use `npm` or `yarn`.
- **Never run `pnpm build`** to verify code — it can break `pnpm dev`. Use `pnpm typecheck` instead.
- **Pre-commit hooks**: Husky runs Biome on staged files + full TypeScript check on every commit. Fix errors before committing or use `--no-verify` only as a last resort.

## Code Quality

- **Biome** handles linting and formatting (replaces ESLint + Prettier for most files)
- **lint-staged** runs Biome only on staged files for fast commits
- **TypeScript** strict mode across all packages

`lint-staged` config (in root `package.json`):
```json
"*.{js,jsx,ts,tsx,mjs,cjs}": ["biome check --write --unsafe --files-ignore-unknown=true --no-errors-on-unmatched"]
"*.{json,css}":               ["biome check --write --files-ignore-unknown=true --no-errors-on-unmatched"]
```

## Environment Variables

Create `.env` files in each app (see their respective CLAUDE.md). Key variables:

| Variable | Used by | Description |
|---|---|---|
| `DATABASE_URL` | `apps/api` | PostgreSQL connection string |
| `REDIS_URL` | `apps/api` | Redis connection URL (BullMQ) |
| `BETTER_AUTH_SECRET` | `apps/api` | Better Auth secret key |
| `API_URL` | `apps/api` | API base URL (Better Auth baseURL, OAuth redirect base — e.g. `https://api.kubeasy.dev`) |
| `GITHUB_CLIENT_ID/SECRET` | `apps/api` | GitHub OAuth |
| `GOOGLE_CLIENT_ID/SECRET` | `apps/api` | Google OAuth |
| `MICROSOFT_CLIENT_ID/SECRET` | `apps/api` | Microsoft OAuth |
| `RESEND_API_KEY` | `apps/api` | Transactional email |

## Turbo Pipeline

Defined in `turbo.json`:
- `build` — builds packages before apps (topological)
- `typecheck` — type-checks packages before apps (topological)
- `dev` — runs all apps concurrently (persistent, no cache)
- `start` — runs built apps (depends on `build`)

## Shared Packages

Packages are referenced via workspace protocol:
```json
"@kubeasy/api-schemas": "workspace:*"
```

No build step is needed for packages — apps import TypeScript source directly.
