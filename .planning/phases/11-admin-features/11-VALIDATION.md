---
phase: 11
slug: admin-features
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `apps/api/vitest.config.ts` / `apps/admin/vite.config.ts` |
| **Quick run command** | `pnpm --filter @kubeasy/api test:run` |
| **Full suite command** | `pnpm test:run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @kubeasy/api test:run`
- **After every plan wave:** Run `pnpm test:run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | ADMIN-03/04 | unit | `pnpm --filter @kubeasy/api test:run` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | ADMIN-03/04 | unit | `pnpm --filter @kubeasy/api test:run` | ❌ W0 | ⬜ pending |
| 11-01-03 | 01 | 1 | ADMIN-05/06 | unit | `pnpm --filter @kubeasy/api test:run` | ❌ W0 | ⬜ pending |
| 11-01-04 | 01 | 1 | ADMIN-07/08 | unit | `pnpm --filter @kubeasy/api test:run` | ❌ W0 | ⬜ pending |
| 11-01-05 | 01 | 1 | ADMIN-09/10 | unit | `pnpm --filter @kubeasy/api test:run` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 2 | ADMIN-11/12 | manual | — | N/A | ⬜ pending |
| 11-02-02 | 02 | 2 | ADMIN-13/14 | manual | — | N/A | ⬜ pending |
| 11-03-01 | 03 | 3 | ADMIN-15/16/17 | manual | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/routes/admin/challenges.test.ts` — stubs for ADMIN-03, ADMIN-04
- [ ] `apps/api/src/routes/admin/users.test.ts` — stubs for ADMIN-05 through ADMIN-10

*Existing test infrastructure (vitest) covers all phase requirements — no new framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Challenges page renders 4 stats cards + table | ADMIN-11 | UI rendering | Start dev server, visit /challenges, verify cards + table visible |
| Challenge availability toggle with optimistic update | ADMIN-12 | UI interaction + revert behavior | Toggle challenge, verify immediate UI change; simulate API failure to verify revert |
| Users page renders 4 stats cards + paginated table | ADMIN-13 | UI rendering | Visit /users, verify cards + table with avatar, role badge, XP, ban status |
| Role change and ban/unban with dialog | ADMIN-14 | UI interaction | Test role change, ban, unban flows; verify self-action is blocked |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
