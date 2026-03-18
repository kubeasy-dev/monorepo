---
phase: 01-monorepo-scaffold
plan: 01
subsystem: scaffold
tags: [turborepo, pnpm-workspaces, typescript-config, monorepo]
dependency_graph:
  requires: []
  provides:
    - turbo pipeline configuration (build, typecheck, dev, lint)
    - pnpm workspace package discovery (packages/*, apps/*)
    - "@kubeasy/typescript-config shared package"
  affects:
    - all future packages and apps (inherit TypeScript presets)
    - CI pipelines (turbo task orchestration)
tech_stack:
  added:
    - turbo ^2.8.17
  patterns:
    - Turborepo v2 tasks key (not pipeline) with dependsOn dependency ordering
    - pnpm workspace protocol for internal package references
    - TypeScript config inheritance via extends
key_files:
  created:
    - turbo.json
    - packages/typescript-config/package.json
    - packages/typescript-config/base.json
    - packages/typescript-config/node.json
    - packages/typescript-config/react.json
  modified:
    - pnpm-workspace.yaml
    - package.json
decisions:
  - "envMode: loose in turbo.json for Phase 1 only — must switch to strict with declared env vars before Phase 7 Railway deploy"
  - "Root package renamed to kubeasy-monorepo to prevent Turborepo treating root as regular app"
  - "packages/apps/* workspace globs declared without physical apps/ directory (Phase 1 intent-only)"
  - "base.json targets ES2022, react.json overrides to ES2017 for browser compatibility"
metrics:
  duration: 3
  completed_date: "2026-03-18"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 3
---

# Phase 1 Plan 1: Monorepo Scaffold Summary

**One-liner:** Turborepo v2 monorepo scaffold with pnpm workspace discovery and three-preset TypeScript config package (@kubeasy/typescript-config: base/node/react)

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create turbo.json, update pnpm-workspace.yaml, update root package.json | e66845c1a | turbo.json, pnpm-workspace.yaml, package.json |
| 2 | Create packages/typescript-config with base, node, react presets | 6741b1f59 | packages/typescript-config/{package,base,node,react}.json, pnpm-lock.yaml |

## What Was Built

### turbo.json
Turborepo v2 configuration defining four pipelines:
- `build`: depends on `^build`, outputs `.next/**` and `dist/**`
- `typecheck`: depends on `^typecheck` for cross-package type validation
- `dev`: cache=false, persistent=true for watch mode
- `lint`: depends on `^lint`

`envMode: "loose"` with `globalEnv` for `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET` as cache key inputs.

### pnpm-workspace.yaml
Updated to declare workspace globs:
- `.` (root, explicit per locked decision)
- `packages/*` (shared libraries)
- `apps/*` (future apps, Phase 2+)

Preserved `onlyBuiltDependencies` list from original.

### root package.json
- Renamed from `kubeasy` to `kubeasy-monorepo`
- Added `turbo ^2.8.17` to devDependencies
- Added `turbo:build`, `turbo:typecheck`, `turbo:lint`, `dev:infra` scripts
- All original scripts and dependencies preserved

### packages/typescript-config
Three tsconfig presets:
- `base.json`: strict ES2022, bundler moduleResolution, noEmit — foundation for all packages
- `node.json`: extends base, adds NodeNext module resolution for Hono API package
- `react.json`: extends base, adds react-jsx and overrides target to ES2017 for browser compat

Package uses `exports` map (not `main`) for modern package resolution.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `turbo.json` valid JSON with all 4 pipelines and correct `dependsOn` values
- `pnpm-workspace.yaml` contains `packages/*` and `apps/*` globs with preserved `onlyBuiltDependencies`
- `package.json` name is `kubeasy-monorepo` with `turbo` in devDependencies
- `packages/typescript-config/` has all 4 files: package.json, base.json, node.json, react.json
- `pnpm install` completed successfully (turbo 2.8.17 installed)
- TypeScript check passes (pre-commit hook verified)

## Self-Check: PASSED

- turbo.json: FOUND
- packages/typescript-config/package.json: FOUND
- packages/typescript-config/base.json: FOUND
- packages/typescript-config/node.json: FOUND
- packages/typescript-config/react.json: FOUND
- commit e66845c1a: FOUND (chore(01-01): add turbo.json...)
- commit 6741b1f59: FOUND (feat(01-01): add packages/typescript-config...)
