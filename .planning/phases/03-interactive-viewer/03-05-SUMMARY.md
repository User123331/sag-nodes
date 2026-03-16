---
phase: 03-interactive-viewer
plan: 05
subsystem: ui
tags: [react, searchbar, ux, graph-controls]

# Dependency graph
requires:
  - phase: 03-interactive-viewer
    provides: SearchBar component with clearGraph/clearSearch actions and useGraphStore
provides:
  - SearchBar × button clears search input only (nodes preserved)
  - Separate Reset button for intentional full graph wipe
  - Engine.explore() resets graphBuilder state before each new exploration
affects: [03-interactive-viewer, future-viewer-phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [separate-concerns-ux-pattern]

key-files:
  created: []
  modified:
    - packages/viewer/src/components/SearchBar.tsx
    - packages/viewer/src/components/SearchBar.css
    - packages/engine/src/engine.ts

key-decisions:
  - "× button is visible whenever hasGraph (seedMbid !== null), not only when selectedArtist !== null — graph existence is the correct predicate"
  - "handleClear owns search-only reset; handleReset owns full graph wipe — two distinct affordances prevent accidental data loss"
  - "Engine.explore() resets graphBuilder state before building new graph — prevents stale nodes persisting after Reset"

patterns-established:
  - "Separate-concerns UX: destructive vs. non-destructive actions get distinct, clearly-labeled controls"
  - "hasGraph boolean derived from seedMbid !== null as the canonical 'graph is loaded' predicate in SearchBar"

requirements-completed: [SRCH-03]

# Metrics
duration: ~15min
completed: 2026-03-17
---

# Phase 3 Plan 05: Search Clear vs Reset Summary

**SearchBar × button decoupled from graph wipe — clears search input only; new Reset pill button owns intentional graph destruction; Engine.explore() reset prevents stale node persistence**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-17
- **Completed:** 2026-03-17
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify)
- **Files modified:** 3

## Accomplishments

- Fixed major UX regression: × in search bar no longer destroys an expanded graph unexpectedly
- Added separate "Reset" button as the intentional, clearly-labeled affordance for graph wipe
- × visibility corrected to use `hasGraph` (seedMbid !== null) — available as soon as any graph is loaded
- Engine-level fix: `explore()` now resets graphBuilder before each new exploration, preventing stale node accumulation after Reset + new search

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix handleClear; update × visibility; add Reset button** - `42d69f0` (fix)
2. **Checkpoint: Verify × clears search only; Reset wipes graph** - approved by user
3. **Engine fix (user-identified during checkpoint review)** - `0abd02e` (fix)

## Files Created/Modified

- `packages/viewer/src/components/SearchBar.tsx` - handleClear no longer calls clearGraph; new handleReset callback owns full wipe; × visibility uses hasGraph; Reset button added
- `packages/viewer/src/components/SearchBar.css` - `.search-reset` pill button styles added
- `packages/engine/src/engine.ts` - `explore()` resets graphBuilder state before each new exploration

## Decisions Made

- `hasGraph` (derived from `seedMbid !== null`) is the correct predicate for × visibility, not `selectedArtist !== null`. Graph existence is independent of whether an artist is selected.
- Two distinct callbacks (`handleClear` for search, `handleReset` for graph) enforce the separation of concerns at the code level.
- Engine.explore() must reset graphBuilder before building a new graph to avoid stale node persistence — this is a correctness requirement, not a feature.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Engine.explore() did not reset graphBuilder before new exploration**
- **Found during:** Checkpoint human-verify (identified by user during manual verification)
- **Issue:** After clicking Reset and then searching for a new artist, previously loaded nodes from the prior graph persisted in the graphBuilder internal state, causing them to re-appear in the new exploration result
- **Fix:** Added graphBuilder reset call at the start of Engine.explore() before any provider fetch
- **Files modified:** packages/engine/src/engine.ts
- **Verification:** Manually verified by user during checkpoint review — Reset + new search produces clean graph with no stale nodes
- **Committed in:** 0abd02e (fix(03-05): reset graphBuilder on explore() to prevent stale nodes after Reset)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix was essential for correctness — without it Reset would only appear to work, with stale data re-emerging on next explore. No scope creep.

## Issues Encountered

None beyond the engine bug documented above, which was caught and fixed during checkpoint verification.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Search/Reset UX is correct and verified
- Graph wipe is now an explicit user action (Reset), not an accidental side-effect of clearing search
- Engine state management is clean — no stale nodes after Reset + re-explore
- Ready for Phase 4 or remaining gap-closure plans

---
*Phase: 03-interactive-viewer*
*Completed: 2026-03-17*
