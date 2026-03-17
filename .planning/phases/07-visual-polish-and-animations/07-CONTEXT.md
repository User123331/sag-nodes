# Phase 7: Visual Polish & Animations - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Graph interactions feel alive with entry animations, ambient particle drift, expansion ripples, a genre-clustered layout mode, and improved label scaling. All effects render on the existing Canvas 2D surface via react-force-graph-2d's `nodeCanvasObject` and `linkCanvasObject` callbacks.

</domain>

<decisions>
## Implementation Decisions

### Entry bloom animations
- New nodes scale up from 0 radius to full size over ~400ms with ease-out cubic easing
- All new nodes from an expansion bloom simultaneously (single timestamp, no stagger)
- New edges grow progressively from the expanded (source) node toward each new target node, synced with the bloom duration
- Bloom state tracked per-node using an `addedAt` timestamp field on ForceNode

### Particle drift on edges
- Tiny 1-2px white dots drift along edge paths
- Speed proportional to fusedScore — high similarity = fast stream, low = slow drift
- Particle count per edge: 1-3 based on fusedScore (1 for weak, 2-3 for strong)
- Bidirectional flow — particles travel both ways simultaneously
- Always visible at all zoom levels (skip rendering when zoomed extremely far out for performance)
- Particle positions calculated from elapsed time in linkCanvasObject — no separate animation loop needed

### Expansion ripple effect
- Single expanding ring outward from the expanded node, fading over ~600ms
- Ring color: node's genre ring color if available, accent blue (#3b82f6) fallback
- Maximum radius ~80px from center (world-space)
- Fires immediately on double-click (before API response) — provides instant feedback
- Separate from the bloom animation which fires when data arrives

### Cluster layout mode
- Added as third option in existing layout toggle: force / radial / cluster
- Groups nodes by primary (first) tag — nodes sharing the same top tag cluster together
- Medium force strength — loose clusters visible but not tightly packed, cross-genre edges readable
- Nodes without tags scatter freely (no forced cluster for untagged nodes)
- No labels or boundaries on clusters — spatial grouping + genre ring colors communicate grouping
- Animated transition between layouts (~500ms) using d3 force simulation reheat

### Label scaling fix
- Progressive reveal based on zoom level:
  - Zoom <1x: only seed node label visible
  - Zoom 1-2x: top ~10 nodes by popularity show labels
  - Zoom 2-4x: most labels visible
  - Zoom >4x: all labels visible
- Fixed screen-space font size (~10px) — does not scale inversely with zoom
- Replaces current `8 / globalScale` formula that causes oversized overlapping labels

### Claude's Discretion
- Exact particle animation math (phase offsets, interpolation)
- Performance optimization thresholds (when to skip particles at extreme zoom-out)
- d3 force attractor strength tuning for cluster layout
- Ripple ring line width and opacity curve
- Progressive label reveal popularity threshold calculation

</decisions>

<canonical_refs>
## Canonical References

No external specs — requirements are fully captured in decisions above.

### Codebase references
- `packages/viewer/src/components/GraphCanvas.tsx` — Main render callbacks (renderNode, renderLink), layout mode switching, expansion handling
- `packages/viewer/src/types/graph.ts` — ForceNode/ForceLink types (will need `addedAt` field)
- `packages/viewer/src/utils/genreCluster.ts` — genreColor HSL hash utility for ripple/cluster coloring
- `packages/viewer/src/utils/nodeSize.ts` — nodeRadius utility for bloom scaling
- `packages/viewer/src/store/controlSlice.ts` — layoutMode state (needs 'cluster' option)
- `packages/viewer/src/store/graphSlice.ts` — addExpansion action (sets bloom timestamps)
- `packages/viewer/src/store/uiSlice.ts` — expandingMbid/expansionStartTime (ripple timing)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `genreColor(tags)` — HSL hash utility returns color string per tag array; reuse for ripple ring color and cluster centroid calculation
- `nodeRadius(nb_fan)` — popularity-based radius; bloom scales from 0 to this value
- `expandingMbid` + `expansionStartTime` state — existing pattern for tracking expansion timing; extend for ripple
- `layoutMode` toggle (force/radial) — extend with 'cluster' option
- `filterByProviders/filterByDepth/filterByNodeLimit` — filter chain runs before render; particles and bloom respect filtered set

### Established Patterns
- Canvas render callbacks (`renderNode`, `renderLink`) are pure functions called per frame — animations use `Date.now()` delta from stored timestamps
- Refs (`expandingMbidRef`, `expansionStartTimeRef`) avoid stale closures in canvas callbacks
- `d3Force` API for layout switching — radial layout pattern in `useEffect([layoutMode])` is template for cluster force
- `ctx.save()/ctx.restore()` pattern for isolating shadow/alpha state (used in genre ring rendering)

### Integration Points
- `addExpansion` in graphSlice — where `addedAt` timestamps should be set on new ForceNodes
- `handleExpand` in GraphCanvas — where ripple should be triggered (before async engine.expand call)
- `linkCanvasObject` callback — where particle rendering goes
- ControlPanel layout toggle — add 'cluster' option to layoutMode union type

</code_context>

<specifics>
## Specific Ideas

- Labels should never overlap — current implementation is the primary visual annoyance
- Particles create an "alive" ambient feel — the graph should feel like it's breathing
- Ripple on click is instant feedback before API responds — bridges the loading gap

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-visual-polish-and-animations*
*Context gathered: 2026-03-18*
