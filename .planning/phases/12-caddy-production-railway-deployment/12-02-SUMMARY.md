---
plan: 12-02
phase: 12-caddy-production-railway-deployment
status: complete
date: 2026-03-25
---

## Summary

Deployed Caddy and admin as Railway services, configured env vars, and verified production routing through Caddy reverse proxy.

## What Was Built

- Caddy service deployed on Railway with `API_UPSTREAM=http://api.railway.internal:8080` and `WEB_UPSTREAM=http://web.railway.internal:8080`
- Admin SPA built statically and served directly from the Caddy container (not a separate service)
- `v2.kubeasy.dev` custom domain assigned to Caddy service
- OAuth authentication working end-to-end via `v2.kubeasy.dev`
- Admin panel accessible at `v2.kubeasy.dev/admin/` with correct role-based access

## Issues Encountered & Fixes

1. **`/api` doubled in API requests** — `API_URL` on api service was `https://v2.kubeasy.dev/api` instead of `https://v2.kubeasy.dev`. Better Auth uses this as `baseURL` and was routing to `/api/api/auth/*`. Fixed by removing `/api` suffix.

2. **Auth 404 on `/api/auth/sign-in/social`** — Same root cause: `API_URL` with `/api` path caused Better Auth to misroute. Fixed with same correction.

3. **Admin redirecting to login** — `VITE_API_URL` not passed as Docker build arg during admin SPA build. Fixed by:
   - Adding `ARG VITE_API_URL` / `ENV VITE_API_URL=$VITE_API_URL` to Caddy Dockerfile `admin-builder` stage
   - Adding `buildArgs` to `apps/caddy/railway.json`
   - Forcing Railway rebuild with cleared cache

## Self-Check: PASSED

- `https://v2.kubeasy.dev/` → web app ✓
- `https://v2.kubeasy.dev/api/health` → 200 ✓
- `https://v2.kubeasy.dev/admin/` → admin SPA with auth ✓
- OAuth login working ✓
- Admin role access working ✓
