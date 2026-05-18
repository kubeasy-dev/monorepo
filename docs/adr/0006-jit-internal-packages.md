# JIT (no-build) internal packages

Internal packages (`@kubeasy/api-schemas`, `@kubeasy/jobs`, `@kubeasy/ui`, `@kubeasy/typescript-config`) export TypeScript source directly — their `package.json` `exports` point to `.ts` files, with no `build` step in the Turbo pipeline for packages. Apps import the source and compile it as part of their own build. This eliminates the "build packages before apps" topological dependency, removes stale-dist issues during development, and keeps the Turbo graph simpler. The API uses `tsup` to bundle everything into a single `dist/index.js` for Docker, which resolves CJS/ESM interop issues that arose with `pino` and `@opentelemetry/*`.

## Consequence

Running `tsc` directly in a package directory won't resolve workspace imports; always run `pnpm typecheck` from the root or from an app.
