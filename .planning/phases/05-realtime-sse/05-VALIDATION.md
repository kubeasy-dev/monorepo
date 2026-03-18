---
phase: 5
slug: realtime-sse
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (apps/api), vitest (apps/web) |
| **Config file** | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts` |
| **Quick run command** | `pnpm --filter apps/api typecheck` |
| **Full suite command** | `pnpm typecheck` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter apps/api typecheck`
- **After every plan wave:** Run `pnpm typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | REAL-01 | type | `pnpm --filter apps/api typecheck` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | REAL-01 | type | `pnpm --filter apps/api typecheck` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | REAL-03 | type | `pnpm --filter apps/api typecheck` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | REAL-02 | type | `pnpm --filter apps/api typecheck` | ✅ | ⬜ pending |
| 05-03-01 | 03 | 2 | REAL-01 | type | `pnpm --filter apps/web typecheck` | ❌ W0 | ⬜ pending |
| 05-04-01 | 04 | 2 | REAL-04 | manual | See manual section below | N/A | ⬜ pending |
| 05-04-02 | 04 | 2 | REAL-04 | type | `pnpm --filter packages/jobs typecheck` | ❌ W0 | ⬜ pending |
| 05-04-03 | 04 | 2 | REAL-04 | type | `pnpm --filter apps/api typecheck` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/routes/sse.ts` — SSE route stub for REAL-01
- [ ] `apps/api/src/workers/user-lifecycle.worker.ts` — worker stub for REAL-04
- [ ] `apps/api/src/workers/challenge-submission.worker.ts` — worker stub for REAL-04
- [ ] `apps/api/src/workers/xp-award.worker.ts` — worker stub for REAL-04
- [ ] `apps/web/src/hooks/useValidationSSE.ts` — EventSource hook stub for REAL-01
- [ ] `packages/jobs/src/queues.ts` — BullMQ queue definitions for REAL-04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSE triggers real-time update in browser after CLI submit | REAL-01 | Requires live browser + Redis + API running | Open challenge detail page, submit via CLI, verify status updates within 2s without page refresh |
| No Redis subscriber leak after 10 SSE connects/disconnects | REAL-03 | Requires Redis CLI inspection | Connect 10 EventSource clients, disconnect all, run `redis-cli CLIENT LIST \| grep subscribe \| wc -l` — must return to baseline |
| SIGTERM handler closes workers before exit | REAL-04 | Requires process signal testing | Send SIGTERM to API process mid-job, verify clean shutdown in logs with no hanging workers |
| Railway Redis noeviction config | REAL-04 | Requires Railway dashboard access | Check Railway Redis plugin `maxmemory-policy` setting is `noeviction` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
