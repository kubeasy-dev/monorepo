---
phase: 9
slug: ui-parity
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-24
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + Playwright (Python) |
| **Config file** | `apps/web/vitest.config.ts` |
| **Quick run command** | `pnpm --filter web test:run` |
| **Full suite command** | `pnpm test:run` |
| **Visual verification** | Playwright screenshot comparison via `with_server.py` |
| **Estimated runtime** | ~30 seconds (typecheck) + ~60 seconds (Playwright screenshots) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm typecheck` (compile-time correctness)
- **After every plan completes:** Run Playwright screenshot comparison for the plan's pages (visual correctness per D-05)
- **Before `/gsd:verify-work`:** Full suite must be green + all 4 plan screenshot sets reviewed
- **Max feedback latency:** 30 seconds (typecheck), 90 seconds (Playwright)

---

## Playwright Screenshot Comparison Pattern (D-05)

Each plan's `<verification>` section defines a Playwright comparison step. The executor writes a short Python script per plan that captures screenshots from both `apps/web` (port 3000) and `../website` (port 3001), saves them for visual diff review.

```bash
# General pattern — executor writes per-plan comparison script
python .agents/skills/webapp-testing/scripts/with_server.py \
  --server "cd ../website && pnpm dev --port 3001" --port 3001 \
  --server "cd apps/web && pnpm dev" --port 3000 \
  -- python scripts/compare_{plan}_screenshots.py
```

Scripts save screenshots to `/tmp/parity-09-{NN}/` with naming: `{page}-{app}-{viewport}.png`.

Key: always `page.wait_for_load_state('networkidle')` before screenshot (TanStack Start hydration).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 9-01-01 | 01 | 1 | PARITY-01 | typecheck + visual | `pnpm typecheck` + Playwright `/blog` screenshots | pending |
| 9-01-02 | 01 | 1 | PARITY-01 | typecheck + visual | `pnpm typecheck` + Playwright `/blog/{slug}` screenshots | pending |
| 9-02-01 | 02 | 1 | PARITY-02 | typecheck + visual | `pnpm typecheck` + Playwright `/` screenshots | pending |
| 9-03-01 | 03 | 1 | PARITY-03 | typecheck + visual | `pnpm typecheck` + Playwright `/challenges/*` screenshots | pending |
| 9-04-01 | 04 | 1 | PARITY-04 | typecheck + visual | `pnpm typecheck` + Playwright `/dashboard` screenshots | pending |
| 9-04-02 | 04 | 1 | PARITY-04 | typecheck | `pnpm typecheck` | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [x] `pnpm typecheck` — TypeScript must pass after each plan
- [x] `pnpm check` — Biome lint must pass after each plan
- [x] Playwright screenshot comparison scripts — created per-plan by executor during plan execution

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (pnpm typecheck)
- [x] Per-plan Playwright visual verification defined in `<verification>` sections (D-05)
- [x] Sampling continuity: typecheck after every task, Playwright after every plan
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
