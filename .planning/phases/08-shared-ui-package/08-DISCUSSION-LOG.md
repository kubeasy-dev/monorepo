# Phase 8: Shared UI Package - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 08-shared-ui-package
**Areas discussed:** CSS package scope, Component export style, shadcn CLI setup, Radix UI deps location

---

## CSS Package Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Tokens only | packages/ui exports just the :root CSS variables in tokens.css. Each app keeps its own globals.css with tailwind import, font imports, and shadcn base styles. | ✓ |
| Full globals CSS | packages/ui/src/styles/globals.css contains everything: tailwind import, shadcn base, font import, and :root tokens. Each app just imports one file. | |

**User's choice:** Tokens only
**Notes:** apps/web/src/styles/globals.css replaces its inline `:root` block with `@import "@kubeasy/ui/styles/tokens"` — the rest stays in the app.

---

## Component Export Style

| Option | Description | Selected |
|--------|-------------|----------|
| Sub-paths only | `import { Button } from '@kubeasy/ui/button'` — matches api-schemas pattern, better tree-shaking | ✓ |
| Barrel + sub-paths | Both `import { Button } from '@kubeasy/ui'` (barrel) AND sub-path exports | |

**User's choice:** Sub-paths only

---

## Styles Sub-path Export

| Option | Description | Selected |
|--------|-------------|----------|
| Export styles/ | Add `./styles/tokens` to exports map — apps import via `@import "@kubeasy/ui/styles/tokens"` | ✓ |
| Direct path | Apps import via relative path (fragile) | |

**User's choice:** Yes, export styles/

---

## shadcn CLI Setup

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, full components.json | packages/ui gets components.json pointing to src/components/. `shadcn add` works directly in the package. Official shadcn monorepo pattern. | ✓ |
| No, manual only | Skip components.json in packages/ui. New components added by copying files manually. | |

**User's choice:** Yes, full components.json

---

## Radix UI Deps Location

| Option | Description | Selected |
|--------|-------------|----------|
| Move to packages/ui | All @radix-ui/*, lucide-react, clsx, tailwind-merge move to packages/ui as dependencies. apps/web removes them. apps/admin gets them automatically. | ✓ |
| Keep in apps/web | Leave @radix-ui/* in apps/web. packages/ui has only peerDeps. apps/admin re-declares each Radix dep. | |

**User's choice:** Move to packages/ui

---

## tw-animate-css and class-variance-authority

| Option | Description | Selected |
|--------|-------------|----------|
| Move to packages/ui | Both tw-animate-css and cva move to packages/ui alongside the components that use them | ✓ |
| Keep tw-animate-css in apps/web | tw-animate-css is a CSS-level import — app concern; only cva moves | |

**User's choice:** Move to packages/ui (all shadcn-related deps)

---

## Claude's Discretion

None — all areas had clear user decisions.

## Deferred Ideas

None.
