---
phase: 2
slug: hono-api-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | apps/api/vitest.config.ts — Wave 0 installs |
| **Quick run command** | `pnpm --filter @kubeasy/api test --run` |
| **Full suite command** | `pnpm --filter @kubeasy/api test --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @kubeasy/api test --run`
- **After every plan wave:** Run `pnpm --filter @kubeasy/api test --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | API-01 | integration | `pnpm --filter @kubeasy/api test --run` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | API-01 | integration | `pnpm --filter @kubeasy/api test --run` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | API-08 | integration | `pnpm --filter @kubeasy/api test --run` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | API-02 | integration | `pnpm --filter @kubeasy/api test --run` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 2 | API-02 | integration | `pnpm --filter @kubeasy/api test --run` | ❌ W0 | ⬜ pending |
| 2-02-03 | 02 | 2 | API-03 | integration | `pnpm --filter @kubeasy/api test --run` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 3 | API-04 | integration | `pnpm --filter @kubeasy/api test --run` | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 3 | API-05 | integration | `pnpm --filter @kubeasy/api test --run` | ❌ W0 | ⬜ pending |
| 2-03-03 | 03 | 3 | API-06 | integration | `pnpm --filter @kubeasy/api test --run` | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 4 | API-07 | integration | `pnpm --filter @kubeasy/api test --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/__tests__/setup.ts` — test setup with in-memory DB or test DB
- [ ] `apps/api/src/__tests__/scaffold.test.ts` — stubs for API-01 (server starts, GET /health)
- [ ] `apps/api/src/__tests__/challenges.test.ts` — stubs for API-02, API-03
- [ ] `apps/api/src/__tests__/submission.test.ts` — stubs for API-04, API-05, API-06
- [ ] `apps/api/src/__tests__/rate-limit.test.ts` — stubs for API-07
- [ ] `apps/api/vitest.config.ts` — vitest configuration

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Go CLI can call POST /api/challenges/:slug/submit | API-05 | Requires Go CLI binary and local Kind cluster | Build CLI, run `kubeasy challenge submit <slug>`, verify HTTP 200 response |
| Rate limit returns 429 after 100 req/10s | API-07 | Requires Redis and concurrent load | Run rate-limit test script: `for i in $(seq 1 100); do curl -X POST .../submit & done; wait` |
| pnpm why @neondatabase/serverless returns empty | API-08 | Must check full workspace | Run `pnpm why @neondatabase/serverless` from repo root, verify empty output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
