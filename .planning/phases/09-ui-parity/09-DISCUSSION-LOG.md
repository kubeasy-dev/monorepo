# Phase 9: UI Parity - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 09-ui-parity
**Areas discussed:** Scope & page coverage, Audit approach, Plan structure, Fix location strategy

---

## Scope & Page Coverage

### Marketing pages definition

| Option | Description | Selected |
|--------|-------------|----------|
| Landing + get-started only | index.tsx and get-started.tsx | |
| Landing only | Just the homepage (index.tsx) | ✓ |
| Landing + get-started + onboarding | Full pre-auth flow | |

**User's choice:** Landing only
**Notes:** PARITY-02 "marketing pages" = index.tsx only. Neither app has separate pricing or about pages.

---

### Themes/types detail pages

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — include themes/types pages | Audit all pages including detail pages | ✓ |
| No — only pages that exist in ../website | Strict parity, skip pages with no counterpart | |
| Themes/types list only, not detail | Match list pages, skip new detail pages | |

**User's choice:** Include themes/types detail pages
**Notes:** Even though `../website` has no counterpart, these pages must be visually consistent.

---

### Detail page reference

| Option | Description | Selected |
|--------|-------------|----------|
| Design them to match the list page style | Use themes/types list pages in ../website as reference | ✓ |
| Match challenges/$slug style | Use challenge detail as the reference pattern | |
| No parity needed for detail pages | Just verify internal consistency | |

**User's choice:** Match the list page visual style from `../website`

---

## Audit Approach

### Discovery method

| Option | Description | Selected |
|--------|-------------|----------|
| Code diff | Compare component files side by side | ✓ |
| Visual screenshot comparison | Run both apps, screenshot diff | |
| Code diff + visual verification | Hybrid approach | |

**User's choice:** Code diff (primary method)

---

### Reference app state

| Option | Description | Selected |
|--------|-------------|----------|
| Only the code is the reference | ../website is archived, read source only | |
| Both can run | Both apps startable for live visual comparison | ✓ |

**User's choice:** Both apps can run locally

---

### Playwright verification

| Option | Description | Selected |
|--------|-------------|----------|
| Manual visual comparison | Developer runs both and compares | |
| Playwright screenshot diff | Programmatic screenshot capture and diff | ✓ |

**User's choice:** Playwright screenshot diff — use as verification mechanism in each plan

---

## Plan Structure

| Option | Description | Selected |
|--------|-------------|----------|
| 1 plan per page group (4 plans) | Blog, Marketing, Challenges, Dashboard/Profile | ✓ |
| 2 plans (public + authenticated) | Public pages then authenticated pages | |
| 1 combined plan | Single plan for all 4 page groups | |

**User's choice:** 4 plans, one per PARITY requirement

---

## Fix Location Strategy

### Default fix location

| Option | Description | Selected |
|--------|-------------|----------|
| apps/web first, packages/ui only if needed | Default to apps/web, escalate to packages/ui for shared components | ✓ |
| Always apps/web only | Never touch packages/ui in Phase 9 | |
| Prefer packages/ui | Push fixes to packages/ui when in doubt | |

**User's choice:** apps/web first; packages/ui only for base shadcn component issues

---

### CSS token differences

| Option | Description | Selected |
|--------|-------------|----------|
| packages/ui/src/styles/tokens.css | Fix tokens at source, propagates everywhere | ✓ |
| apps/web globals.css override | Local override only | |

**User's choice:** Fix in packages/ui/src/styles/tokens.css — no local overrides

---

## Claude's Discretion

- Component-level fix granularity (inline class vs extracted variable)
- Order of fixes within a plan (Claude prioritizes highest-visibility first)

## Deferred Ideas

None
