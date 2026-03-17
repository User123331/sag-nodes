---
phase: 06-genre-coloring-pipeline
plan: 01
subsystem: engine
tags: [musicbrainz, graphology, tags, genre, type-chain]

# Dependency graph
requires:
  - phase: 05-fix-integration-wiring
    provides: EntityResolver.mbProvider readonly access, Engine.exploreByMbid
provides:
  - NodeAttrs.tags and ArtistNode.tags fields in engine type chain
  - ArtistGraph.toData() propagates tags via conditional spread
  - EngineImpl.enrichTagsForNodes() enriches nodes missing tags via MusicBrainz
affects: [07-viewer-genre-coloring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - enrichTagsForNodes iterates graph post-fetchAndMergeSimilar and fetches tags per-node, skipping already-tagged nodes
    - Conditional spread pattern for exactOptionalPropertyTypes: (x !== undefined ? { field: x } : {})
    - Tags merge in addNode(): only overwrites when incoming has data and existing is empty

key-files:
  created: []
  modified:
    - packages/engine/src/graph/types.ts
    - packages/engine/src/graph/ArtistGraph.ts
    - packages/engine/src/engine/Engine.ts

key-decisions:
  - "Tags enrichment is sequential (not parallel) via enrichTagsForNodes — per-node getArtistDetails calls go through MusicBrainz queue naturally, preventing 503 floods"
  - "Tags skip guard (attrs.tags !== undefined && attrs.tags.length > 0) prevents redundant MB calls for nodes already enriched in a prior pass"
  - "Tags merge in addNode() uses one-way overwrite — never downgrades a node that already has tags"

patterns-established:
  - "Post-fetch enrichment pattern: await fetchAndMergeSimilar; await enrichTagsForNodes; getGraphData() — enrichment step before serialization"

requirements-completed: [VIS-03]

# Metrics
duration: 5min
completed: 2026-03-17
---

# Phase 6 Plan 01: Tags Type Chain and MusicBrainz Enrichment Summary

**Tags field added to NodeAttrs/ArtistNode type chain, propagated through ArtistGraph.toData(), with sequential per-node MusicBrainz enrichment called after every explore/expand/exploreByMbid.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-17T18:56:02Z
- **Completed:** 2026-03-17T18:59:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `tags` field flows from `NodeAttrs` (mutable graph store) through `ArtistGraph.toData()` to `ArtistNode` (read-only output type)
- `addNode()` merge path preserves tags when incoming has data and existing does not
- `enrichTagsForNodes()` fetches MusicBrainz `getArtistDetails` for each untagged node after graph construction, wiring directly into the existing MB rate-limit queue
- All 128 existing tests pass — no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tags field to NodeAttrs/ArtistNode types, propagate in ArtistGraph.toData()** - `4d6b73f` (feat)
2. **Task 2: Add enrichTagsForNodes to EngineImpl, call after fetchAndMergeSimilar in all three methods** - `1cc36ad` (feat)

## Files Created/Modified
- `packages/engine/src/graph/types.ts` - Added `tags?: ReadonlyArray<{name,count}>` to NodeAttrs and ArtistNode
- `packages/engine/src/graph/ArtistGraph.ts` - Tags propagation in toData(); tags merge in addNode()
- `packages/engine/src/engine/Engine.ts` - enrichTagsForNodes() private method; called in explore/expand/exploreByMbid

## Decisions Made
- Tags enrichment is sequential (not parallel) — each node's `getArtistDetails` call is queued through the existing MB `RequestQueue` at 1 req/s, which naturally prevents 503 floods
- Skip guard prevents re-fetching nodes that already have tags from a prior enrichment pass
- Tags merge policy: one-way overwrite only — incoming tags are applied only when existing node has none, preventing data downgrade

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Engine now returns `ArtistNode.tags` arrays populated from MusicBrainz after each explore/expand
- Viewer (Phase 7) can read `node.tags` from `ForceNode` to determine genre color without any additional engine changes
- The `NO_GENRE_COLOR` fallback in `renderNode` is the only viewer change needed to complete VIS-03

---
*Phase: 06-genre-coloring-pipeline*
*Completed: 2026-03-17*

## Self-Check: PASSED

- packages/engine/src/graph/types.ts: FOUND
- packages/engine/src/graph/ArtistGraph.ts: FOUND
- packages/engine/src/engine/Engine.ts: FOUND
- .planning/phases/06-genre-coloring-pipeline/06-01-SUMMARY.md: FOUND
- Commit 4d6b73f (Task 1): FOUND
- Commit 1cc36ad (Task 2): FOUND
