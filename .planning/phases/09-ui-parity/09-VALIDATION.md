---
phase: 9
slug: ui-parity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `apps/web/vitest.config.ts` |
| **Quick run command** | `pnpm --filter web test:run` |
| **Full suite command** | `pnpm test:run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter web test:run`
- **After every plan wave:** Run `pnpm test:run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | PARITY-01 | visual/manual | side-by-side screenshot comparison | N/A | ⬜ pending |
| 9-02-01 | 02 | 1 | PARITY-02 | visual/manual | side-by-side screenshot comparison | N/A | ⬜ pending |
| 9-03-01 | 03 | 2 | PARITY-03 | visual/manual | side-by-side screenshot comparison | N/A | ⬜ pending |
| 9-04-01 | 04 | 2 | PARITY-04 | visual/manual | side-by-side screenshot comparison | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `pnpm typecheck` — TypeScript must pass after each plan
- [ ] `pnpm check` — Biome lint must pass after each plan

*Existing test infrastructure covers the project. UI parity is largely visual and requires manual verification via side-by-side comparison.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Blog list matches `../website` layout | PARITY-01 | Visual pixel comparison | Run both apps, compare `localhost:3000/blog` vs `../website` blog |
| Blog article matches `../website` layout | PARITY-01 | Visual pixel comparison | Compare article pages side-by-side |
| Marketing pages match `../website` | PARITY-02 | Visual pixel comparison | Compare landing, pricing, about pages |
| Challenges pages match `../website` | PARITY-03 | Visual pixel comparison | Compare challenges list and detail pages |
| Dashboard matches `../website` | PARITY-04 | Visual pixel comparison | Compare dashboard and profile pages |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
