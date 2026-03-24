# packages/api-schemas — CLAUDE.md

Shared Zod schemas and TypeScript types used by both `apps/web` and `apps/api`.

## Purpose

Single source of truth for all API data shapes. Keeping schemas here prevents drift between what the API returns and what the frontend expects.

## Exports

```
@kubeasy/api-schemas              # Re-exports everything
@kubeasy/api-schemas/challenges   # Challenge schemas and types
@kubeasy/api-schemas/themes       # Theme schemas and types
@kubeasy/api-schemas/progress     # User progress schemas and types
@kubeasy/api-schemas/xp           # XP transaction schemas and types
@kubeasy/api-schemas/submissions  # Submission schemas and types
@kubeasy/api-schemas/auth         # Auth-related schemas and types
@kubeasy/api-schemas/objectives   # Challenge objective schemas and types
@kubeasy/api-schemas/drizzle      # Drizzle inferred types (re-exported)
@kubeasy/api-schemas/query-keys   # TanStack Query key factory functions
```

## Pattern

Each file defines Zod schemas and exports inferred TypeScript types:

```typescript
// src/challenges.ts
import { z } from "zod";

export const challengeSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});

export type Challenge = z.infer<typeof challengeSchema>;
```

## Commands

```bash
pnpm typecheck   # Type-check this package
pnpm test        # Run Vitest tests
```

## Key Rules

- **Peer dependency**: `zod ^4.0.0` is NOT bundled — consumers must provide it.
- **No build step**: Apps import TypeScript source directly via the `exports` map.
- **Breaking changes**: Any schema change here requires coordinated updates in both `apps/api` (validation) and `apps/web` (rendering).
- **No runtime code**: This package should only contain schemas, types, and query key factories — no business logic.

## Adding a New Schema

1. Create or edit a file in `src/`
2. Export the Zod schema and inferred type
3. Add the export path to `package.json` exports if creating a new file
4. Run `pnpm typecheck` to verify
