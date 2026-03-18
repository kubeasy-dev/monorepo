---
phase: "04"
plan: "03"
subsystem: "apps/web"
tags: [tanstack-start, ssg, blog, notion, login, better-auth]
dependency-graph:
  requires: ["04-01", "04-02"]
  provides: ["blog-ssg-routes", "login-page", "notion-client"]
  affects: ["apps/web/src/routes/blog", "apps/web/src/routes/login.tsx", "apps/web/src/components"]
tech-stack:
  added:
    - "@notionhq/client v5.12.0 — Notion API client for SSG blog data"
  patterns:
    - "Route loader for SSG data fetching (Notion API at build time)"
    - "crawlLinks: true for automatic SSG blog article discovery"
    - "Inline BlockRenderer for Notion content blocks"
    - "validateSearch for type-safe search params on login route"
key-files:
  created:
    - "apps/web/src/lib/notion.ts — Notion client ported from Next.js, process.env based"
    - "apps/web/src/components/header.tsx — layout header with TanStack Router Link"
    - "apps/web/src/components/footer.tsx — layout footer with TanStack Router Link"
    - "apps/web/src/components/hero-section.tsx"
    - "apps/web/src/components/stats-section.tsx"
    - "apps/web/src/components/features-section.tsx"
    - "apps/web/src/components/how-it-works-section.tsx"
    - "apps/web/src/components/open-source-section.tsx"
    - "apps/web/src/components/early-access-section.tsx"
    - "apps/web/src/components/cta-section.tsx"
    - "apps/web/src/components/typewriter-text.tsx"
    - "apps/web/src/components/interactive-terminal.tsx"
    - "apps/web/src/components/login-card.tsx — social auth card (GitHub/Google/Microsoft)"
    - "apps/web/src/routes/blog/index.tsx — SSG blog listing page"
    - "apps/web/src/routes/blog/$slug.tsx — SSG blog article page with BlockRenderer"
  modified:
    - "apps/web/src/lib/constants.ts — added siteConfig"
    - "apps/web/src/routes/__root.tsx — added Header/Footer layout"
    - "apps/web/src/routes/index.tsx — full landing page with all sections"
    - "apps/web/src/routes/login.tsx — full login page with redirect search param"
    - "apps/web/src/routeTree.gen.ts — added blog route registrations"
    - "apps/web/package.json — added @notionhq/client"
decisions:
  - "Ported Notion client using process.env directly instead of typed @/env module — avoids Next.js dependency"
  - "Removed captureServerException from Notion client — PostHog not wired in apps/web yet"
  - "Blog SSG uses crawlLinks: true — listing page Link tags discovered by vite-plugin-ssr at build time"
  - "Plain <a> tags used for unregistered routes (/get-started, /challenges, /blog) to avoid TypeScript errors"
  - "Button asChild not supported in @base-ui/react — replaced all asChild patterns with plain <a> elements"
  - "routeTree.gen.ts manually maintained — TanStack Router generator has conflict detection issue with pathless layouts in v1.166.x"
metrics:
  duration: "multi-session"
  completed: "2026-03-18"
  tasks-completed: 2
  files-created: 16
  files-modified: 5
---

# Phase 04 Plan 03: Landing Page, Blog, and Login Migration Summary

Ported the landing page, blog listing/article pages, and login page from Next.js to TanStack Start SSG routes in `apps/web`.

## Tasks Completed

### Task 1: Notion Client, Layout Components, and Landing Page

**Commit:** `0ad0c66a3`

Ported the Notion API client from the Next.js `lib/notion.ts`, removing `@/env` typed env and `captureServerException` PostHog calls. Added `@notionhq/client` to `apps/web/package.json`. Created `header.tsx` and `footer.tsx` layout components using TanStack Router `Link` and `@unpic/react` `Image`. Wired Header/Footer into `__root.tsx`. Ported all seven landing page sections and two interactive components (`TypewriterText`, `InteractiveTerminal`). Updated `routes/index.tsx` to render the full landing page.

**Files created:**
- `apps/web/src/lib/notion.ts`
- `apps/web/src/components/header.tsx`
- `apps/web/src/components/footer.tsx`
- `apps/web/src/components/hero-section.tsx`
- `apps/web/src/components/stats-section.tsx`
- `apps/web/src/components/features-section.tsx`
- `apps/web/src/components/how-it-works-section.tsx`
- `apps/web/src/components/open-source-section.tsx`
- `apps/web/src/components/early-access-section.tsx`
- `apps/web/src/components/cta-section.tsx`
- `apps/web/src/components/typewriter-text.tsx`
- `apps/web/src/components/interactive-terminal.tsx`

### Task 2: Blog Pages and Login Page

**Commit:** `8b504c1ec`

Created `blog/index.tsx` (listing) and `blog/$slug.tsx` (article) as SSG routes with Notion loaders. The listing page renders `<Link to="/blog/$slug">` tags that `crawlLinks: true` uses to discover all article URLs at build time. The article page includes an inline `BlockRenderer` handling all Notion block types. Created `login-card.tsx` with GitHub/Google/Microsoft social sign-in using `signInWithSocialProvider`. Updated `login.tsx` with `validateSearch` for type-safe `?redirect=` param handling. Updated `routeTree.gen.ts` to register all blog routes.

**Files created:**
- `apps/web/src/components/login-card.tsx`
- `apps/web/src/routes/blog/index.tsx`
- `apps/web/src/routes/blog/$slug.tsx`

**Files modified:**
- `apps/web/src/routes/login.tsx`
- `apps/web/src/routeTree.gen.ts`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Validation] Biome a11y rule violations in landing page components**
- **Found during:** Task 1
- **Issue:** Multiple Biome accessibility rule failures: `useValidAnchor` on `href="#"`, `noStaticElementInteractions` on divs with mouse handlers, `useAriaPropsSupportedByRole` on divs with `aria-label`, `noArrayIndexKey` in interactive-terminal key props
- **Fix:** Replaced `href="#"` with real URLs in footer; removed `role="group"` and `aria-label` from plain divs in `how-it-works-section.tsx`; removed mouse event handlers from wrapping div; used content string as key instead of array index in `interactive-terminal.tsx`
- **Files modified:** `footer.tsx`, `how-it-works-section.tsx`, `interactive-terminal.tsx`
- **Commit:** `0ad0c66a3`

**2. [Rule 1 - Bug] Button asChild not supported in @base-ui/react**
- **Found during:** Task 1
- **Issue:** `Button` component in `apps/web` is based on `@base-ui/react/button` which does not accept an `asChild` prop — TypeScript error on all `<Button asChild>` patterns
- **Fix:** Replaced all `<Button asChild><a ...>` patterns with plain `<a>` tags styled with `neo-border`, `neo-shadow`, and button-like classes
- **Files modified:** `open-source-section.tsx`, `early-access-section.tsx`, `cta-section.tsx`
- **Commit:** `0ad0c66a3`

**3. [Rule 1 - Bug] TypeScript errors for unregistered routes**
- **Found during:** Task 1 and Task 2
- **Issue:** `Link to="/challenges"`, `Link to="/blog"`, `Link to="/get-started"` caused TypeScript errors because these routes were not yet registered in `routeTree.gen.ts` at the time of porting
- **Fix:** Used plain `<a href="...">` for all routes not registered in the current plan scope
- **Files modified:** `hero-section.tsx`, `features-section.tsx`, `header.tsx`
- **Commit:** `0ad0c66a3`

## Self-Check: PASSED

All created files found on disk. Both task commits verified in git history.
