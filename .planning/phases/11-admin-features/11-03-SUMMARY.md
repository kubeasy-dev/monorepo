---
phase: 11-admin-features
plan: 03
subsystem: admin
tags: [react, tanstack-query, better-auth, admin-ui, pagination, ban-management]

# Dependency graph
requires:
  - phase: 11-admin-features
    plan: 01
    provides: GET /api/admin/users, GET /api/admin/users/stats, AdminUserItem, AdminUserListOutput, AdminUserStatsOutput
provides:
  - "Admin users page at /admin/users with 4 stats cards, paginated table, role/ban actions"
  - "query-options.ts with adminUsersOptions(page), adminUsersStatsOptions factories"
  - "api-client.ts with apiFetch wrapper (shared infrastructure)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "authClient.admin.setRole/banUser/unbanUser via Better Auth adminClient — no custom Hono endpoints needed"
    - "Ban dialog with local state (banTarget: AdminUserItem | null) — open/close controlled by dropdown action"
    - "Self-action guard: isSelf = user.id === currentUserId — disables all dropdown items on own row"
    - "Banned row opacity: className={user.banned ? 'opacity-60' : ''} on TableRow"
    - "useSuspenseQuery for both users list and stats — wrapped in React.Suspense in route component"

key-files:
  created:
    - apps/admin/src/lib/api-client.ts
    - apps/admin/src/lib/query-options.ts
    - apps/admin/src/components/users-stats.tsx
    - apps/admin/src/components/ban-dialog.tsx
    - apps/admin/src/components/users-table.tsx
  modified:
    - apps/admin/src/routes/users/index.tsx

key-decisions:
  - "query-options.ts includes both challenges factories (from 11-02 pattern) and users factories (11-03) — created as one file since both plans run in parallel wave 2"
  - "Native <textarea> used for ban reason input — @kubeasy/ui has no Textarea component"
  - "Trigger button on own row is disabled rather than hiding dropdown items — simpler UX, clearer feedback"

# Metrics
duration: ~2min
completed: 2026-03-25
---

# Phase 11 Plan 03: Admin Users Page Summary

**Admin users page with 4 stats cards, paginated table (avatar/role/XP/ban status), role change and ban/unban actions via Better Auth adminClient, and self-action guard**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-25T06:51:01Z
- **Completed:** 2026-03-25T06:53:00Z
- **Tasks completed:** 2/3 (Task 3 is checkpoint:human-verify — awaiting human verification)
- **Files modified:** 6

## Accomplishments

- Created `api-client.ts` with `apiFetch` wrapper (credentials: include, JSON content-type)
- Created `query-options.ts` with all 4 query factories: challenges options (from 11-02 pattern) + users options
- Built `users-stats.tsx` with 4 neo-brutalist stat cards: Total Users, Active, Banned, Admins
- Built `ban-dialog.tsx` with optional reason textarea, cancel/confirm buttons, loading state
- Built `users-table.tsx` with avatar, name+email, role badge, completion count, XP, joined date, status badge; dropdown actions for role change and ban/unban; self-action guard; banned row opacity
- Replaced `users/index.tsx` placeholder with full page: stats + table + prev/next pagination

## Task Commits

1. **Task 1: query-options + users-stats + ban-dialog** - `9c156917b` (feat)
2. **Task 2: users-table + users route page** - `404b2249b` (feat)
3. **Task 3: checkpoint:human-verify** - PENDING (awaiting human verification)

## Files Created/Modified

- `apps/admin/src/lib/api-client.ts` — apiFetch wrapper
- `apps/admin/src/lib/query-options.ts` — all 4 admin query factories
- `apps/admin/src/components/users-stats.tsx` — 4 stat cards
- `apps/admin/src/components/ban-dialog.tsx` — ban confirmation dialog
- `apps/admin/src/components/users-table.tsx` — paginated table with dropdown actions
- `apps/admin/src/routes/users/index.tsx` — full users page (replaces placeholder)

## Decisions Made

- `query-options.ts` includes both challenges factories (11-02 pattern) and users factories since both plans run in parallel wave 2 and this avoids merge conflicts
- Native `<textarea>` used instead of `@kubeasy/ui/textarea` (does not exist in @kubeasy/ui exports) — applied Rule 2 (missing component → use native equivalent with Tailwind classes)
- DropdownMenu trigger button disabled when `isSelf` rather than individual menu items disabled — cleaner UX, prevents dropdown from opening at all

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Missing Component] No @kubeasy/ui/textarea component**
- **Found during:** Task 1 (ban-dialog.tsx creation)
- **Issue:** Plan specifies `Textarea from "@kubeasy/ui/textarea"` but @kubeasy/ui has no textarea export
- **Fix:** Used native `<textarea>` with Tailwind CSS classes matching the design system (border-input, bg-background, focus-visible:ring-2 etc.)
- **Files modified:** apps/admin/src/components/ban-dialog.tsx

**2. [Rule 3 - Missing Files] query-options.ts and api-client.ts not created by 11-02**
- **Found during:** Task 1
- **Issue:** Plan 11-03 says to append to query-options.ts created by 11-02, but 11-02 hasn't run yet in this worktree
- **Fix:** Created both files from scratch with all 4 factories (challenges + users), following both 11-02 and 11-03 spec exactly

## Known Stubs

None — all components are wired with real data from the API.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None — all mutations use Better Auth adminClient which is already initialized in auth-client.ts.

## Next Phase Readiness

- Human verification checkpoint pending (Task 3)
- Both admin pages (challenges + users) should be functional once dev server is running
- After checkpoint approval, plan is complete

---
*Phase: 11-admin-features*
*Completed: 2026-03-25 (pending checkpoint verification)*
