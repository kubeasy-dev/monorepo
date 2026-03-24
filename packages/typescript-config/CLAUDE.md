# packages/typescript-config — CLAUDE.md

Shared TypeScript configuration files for all apps and packages in the monorepo.

## Purpose

Provides reusable `tsconfig.json` base configurations to ensure consistent TypeScript settings across the monorepo.

## Exports

| File | Use for |
|---|---|
| `base.json` | Generic base (all packages extend this) |
| `node.json` | Node.js apps (`apps/api`, server-side packages) |
| `react.json` | React apps (`apps/web`) |

## Usage

Extend in your `tsconfig.json`:

```json
// For a Node.js app (apps/api)
{
  "extends": "@kubeasy/typescript-config/node.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}

// For a React app (apps/web)
{
  "extends": "@kubeasy/typescript-config/react.json",
  "include": ["src"]
}

// For a shared package
{
  "extends": "@kubeasy/typescript-config/base.json",
  "include": ["src"]
}
```

## Key Rules

- **No build step, no scripts** — this package only contains JSON files.
- Changes here affect the entire monorepo — test `pnpm typecheck` from the root after modifying.
- Do not add app-specific settings here; keep configs generic and override in each app's `tsconfig.json`.
