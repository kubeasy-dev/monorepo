---
phase: 09-ui-parity
plan: 01
subsystem: ui
tags: [react, tanstack-router, blog, notion, tailwind, neo-brutalist]

# Dependency graph
requires: []
provides:
  - BlogCard component with featured/compact variants matching ../website reference
  - Blog list page with pinned/regular separation and category filter badges
  - TableOfContentsClient with IntersectionObserver active heading tracking
  - AuthorCard component with social links
  - RelatedPosts component with hover effects
  - Blog article page with grid layout, sidebar ToC, prose-neo typography, AuthorCard, RelatedPosts
affects: [09-ui-parity]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BlogCard featured/compact variants: col-span-full for featured, category header bar for compact"
    - "Category filter: useState + derived Set from post.category.name, badge toggle pattern"
    - "ToC: IntersectionObserver with slugify for heading IDs, active state via id match"
    - "Blog article: grid gap-8 lg:grid-cols-[1fr_250px] with sticky top-28 sidebar"

key-files:
  created:
    - apps/web/src/components/blog-card.tsx
    - apps/web/src/components/table-of-contents.tsx
    - apps/web/src/components/author-card.tsx
    - apps/web/src/components/related-posts.tsx
  modified:
    - apps/web/src/routes/blog/index.tsx
    - apps/web/src/routes/blog/$slug.tsx

key-decisions:
  - "TableOfContentsClient merged into single file (no separate client wrapper needed in TanStack Router)"
  - "Category filter implemented with useState in BlogListingPage, derived from post list"
  - "getRelatedBlogPosts added to $slug.tsx loader alongside getBlogPostWithContent"
  - "Author social links use <a> instead of Next.js Link — external URLs don't need router"

patterns-established:
  - "Neo-brutalist hover: hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
  - "Featured card: col-span-full for full-width grid span"
  - "Compact card: category+date header bar with border-b-2 border-foreground bg-background"

requirements-completed: [PARITY-01]

# Metrics
duration: 15min
completed: 2026-03-24
---

# Phase 9 Plan 1: Blog UI Parity Summary

**Blog list and article pages ported to match ../website: BlogCard featured/compact variants, category filter badges, sidebar ToC with IntersectionObserver, AuthorCard, RelatedPosts, prose-neo typography, and grid layout**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-24T19:09:00Z
- **Completed:** 2026-03-24T19:24:10Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created BlogCard component with featured (col-span-full, cover image, ArrowRight CTA) and compact (category header bar, hover:shadow-none) variants matching reference
- Updated blog list page with pinned/regular separation and category filter badges derived from post list
- Created TableOfContentsClient with IntersectionObserver active heading tracking and collapsible mobile mode
- Created AuthorCard and RelatedPosts components ported from ../website
- Updated blog article page with grid layout (lg:grid-cols-[1fr_250px]), desktop sidebar ToC, mobile collapsible ToC, prose-neo wrapper, clickable category badge, AuthorCard, and RelatedPosts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BlogCard component and update blog list page with category filters** - `992bb15b4` (feat)
2. **Task 2: Fix blog article page typography, category link, and add grid layout with sidebar ToC, AuthorCard, RelatedPosts** - `11a84ffc9` (feat)

## Files Created/Modified

- `apps/web/src/components/blog-card.tsx` - BlogCard with featured/compact variants, TanStack Router Link, no next/image
- `apps/web/src/components/table-of-contents.tsx` - TableOfContentsClient with IntersectionObserver, collapsible mode
- `apps/web/src/components/author-card.tsx` - Author bio card with social links using <a> tags
- `apps/web/src/components/related-posts.tsx` - Related articles grid with cover thumbnails and ArrowRight
- `apps/web/src/routes/blog/index.tsx` - Blog list with pinned/regular separation and category filter badges
- `apps/web/src/routes/blog/$slug.tsx` - Article page with grid layout, sidebar ToC, prose-neo, AuthorCard, RelatedPosts

## Decisions Made

- TableOfContentsClient merged into single component file — Next.js "use client" boundary pattern not needed in TanStack Router
- Category filter uses `useState` inside the route component — no URL search params needed (simpler, matches plan spec)
- `getRelatedBlogPosts` already exists in `apps/web/src/lib/notion.ts` — added to loader alongside `getBlogPostWithContent`
- Author social links use `<a>` elements (not TanStack Router Link) since these are external URLs

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Blog visual parity (PARITY-01) is now satisfied
- Remaining plans in phase 09: landing page, challenges pages, dashboard, shared component cleanup
- No blockers

---
*Phase: 09-ui-parity*
*Completed: 2026-03-24*
