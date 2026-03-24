# Phase 8: Shared UI Package - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract the 17 existing shadcn/ui components from `apps/web/src/components/ui/` into a new `packages/ui` package (`@kubeasy/ui`). Wire Tailwind v4 `@source` in each consuming app, extract CSS design tokens once, configure peerDependencies and shadcn CLI, then delete the local copies from `apps/web`.

No new components are added in this phase — pure extraction and restructuring.

</domain>

<decisions>
## Implementation Decisions

### CSS Architecture
- **D-01:** `packages/ui` exports **tokens only** — a `src/styles/tokens.css` file containing the `:root` CSS variables (colors, radius, custom shadows) defined once
- **D-02:** Each consuming app keeps its own `globals.css` entrypoint. `apps/web/src/styles/globals.css` replaces its inline `:root` block with `@import "@kubeasy/ui/styles/tokens"` — the rest (tailwind import, tw-animate-css, shadcn base styles, font imports) stays in the app
- **D-03:** The `styles/tokens` sub-path is exported from `packages/ui/package.json` exports field (not via relative path) so CSS imports are stable and don't depend on directory structure

### Component Exports
- **D-04:** Sub-paths only — no barrel export. Pattern: `import { Button } from "@kubeasy/ui/button"`. Matches the `@kubeasy/api-schemas` pattern established in Phase 1
- **D-05:** Every component gets its own entry in `packages/ui/package.json` exports field (e.g. `"./button": "./src/components/button.tsx"`)
- **D-06:** The styles sub-path is also exported: `"./styles/tokens": "./src/styles/tokens.css"`

### shadcn CLI
- **D-07:** `packages/ui` gets a `components.json` pointing to `src/components/` as the component output directory. This enables `shadcn add` to work directly from the package for future component additions
- **D-08:** The `components.json` should use the Tailwind v4 / CSS variables config (matching the existing shadcn setup in `apps/web`)

### Dependencies
- **D-09:** All `@radix-ui/*` packages, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, and `tw-animate-css` move to `packages/ui/package.json` as `dependencies` — `apps/web` removes them
- **D-10:** `react` and `react-dom` are declared as `peerDependencies` in `packages/ui/package.json` (satisfies UI-04 — `pnpm ls react` shows one instance per app)
- **D-11:** `shadcn` CLI package itself stays in `apps/web` (it's a devDependency for CSS base styles import, not a runtime component dep)

### Tailwind v4 @source
- **D-12:** Each consuming app's `globals.css` adds a `@source` directive pointing to the shared package: `@source "../../../packages/ui/src"` (or equivalent relative path from the app's CSS location) — satisfies UI-05

### JIT Pattern (inherited)
- **D-13:** No build step — `packages/ui` exports TypeScript source directly. Apps import `.tsx` files. Same JIT pattern as `api-schemas` and `jobs`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §"Shared UI Package" — UI-01 through UI-05 define the acceptance criteria for this phase

### Existing Code
- `apps/web/src/components/ui/` — 17 components to migrate (alert, avatar, badge, button, card, dialog, dropdown-menu, empty, input, label, navigation-menu, select, separator, sheet, sonner, switch, table)
- `apps/web/src/styles/globals.css` — current CSS entrypoint; `:root` block becomes the `tokens.css` content
- `apps/web/package.json` — current dep list; Radix/shadcn deps migrate to `packages/ui`
- `packages/api-schemas/package.json` — reference for JIT package pattern (exports field, no build step)

### No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/components/ui/*.tsx` — 17 files, directly portable to `packages/ui/src/components/`
- `apps/web/src/styles/globals.css` `:root` block — becomes `packages/ui/src/styles/tokens.css` verbatim (neobrutalism oklch theme + custom shadow vars)
- `apps/web/src/lib/utils.ts` — contains `cn()` helper (clsx + tailwind-merge); should also move to or be re-exported from `packages/ui`

### Established Patterns
- JIT packages: `@kubeasy/api-schemas` and `@kubeasy/jobs` export TypeScript source with `exports` field, no build step — `packages/ui` follows this exactly
- `apps/web` uses `@import "tailwindcss" source("../")` in globals.css — adding `@source` is additive to this line or as a separate directive
- Tailwind v4 with `@import "shadcn/tailwind.css"` already in `apps/web/src/styles/globals.css`

### Integration Points
- `apps/web` imports from `@/components/ui/*` (path alias `@` → `src/`) — all these imports need updating to `@kubeasy/ui/*`
- `apps/web/package.json` workspace dep: add `"@kubeasy/ui": "workspace:*"` alongside existing `@kubeasy/api-schemas`
- `turbo.json` — may need `packages/ui` in the dependency graph if typecheck pipeline needs it

</code_context>

<specifics>
## Specific Ideas

- The `cn()` utility in `apps/web/src/lib/utils.ts` uses `clsx` + `tailwind-merge` — since both deps move to `packages/ui`, consider exporting `cn` from `@kubeasy/ui/utils` so consuming apps don't need to redeclare it
- The `empty.tsx` component is a custom Kubeasy component (not a standard shadcn primitive) — it should still migrate to `packages/ui` since it belongs to the shared design system

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-shared-ui-package*
*Context gathered: 2026-03-24*
