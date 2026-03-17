---
phase: 04-controls-export-and-polish
plan: 01
subsystem: ui
tags: [zustand, vitest, typescript, gexf, url-hash, keyboard-nav, graph-filtering]

# Dependency graph
requires:
  - phase: 03-interactive-viewer
    provides: ForceNode/ForceLink types, graphSlice, Zustand store architecture, vitest test setup

provides:
  - controlSlice with provider toggles, depth, nodeLimit, layoutMode, sidebar state
  - ForceNode.depthFromSeed field tracked by graphSlice setGraph and addExpansion
  - filterByDepth, filterByProviders, filterByNodeLimit pure filter functions
  - buildJsonExport, downloadJson for JSON graph export
  - buildGexf, escapeXml, downloadGexf for GEXF 1.3 XML graph export
  - encodeHash, decodeHash, useUrlState for URL hash sync
  - findNearestInDirection for proximity-based arrow key navigation
  - 61 new unit tests across 6 test files (91 total passing)

affects:
  - 04-02-PLAN (UI plan — wires to all utilities built here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD: failing tests written before implementation for all utilities"
    - "Pure function utilities: all filter/export/nav functions are side-effect-free and fully testable"
    - "StateCreator pattern: controlSlice follows same slice architecture as graphSlice/uiSlice/engineSlice"
    - "depthFromSeed set contextually by graphSlice, not by toForceNode (converter stays generic)"

key-files:
  created:
    - packages/viewer/src/store/controlSlice.ts
    - packages/viewer/src/utils/providerFilter.ts
    - packages/viewer/src/utils/exportJson.ts
    - packages/viewer/src/utils/exportGexf.ts
    - packages/viewer/src/hooks/useUrlState.ts
    - packages/viewer/src/utils/keyboardNav.ts
    - packages/viewer/test/providerFilter.test.ts
    - packages/viewer/test/controlSlice.test.ts
    - packages/viewer/test/exportJson.test.ts
    - packages/viewer/test/exportGexf.test.ts
    - packages/viewer/test/urlState.test.ts
    - packages/viewer/test/keyboardNav.test.ts
  modified:
    - packages/viewer/src/types/graph.ts
    - packages/viewer/src/store/graphSlice.ts
    - packages/viewer/src/store/index.ts

key-decisions:
  - "depthFromSeed defaults to 0 in toForceNode; graphSlice overrides contextually (setGraph: seed=0, others=1; addExpansion: expandingNode.depthFromSeed+1)"
  - "engine.explore() takes only artistName (1 arg) — useUrlState hook cannot pass maxDepth as config option"
  - "filterByProviders recalculates fusedScore as average of remaining enabled provider attributions"
  - "filterByNodeLimit uses fusedScore of direct edge to seed as ranking metric; indirect nodes score 0"
  - "encodeHash/decodeHash use URLSearchParams for reliable percent-encoding of MBID values"

patterns-established:
  - "Filter functions return { nodes, links } tuple — consistent API across filterByDepth/filterByProviders/filterByNodeLimit"
  - "GEXF escapeXml replaces & before other chars to prevent double-escaping"

requirements-completed:
  - CTRL-01
  - CTRL-02
  - CTRL-03
  - CTRL-04
  - CTRL-05
  - CTRL-06
  - STAT-01
  - STAT-02
  - EXPT-01
  - EXPT-02
  - SHAR-01
  - SHAR-02

# Metrics
duration: 10min
completed: 2026-03-17
---

# Phase 4 Plan 01: Controls, Export, and URL State Data Layer Summary

**Zustand controlSlice + 6 pure utility modules (filter/export/URL/keyboard) with 61 new unit tests establishing the complete Phase 4 data layer before UI wiring**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-17T02:10:41Z
- **Completed:** 2026-03-17T02:16:00Z
- **Tasks:** 2
- **Files modified:** 15 (3 modified, 12 created)

## Accomplishments
- Added `depthFromSeed: number` to `ForceNode` and wired graphSlice to set it contextually (seed=0, expansion=parentDepth+1)
- Created `controlSlice` with full provider toggle/status tracking, depth/limit/layout/sidebar state, integrated into Zustand store
- Built 3 pure filter functions (`filterByDepth`, `filterByProviders`, `filterByNodeLimit`) with edge-aware link recalculation
- Built JSON export (`buildJsonExport`/`downloadJson`) and GEXF 1.3 export (`buildGexf`/`escapeXml`/`downloadGexf`)
- Created URL hash utilities (`encodeHash`/`decodeHash`/`useUrlState`) and spatial keyboard nav (`findNearestInDirection`)
- All 91 viewer tests pass; TypeScript compiles cleanly with `--noEmit`

## Task Commits

Each task was committed atomically:

1. **Task 1: ForceNode depthFromSeed, controlSlice, graphSlice depth tracking, providerFilter** - `e9fc651` (feat)
2. **Task 2: Export utilities, URL hash state, keyboard navigation** - `e563191` (feat)

## Files Created/Modified

- `packages/viewer/src/types/graph.ts` - Added `depthFromSeed: number` to `ForceNode`; `toForceNode` sets default 0
- `packages/viewer/src/store/graphSlice.ts` - `setGraph` sets seed=0/others=1; `addExpansion` sets expandingNode.depthFromSeed+1
- `packages/viewer/src/store/controlSlice.ts` - Full ControlSlice with 6-provider Set, status tracking, depth/limit/layout controls
- `packages/viewer/src/store/index.ts` - ControlSlice integrated into StoreState and createControlSlice spread
- `packages/viewer/src/utils/providerFilter.ts` - `filterByDepth`, `filterByProviders`, `filterByNodeLimit`
- `packages/viewer/src/utils/exportJson.ts` - `buildJsonExport` (ForceNode->ArtistNode mapping), `downloadJson`
- `packages/viewer/src/utils/exportGexf.ts` - `escapeXml`, `buildGexf` (GEXF 1.3), `downloadGexf`
- `packages/viewer/src/hooks/useUrlState.ts` - `encodeHash`, `decodeHash`, `useUrlState` React hook
- `packages/viewer/src/utils/keyboardNav.ts` - `findNearestInDirection` spatial proximity algorithm
- `packages/viewer/test/providerFilter.test.ts` - 13 tests for all 3 filter functions
- `packages/viewer/test/controlSlice.test.ts` - 10 tests for controlSlice actions
- `packages/viewer/test/exportJson.test.ts` - 9 tests for buildJsonExport
- `packages/viewer/test/exportGexf.test.ts` - 11 tests for escapeXml + buildGexf
- `packages/viewer/test/urlState.test.ts` - 13 tests for encodeHash/decodeHash round-trips
- `packages/viewer/test/keyboardNav.test.ts` - 8 tests for directional nav algorithm

## Decisions Made

- `toForceNode` sets `depthFromSeed: 0` as a placeholder; graphSlice always overrides with correct context — this satisfies TypeScript's required field while keeping the converter generic
- `engine.explore()` takes only one argument (artist name) — `useUrlState` cannot pass `maxDepth` at explore time; restoring URL depth sets `controlSlice.maxDepth` for filtering but not engine query depth
- `filterByProviders` recalculates `fusedScore` as average of remaining enabled provider `rawScore` values rather than rescaling the original score
- `encodeHash`/`decodeHash` use `URLSearchParams` for MBID-safe percent-encoding

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed engine.explore() call signature in useUrlState**
- **Found during:** Task 2 (useUrlState implementation), TypeScript check post-commit
- **Issue:** Plan specified `engine.explore(seed, { maxDepth: depth ?? 3 })` but engine's `explore()` accepts only one argument
- **Fix:** Changed call to `engine.explore(seed)` — maxDepth is set on controlSlice state for UI filtering
- **Files modified:** packages/viewer/src/hooks/useUrlState.ts
- **Verification:** `npx tsc --noEmit` exits 0; all 91 tests pass
- **Committed in:** e563191 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: wrong function arity)
**Impact on plan:** Minimal — the fix correctly reflects engine API. URL-restored depth still applies to client-side filtering via controlSlice.

## Issues Encountered

None beyond the TS error above.

## Next Phase Readiness

- All 6 utility modules are fully tested and TypeScript-clean — ready for 04-02 UI wiring
- `useGraphStore` now includes `ControlSlice` — all controls accessible via `useGraphStore(s => s.xxx)`
- `filterByDepth`/`filterByProviders`/`filterByNodeLimit` can be composed in `GraphCanvas` for display filtering
- Export functions can be triggered from a toolbar button; no additional state needed
- `useUrlState` hook is ready to mount in `App.tsx`

---
*Phase: 04-controls-export-and-polish*
*Completed: 2026-03-17*

## Self-Check: PASSED

- All 10 key source/utility files: FOUND
- Both task commits (e9fc651, e563191): FOUND
- 91 tests passing across 12 test files
- TypeScript: 0 errors (`npx tsc --noEmit`)
