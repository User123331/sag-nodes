---
phase: 03-interactive-viewer
plan: 02
subsystem: ui
tags: [react, force-graph, canvas, zustand, d3-force, sonner, typescript]

# Dependency graph
requires:
  - phase: 03-01
    provides: Zustand store (4 slices), graph types, utils (genreColor, nodeRadius), useDebounce hook, index.css with CSS variables and skeleton shimmer

provides:
  - SearchBar with 350ms debounced MusicBrainz autocomplete, skeleton loading, keyboard nav, artist selection triggering engine.explore
  - GraphCanvas with ForceGraph2D rendering, custom node/link canvas objects, click/double-click interactions, zoom-adaptive labels, expansion glow
  - App root composing SearchBar + GraphCanvas + Toaster with initEngine on mount
  - App.css and component-scoped CSS files for full layout and dark styling

affects:
  - 03-03 (DetailPanel and final polish will extend GraphCanvas interactions and App layout)

# Tech tracking
tech-stack:
  added:
    - d3-force ^3.0.5 (viewer dep — forceCollide for node collision separation)
    - "@types/d3-force" (devDep — types for d3-force)
  patterns:
    - useRef-based stale-closure avoidance for canvas callbacks (seedMbidRef, selectedNodeRef, expandingMbidRef, expansionStartTimeRef)
    - useShallow from zustand/react/shallow for grouped store selectors in GraphCanvas
    - any-cast pattern for ForceGraph2D ref/graphData to work around complex generic nesting with exactOptionalPropertyTypes
    - delete operator pattern for unpinning d3 nodes (exactOptionalPropertyTypes forbids `n.fx = undefined`)
    - MusicBrainzProvider instantiated once via useRef inside SearchBar for autocomplete (not through engine)

key-files:
  created:
    - packages/viewer/src/components/SearchBar.tsx
    - packages/viewer/src/components/SearchBar.css
    - packages/viewer/src/components/GraphCanvas.tsx
    - packages/viewer/src/components/GraphCanvas.css
    - packages/viewer/src/App.css
  modified:
    - packages/viewer/src/App.tsx
    - packages/viewer/package.json (added d3-force and @types/d3-force)
    - pnpm-lock.yaml

key-decisions:
  - "ForceGraph2D ref and graphData cast to `any` to bypass complex nested generic mismatch — ForceNode.fx: number|null vs library's NodeObject.fx: number causes exactOptionalPropertyTypes failure"
  - "delete (n as {fx?: ...}).fx pattern instead of n.fx = undefined for unpinning — exactOptionalPropertyTypes does not allow undefined assignment to number|null"
  - "MusicBrainzProvider created once in useRef inside SearchBar — autocomplete search bypasses the engine facade which has no searchArtist method"
  - "d3-force installed explicitly as viewer dep — react-force-graph-2d bundles d3 internally but TypeScript types require explicit import for forceCollide"
  - "renderNode uses NO_GENRE_COLOR for all nodes — ForceNode has no tags field, genre coloring deferred to Phase 4 when tag data may be piped through store"

patterns-established:
  - "Canvas callback refs: update refs in useEffect for each state value to avoid stale closures inside nodeCanvasObject/linkCanvasObject"
  - "Double-click detection: single click sets lastClickedRef + 300ms timer; second click on same node within timer clears timer and fires expand"

requirements-completed: [VIS-01, VIS-05, VIS-06, VIS-08, SRCH-02, SRCH-03, UI-02, UI-04]

# Metrics
duration: 15min
completed: 2026-03-16
---

# Phase 3 Plan 02: SearchBar + GraphCanvas Summary

**ForceGraph2D canvas viewer with debounced MusicBrainz autocomplete, node/link custom rendering, single/double-click select/expand, zoom-adaptive labels, and expansion glow animation**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-16T12:00:00Z
- **Completed:** 2026-03-16T12:15:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- SearchBar: 350ms debounced MusicBrainz search, 3-row skeleton loading, ArrowUp/Down/Enter/Escape keyboard nav, artist selection triggers engine.explore, post-graph translucent backdrop-filter state
- GraphCanvas: ForceGraph2D with custom nodeCanvasObject/linkCanvasObject, seed node white ring, selected node accent ring + dim others to 30%, double-click expansion with 300ms window, forceCollide collision force, zoom-adaptive labels at globalScale >= 2.5
- App root wires SearchBar + GraphCanvas + Toaster with initEngine() on mount; App.css provides 100vw×100vh layout

## Task Commits

Each task was committed atomically:

1. **Task 1: Build SearchBar with debounced autocomplete and artist selection** - `297b54e` (feat)
2. **Task 2: Build GraphCanvas with force-directed rendering, node styling, click/expand interactions, and wire App layout** - `0e1e2b0` (feat)

## Files Created/Modified
- `packages/viewer/src/components/SearchBar.tsx` - Controlled input with debounced MusicBrainz autocomplete, skeleton state, keyboard nav, engine.explore on selection
- `packages/viewer/src/components/SearchBar.css` - search-container, search-input, search-dropdown, search-item, search-clear styling
- `packages/viewer/src/components/GraphCanvas.tsx` - ForceGraph2D wrapper with custom canvas renderers, click/double-click handlers, collide force, empty/loading states
- `packages/viewer/src/components/GraphCanvas.css` - graph-container, graph-empty centering styles
- `packages/viewer/src/App.tsx` - Root layout composing SearchBar + GraphCanvas + Toaster with initEngine on mount
- `packages/viewer/src/App.css` - Full viewport dark app container
- `packages/viewer/package.json` - Added d3-force and @types/d3-force deps

## Decisions Made
- ForceGraph2D ref and graphData cast to `any`: the library's `FCwithRef` generic wraps `NodeObject<NodeType>` creating double-wrapped types that clash with `exactOptionalPropertyTypes`. The cast is safe because the component accepts any object as node/link data at runtime.
- `delete (n as {...}).fx` for unpinning nodes: `exactOptionalPropertyTypes` forbids assigning `undefined` to `number | null`. Using `delete` removes the property entirely, which d3 treats as unpinned.
- renderNode uses `NO_GENRE_COLOR` by default: `ForceNode` carries no tag data (tags live on `ArtistSummary` from search, not persisted to graph nodes). Colorful genre rendering deferred to Phase 4.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed d3-force as explicit viewer dependency**
- **Found during:** Task 2 (GraphCanvas forceCollide setup)
- **Issue:** `forceCollide` needed from `d3-force` per plan spec, but d3-force was not in viewer package.json; react-force-graph-2d bundles d3 internally but TypeScript imports require the package explicitly
- **Fix:** `pnpm add d3-force @types/d3-force --filter @similar-artists-graph/viewer`
- **Files modified:** packages/viewer/package.json, pnpm-lock.yaml
- **Verification:** TypeScript resolves d3-force imports, `pnpm tsc --noEmit` passes
- **Committed in:** `297b54e` (staged in Task 1 commit since installed before Task 2)

**2. [Rule 1 - Bug] Cast ForceGraph2D ref and graphData to bypass exactOptionalPropertyTypes type mismatch**
- **Found during:** Task 2 (GraphCanvas TypeScript check)
- **Issue:** ForceNode.fx is `number | null` but react-force-graph-2d's NodeObject.fx is `number | undefined`, causing TS2322 under exactOptionalPropertyTypes
- **Fix:** Cast `graphRef as any` and `graphData as any` on ForceGraph2D props; cast `n as { fx?: number | null }` then `delete` for unpinning
- **Files modified:** packages/viewer/src/components/GraphCanvas.tsx
- **Verification:** `pnpm tsc --noEmit` exits 0
- **Committed in:** `0e1e2b0` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking dep install, 1 type compatibility fix)
**Impact on plan:** Both fixes required for correctness and build success. No scope creep.

## Issues Encountered
- None beyond the two auto-fixed deviations above.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- SearchBar + GraphCanvas fully functional; interactive search-to-graph flow works end-to-end
- App layout is ready for DetailPanel (03-03): right drawer at 320px, graph canvas already reads `isPanelOpen` to adjust width
- Genre color rendering blocked until tags are piped through store (architectural decision deferred to 03-03 or Phase 4)
- `pnpm build` passes clean; dev server starts with search bar and empty state

---
*Phase: 03-interactive-viewer*
*Completed: 2026-03-16*
