# Phase 9: UI Parity - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Audit every public-facing page in `apps/web` (TanStack Start) against its counterpart in `../website` (Next.js reference) and correct all visual differences so the two apps are visually indistinguishable. Work is split into 4 independent plans: Blog, Marketing, Challenges, Dashboard/Profile.

No new features or pages are added — this is a pure visual parity pass on existing pages.

</domain>

<decisions>
## Implementation Decisions

### Page Coverage
- **D-01:** "Marketing pages" (PARITY-02) = landing page only (`index.tsx`) — no separate pricing or about pages exist in either app
- **D-02:** Themes and types detail pages (`themes/$slug`, `types/$slug`) ARE in scope — even though `../website` has no counterpart, they must be visually consistent with the themes/types list pages style from `../website`
- **D-03:** Pages in scope per plan:
  - Plan 1 (blog): blog list + blog article pages
  - Plan 2 (marketing): landing page (`index.tsx`) only
  - Plan 3 (challenges): challenges list + challenge detail pages + themes/types list + themes/types detail pages
  - Plan 4 (dashboard): dashboard + profile pages

### Audit Approach
- **D-04:** Primary method: **code diff** — compare component files between `../website` and `apps/web` to identify structural/class differences
- **D-05:** Both apps can run locally for visual verification — use **Playwright screenshots** to capture pages from both apps and compare them programmatically as part of each plan
- **D-06:** Reference app: `../website` is the source of truth for intended visual design

### Plan Structure
- **D-07:** 4 plans, one per PARITY requirement (PARITY-01 through PARITY-04) — each plan is independently completable and verifiable

### Fix Location
- **D-08:** Default fix location: `apps/web` page/component files
- **D-09:** Touch `packages/ui` only when the issue is in a base shadcn component (button, card, input, etc.) that is shared across apps — Phase 8 JIT pattern applies
- **D-10:** CSS token differences (wrong color, wrong radius) → fix in `packages/ui/src/styles/tokens.css` — tokens are defined once and propagate to all consuming apps automatically. Never add token overrides in `apps/web/src/styles/globals.css`

### Claude's Discretion
- Component-level fix granularity (inline class change vs extracted CSS variable) — Claude decides based on what keeps the code clean
- Order in which components within a plan are fixed — Claude prioritizes highest-visibility issues first

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §"UI Parity" — PARITY-01 through PARITY-04 define acceptance criteria
- `.planning/REQUIREMENTS.md` §"Shared UI Package" — UI-01 through UI-05 define the packages/ui contract that parity fixes must respect

### Reference App (Source of Truth)
- `../website/app/(main)/` — Next.js reference pages; all visual decisions are derived from this code
- `../website/components/` — Reference components; compare against `apps/web/src/components/`
- `../website/app/globals.css` — Reference CSS tokens and base styles

### New App (Target)
- `apps/web/src/routes/` — TanStack Start routes to audit and fix
- `apps/web/src/components/` — App-level components (not shadcn primitives)
- `packages/ui/src/styles/tokens.css` — CSS design tokens (fix token issues here)
- `packages/ui/src/components/` — Shadcn base components (fix shared component issues here)

### Phase 8 Context
- `.planning/phases/08-shared-ui-package/08-CONTEXT.md` — Established packages/ui architecture, JIT pattern, sub-path exports

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/components/*.tsx` — 31 app-level components already ported from `../website`; parity work is corrections, not rewrites
- `packages/ui/src/styles/tokens.css` — Neobrutalism oklch theme tokens; source of truth for colors/radius
- `packages/ui/src/components/` — 17 shadcn base components (button, card, dialog, etc.)

### Established Patterns
- JIT imports: `import { Button } from "@kubeasy/ui/button"` — sub-path only, no barrel
- CSS tokens in `packages/ui`, app styles in `apps/web/src/styles/globals.css`
- TanStack Query for data fetching, TanStack Router for routing

### Integration Points
- Playwright test setup: use `webapp-testing` skill for screenshot capture
- Both apps must be running for visual comparison: `../website` on one port, `apps/web` on another

</code_context>

<specifics>
## Specific Ideas

- Themes/types detail pages have no counterpart in `../website` — use the list page visual style from `../website/app/(main)/themes/page.tsx` and `../website/app/(main)/types/page.tsx` as the design reference for the detail pages
- Both apps can run locally for Playwright side-by-side screenshot comparison — this is the verification mechanism for each plan

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-ui-parity*
*Context gathered: 2026-03-24*
