---
phase: 12
slug: caddy-production-railway-deployment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (apps/api) — infrastructure phase, mostly manual |
| **Config file** | `apps/api/vitest.config.ts` |
| **Quick run command** | `cd apps/api && pnpm test:run` |
| **Full suite command** | `pnpm test:run` (from root via turbo) |
| **Estimated runtime** | ~30 seconds (existing suite only — no new automated tests) |

---

## Sampling Rate

- **After every task commit:** `pnpm typecheck` (catches accidental TS breaks from config edits)
- **After every plan wave:** `docker build` verification of affected Dockerfiles
- **Before `/gsd:verify-work`:** Full OAuth + SSE smoke test in production must pass
- **Max feedback latency:** Manual verification per wave

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| Caddyfile update | 01 | 1 | MFE-03 | docker build | `docker build -f apps/caddy/Dockerfile apps/caddy/ && docker run -e API_UPSTREAM=localhost:3001 -e WEB_UPSTREAM=localhost:3000 -e ADMIN_UPSTREAM=localhost:3002 -p 80:80 <img>` | ❌ Wave 0 | ⬜ pending |
| Caddy Dockerfile | 01 | 1 | MFE-03, MFE-04 | docker build | `docker build -f apps/caddy/Dockerfile apps/caddy/` | ❌ Wave 0 | ⬜ pending |
| Admin Dockerfile | 01 | 1 | ADMIN-18 | docker build | `docker build -f apps/admin/Dockerfile . && docker run -p 8080:80 <img> && curl http://localhost:8080/admin/` | ❌ Wave 0 | ⬜ pending |
| Caddy Railway deploy | 02 | 2 | MFE-04 | manual | Railway dashboard — service active, `kubeasy.dev` domain assigned | N/A | ⬜ pending |
| Admin Railway deploy | 02 | 2 | ADMIN-18 | manual | Railway dashboard — admin service active, health check passing | N/A | ⬜ pending |
| OAuth cutover | 03 | 3 | MFE-05 | manual e2e | Browser: GitHub/Google/Microsoft OAuth flows complete without errors | N/A | ⬜ pending |
| SSE validation | 03 | 3 | MFE-03 | manual e2e | Submit challenge → real-time status updates appear in browser | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — existing test infrastructure covers all automatable requirements. This is a pure infrastructure phase. All validations are Docker build verification, Railway deployment confirmation, and manual browser-based testing.

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Caddy routes `/api/*`, `/admin/*`, `/*` correctly in production | MFE-03, MFE-04 | Production Railway environment required | `curl https://kubeasy.dev/api/health`, `curl https://kubeasy.dev/admin/`, `curl https://kubeasy.dev/` — all must return non-502 |
| SSE real-time updates work in production | MFE-03 | Requires live cluster submission + production SSE connection | Submit challenge via UI → watch for live validation status updates |
| OAuth login works via `kubeasy.dev` | MFE-05 | Browser OAuth flow, external provider redirects | Log in via GitHub, Google, Microsoft from production site — complete full auth flow |
| `apps/admin` deployed as independent Railway service | ADMIN-18 | Railway dashboard check | Railway project shows dedicated `admin` service with own Dockerfile build logs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency documented per wave
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
