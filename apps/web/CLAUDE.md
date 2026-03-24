# apps/web — CLAUDE.md

Kubeasy frontend application.

## Stack

- **Vite** + **React 19** — build tooling and UI framework
- **TanStack Router / React Start** — file-based routing with SSR support
- **TanStack Query** — server state management
- **Better Auth** (client) — authentication hooks
- **Tailwind CSS 4** + **Radix UI** / **shadcn** — styling and accessible components
- **Recharts** — data visualizations
- **Sonner** — toast notifications

## Commands

```bash
pnpm dev        # Start dev server (http://localhost:3000)
pnpm build      # Build for production (outputs to .output/)
pnpm start      # Run built server (node .output/server/index.mjs)
pnpm typecheck  # Type-check without emitting files
```

## Directory Structure

```
src/
  routes/           # File-based routes (TanStack Router)
    __root.tsx          # Root layout
    _protected.tsx      # Authenticated layout guard
    _protected/         # Pages that require authentication
      challenges/       # Challenge list and detail pages
      themes/           # Theme listing
    auth/               # Auth callback routes
    blog/               # Blog pages (Notion-backed)
    login.tsx           # Login page
    index.tsx           # Landing page
  components/       # Reusable React components
    ui/               # shadcn/ui primitives
  hooks/            # Custom React hooks
  lib/              # Utilities (auth client, query client, cn, etc.)
  types/            # TypeScript type definitions
  styles/           # Global CSS (Tailwind)
  client.tsx        # Client entry point
  server.tsx        # Server entry point (SSR)
  start.ts          # TanStack Start bootstrap
  instrumentation.ts  # OpenTelemetry setup
```

## Routing

Routes follow TanStack Router conventions:
- `_protected/` prefix — wraps pages in an auth guard (redirects to `/login` if unauthenticated)
- `__root.tsx` — root layout (providers, theme, analytics)
- `routeTree.gen.ts` — auto-generated, do not edit manually

## Authentication

Use the Better Auth client from `src/lib/auth-client.ts`:

```typescript
import { authClient } from "@/lib/auth-client";

// In a component
const { data: session } = authClient.useSession();
if (!session) return <LoginPrompt />;
```

Social providers: GitHub, Google, Microsoft (configured in `apps/api`).

## Data Fetching

Use **TanStack Query** with query keys from `@kubeasy/api-schemas/query-keys`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { challengeKeys } from "@kubeasy/api-schemas/query-keys";

const { data } = useQuery({
  queryKey: challengeKeys.list({ difficulty: "beginner" }),
  queryFn: () => fetchChallenges({ difficulty: "beginner" }),
});
```

The API base URL is set via `VITE_API_URL` env variable.

## Shared Packages Used

| Package | Import path | Purpose |
|---|---|---|
| `@kubeasy/api-schemas` | `@kubeasy/api-schemas/challenges` etc. | Shared Zod types |
| `@kubeasy/logger` | `@kubeasy/logger` | Server-side structured logging only |

## Styling

- Tailwind CSS 4 with `@theme` config in `src/styles/`
- Use `cn()` from `src/lib/utils.ts` for conditional class merging
- Components in `src/components/ui/` are shadcn primitives — prefer editing over replacing

## Environment Variables

```bash
# Client-side (must be prefixed VITE_ to be exposed to the browser)
VITE_API_URL=http://localhost:3001   # API base URL for client-side fetch (auth client, API client, SSE)

# Server-side (Nitro SSR — accessed via process.env)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318  # OpenTelemetry collector endpoint

# Notion (blog content — blog pages return empty silently if missing)
NOTION_INTEGRATION_TOKEN=            # Notion integration secret
NOTION_BLOG_DATASOURCE_ID=           # Notion database ID for blog posts
NOTION_PEOPLE_DATASOURCE_ID=         # Notion database ID for people/team
NOTION_DIRECTORY_DATASOURCE_ID=      # Notion database ID for directory
```
