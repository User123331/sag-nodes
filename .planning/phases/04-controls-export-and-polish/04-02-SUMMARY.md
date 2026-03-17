---
phase: 04-controls-export-and-polish
plan: 02
subsystem: ui
tags: [react, zustand, d3-force, canvas, keyboard-navigation, sidebar, export, url-hash]

# Dependency graph
requires:
  - phase: 04-controls-export-and-polish/04-01
    provides: controlSlice, filterByDepth/filterByProviders/filterByNodeLimit, exportJson/exportGexf, useUrlState, findNearestInDirection

provides:
  - ControlPanel sidebar component with all 5 sections (Controls/Providers/Layout/Export/Reset)
  - ShortcutOverlay modal with full keyboard shortcut list
  - uiSlice extensions: focusedNodeMbid, isShortcutOverlayOpen, setFocusedNode, toggleShortcutOverlay
  - GraphCanvas with client-side filtering, radial layout, keyboard navigation, focus ring, auto-pan, sidebar width
  - Provider status wiring: providerIsFetching set before/after engine.expand; setProviderStatus on warnings
  - URL state integrated into App via useUrlState hook

affects:
  - Runtime: all Phase 4 visible features now live in the app

# Tech tracking
tech-stack:
  added:
    - forceRadial from d3-force (radial layout mode)
    - forceManyBody from d3-force (force layout restoration)
  patterns:
    - "Auto-collapse sidebar: useRef timer, onMouseLeave starts 3000ms collapse, checks activeElement is not inside sidebar before collapsing"
    - "Keyboard nav refs: focusedNodeMbid, isShortcutOverlayOpen, enabledProviders all stored in refs to prevent stale closures in keydown handler"
    - "SSR-safe lazy useState initializer for window.innerWidth/window.innerHeight"
    - "Filter chain in useMemo: providers -> depth -> nodeLimit, new array on each change"

key-files:
  created:
    - packages/viewer/src/components/ControlPanel.tsx
    - packages/viewer/src/components/ControlPanel.css
    - packages/viewer/src/components/ShortcutOverlay.tsx
    - packages/viewer/src/components/ShortcutOverlay.css
  modified:
    - packages/viewer/src/store/uiSlice.ts
    - packages/viewer/src/components/GraphCanvas.tsx
    - packages/viewer/src/App.tsx
    - packages/viewer/src/index.css

key-decisions:
  - "ControlPanel hidden (display:none) when seedMbid is null — sidebar only appears once a graph is loaded"
  - "Canvas width: leftSidebarWidth only applied when seedMbid !== null to avoid left gap on empty state"
  - "Filter chain applied in useMemo and passed directly as graphData — no nodeVisibility callback needed since d3 layout rebuilds on new array refs are acceptable for these filter changes"
  - "Provider status wiring via handleExpand: all enabled providers set to fetching=true before engine.expand, cleared in finally; warnings trigger setProviderStatus('erroring')"
  - "Keyboard navigation guard: skip if document.activeElement.tagName is INPUT or TEXTAREA, not INPUT check on sidebar (sidebar uses button/range, not text inputs)"

# Metrics
duration: ~5min
completed: 2026-03-17
---

# Phase 4 Plan 02: Controls and Polish UI Wiring Summary

**ControlPanel collapsible sidebar, ShortcutOverlay, GraphCanvas filtering/radial/keyboard-nav wired from Plan 01 utilities into a complete interactive Phase 4 UI**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-17T02:19:23Z
- **Completed:** 2026-03-17T02:24:xx Z
- **Tasks:** 2 of 3 (checkpoint pending human verify)
- **Files created:** 4, modified: 4

## Accomplishments

- Extended `uiSlice` with `focusedNodeMbid`, `isShortcutOverlayOpen`, `setFocusedNode`, `toggleShortcutOverlay`
- Added Phase 4 CSS custom properties (`--color-status-*`, `--color-focus-ring`) to `index.css`
- Created `ControlPanel` (230 lines): auto-collapse sidebar with depth/nodeLimit sliders, provider toggles with status dots and cooldown countdown, force/radial layout toggle, JSON/GEXF export buttons, reset button
- Created `ShortcutOverlay`: modal with backdrop showing all keyboard shortcuts in key-badge + description layout
- Extended `GraphCanvas` (310 lines): SSR-safe window sizing, sidebar-aware canvasWidth, filter chain in useMemo, radial layout via `forceRadial`, full keyboard navigation (Tab/arrows/Enter/Escape/slash/?), focus ring drawn on canvas, auto-pan on focus change, provider fetch/status wiring
- App.tsx wired with `<ControlPanel>`, `<ShortcutOverlay>`, and `useUrlState()` call
- TypeScript compiles clean; all 91 existing tests still pass

## Task Commits

1. **Task 1: ControlPanel, ShortcutOverlay, uiSlice, App wiring** - `3212cc8`
2. **Task 2: GraphCanvas filtering, radial, keyboard nav, sidebar width** - `bad91f1`

## Files Created/Modified

- `packages/viewer/src/components/ControlPanel.tsx` — Collapsible sidebar with all 5 sections
- `packages/viewer/src/components/ControlPanel.css` — Sidebar styles, slider styles, toggle pill, pulse-dot animation
- `packages/viewer/src/components/ShortcutOverlay.tsx` — Keyboard shortcut help modal
- `packages/viewer/src/components/ShortcutOverlay.css` — Overlay backdrop + card styles
- `packages/viewer/src/store/uiSlice.ts` — focusedNodeMbid, isShortcutOverlayOpen, setFocusedNode, toggleShortcutOverlay
- `packages/viewer/src/components/GraphCanvas.tsx` — Filtering, radial layout, keyboard nav, focus ring, provider status wiring
- `packages/viewer/src/App.tsx` — ControlPanel, ShortcutOverlay, useUrlState integration
- `packages/viewer/src/index.css` — Status color tokens, focus ring token

## Decisions Made

- `ControlPanel` uses `display: none` via `.control-panel--hidden` when `seedMbid === null` — sidebar only visible once a graph is loaded; this avoids a stray 40px strip on the empty state
- Canvas `leftSidebarWidth` is `0` when `seedMbid === null`, so empty state is full-width
- Filter chain in `useMemo` passes a new array to `graphData` prop on change — ForceGraph2D rerenders with new node set; layout restart on filter is acceptable since users expect visual changes when filtering
- Keyboard navigation uses `enabledProvidersRef` in `handleExpand` to capture the snapshot of enabled providers at call time, avoiding stale Set reference

## Deviations from Plan

### Auto-fixed Issues

None.

The plan was executed exactly as specified. All acceptance criteria for Tasks 1 and 2 are satisfied. Task 3 is a `checkpoint:human-verify` that requires manual UAT.

---

## Self-Check: PASSED

Key files exist:
- `packages/viewer/src/components/ControlPanel.tsx`: FOUND
- `packages/viewer/src/components/ControlPanel.css`: FOUND
- `packages/viewer/src/components/ShortcutOverlay.tsx`: FOUND
- `packages/viewer/src/components/ShortcutOverlay.css`: FOUND

Commits exist:
- `3212cc8` (Task 1): FOUND
- `bad91f1` (Task 2): FOUND

TypeScript: 0 errors (tsc -b passes, vite build succeeds)
Tests: 91/91 passing

*Phase: 04-controls-export-and-polish*
*Completed: 2026-03-17*
