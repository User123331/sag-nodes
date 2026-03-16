---
phase: 02-multi-provider-data-pipeline
plan: "02"
subsystem: graph
tags: [graphology, graph, engine, facade, typescript, vitest]

# Dependency graph
requires:
  - phase: 02-01
    provides: All provider adapters (ListenBrainz, LastFm, Deezer, TasteDive, Spotify), EntityResolver, LruCache, RequestQueue
provides:
  - ArtistGraph wrapper around graphology UndirectedGraph with MBID-keyed nodes and fused-score edges
  - GraphBuilder with addSimilarArtists, score fusion (equal average), node deduplication, budget enforcement
  - Engine facade (createEngine) with explore() and expand() orchestrating all providers in parallel
  - Full package public API: createEngine, ArtistGraph, GraphBuilder exported from @similar-artists-graph/engine
affects:
  - 03-viewer (consumes createEngine, ExploreResult, ArtistGraphData for visualization)

# Tech tracking
tech-stack:
  added: [graphology (UndirectedGraph with typed attrs)]
  patterns:
    - MBID as canonical graph node key — providers with platform-specific IDs resolve via EntityResolver before adding to graph
    - Equal-average score fusion across providers per edge with per-attribution array
    - Node budget enforcement with hard cap 200, truncated flag in ArtistGraphData
    - Promise.allSettled fan-out for parallel provider fetch with graceful degradation to warnings
    - Spotify key-gated: only instantiated when clientId+clientSecret present in EngineConfig

key-files:
  created:
    - packages/engine/src/graph/types.ts
    - packages/engine/src/graph/ArtistGraph.ts
    - packages/engine/src/graph/GraphBuilder.ts
    - packages/engine/src/graph/index.ts
    - packages/engine/src/engine/types.ts
    - packages/engine/src/engine/Engine.ts
    - packages/engine/src/engine/index.ts
    - packages/engine/test/graph/graph-builder.test.ts
    - packages/engine/test/engine/engine.test.ts
  modified:
    - packages/engine/src/index.ts
    - packages/engine/test/smoke.test.ts

key-decisions:
  - "GraphBuilder uses hard cap Math.min(requested, 200) for maxNodes — prevents unbounded graphs"
  - "Score fusion is equal average across all providers per edge — simple, predictable, no provider weighting"
  - "Deezer/TasteDive/Spotify artists require MBID resolution via EntityResolver before graph insertion — prevents platform-id pollution in graph"
  - "Use 404 (NotFoundError, non-retryable) in graceful degradation test to avoid retry backoff delays in CI"

patterns-established:
  - "Pattern: Routed mock fetch in engine tests — createRoutedMockFetch maps URL substrings to mock responses"
  - "Pattern: ProviderEntry interface wraps each provider with getIdForSeed() for cross-provider ID translation"

requirements-completed: [GRPH-01, GRPH-02, GRPH-03, GRPH-04, GRPH-05, GRPH-06, PKG-01, PKG-02]

# Metrics
duration: 7min
completed: 2026-03-16
---

# Phase 2 Plan 02: Graph Builder, Engine Facade API, and Packaging Validation Summary

**graphology UndirectedGraph with MBID-keyed nodes, equal-average score fusion, node budget enforcement, and createEngine() facade orchestrating 5 providers in parallel via Promise.allSettled**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-16T09:49:33Z
- **Completed:** 2026-03-16T09:56:27Z
- **Tasks:** 6
- **Files modified:** 11

## Accomplishments

- `ArtistGraph` wrapper with typed `NodeAttrs`/`EdgeAttrs`, MBID-keyed `UndirectedGraph`, `addNode` dedup merge, `addEdge` fused-score recalculation, `toData()` serializer
- `GraphBuilder` with `addSimilarArtists()`, equal-average score fusion, node budget (default 150, hard cap 200), `truncated` flag, `resolvedMbids` map for MBID canonicalization
- `EngineImpl` with `explore(artistName)` and `expand(mbid)`, `createEngine()` factory, fan-out via `Promise.allSettled`, Spotify key-gated, graceful degradation to warnings array
- 118 tests pass (13 test files) — provider, resolver, graph builder, engine facade, smoke test all green
- ESM + CJS bundles build clean at 206KB each

## Task Commits

Each task was committed atomically:

1. **Task 02-02-01: Graph types and ArtistGraph wrapper** - `e3e3358` (feat)
2. **Task 02-02-02: GraphBuilder with score fusion and budget enforcement** - `9016e68` (feat)
3. **Task 02-02-03: Engine facade types** - `1dae063` (feat)
4. **Task 02-02-04: Engine facade implementation with explore() and expand()** - `5dc020e` (feat)
5. **Task 02-02-05: Engine facade tests** - `e2322a1` (feat)
6. **Task 02-02-06: Update index exports and final smoke test** - `91b8cb1` (feat)

## Files Created/Modified

- `packages/engine/src/graph/types.ts` - ProviderAttribution, NodeAttrs, EdgeAttrs, ArtistNode, SimilarityEdge, ArtistGraphData interfaces
- `packages/engine/src/graph/ArtistGraph.ts` - UndirectedGraph wrapper with addNode/addEdge merge logic and toData() serializer
- `packages/engine/src/graph/GraphBuilder.ts` - addSimilarArtists with budget enforcement, score fusion, resolvedMbids support
- `packages/engine/src/graph/index.ts` - barrel exports for graph module
- `packages/engine/src/engine/types.ts` - EngineConfig, Engine interface, ExploreResult, ProviderCredentials
- `packages/engine/src/engine/Engine.ts` - EngineImpl class with explore/expand/fetchAndMergeSimilar, createEngine factory
- `packages/engine/src/engine/index.ts` - barrel exports for engine module
- `packages/engine/src/index.ts` - updated to include ArtistGraph, GraphBuilder, createEngine, all type exports
- `packages/engine/test/graph/graph-builder.test.ts` - 13 tests covering GRPH-01 through GRPH-06
- `packages/engine/test/engine/engine.test.ts` - 7 integration tests for Engine facade
- `packages/engine/test/smoke.test.ts` - updated to verify graph classes and createEngine export

## Decisions Made

- GraphBuilder uses `Math.min(requested, 200)` hard cap — prevents unbounded graphs from accidentally large maxNodes configs
- Score fusion is equal average across all providers per edge — simple, predictable, no provider weighting needed at this stage
- Deezer/TasteDive/Spotify similar artists require MBID resolution before graph insertion — keeps graph purely MBID-keyed
- Used 404 (NotFoundError, non-retryable) in graceful degradation test to avoid retry backoff delays that would cause test timeouts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed exactOptionalPropertyTypes TypeScript errors in Engine.ts**
- **Found during:** Task 04 (Engine facade implementation)
- **Issue:** `{ maxNodes: config.maxNodes }` passes `number | undefined` to `GraphBuilderOptions.maxNodes?: number`, rejected by `exactOptionalPropertyTypes` strict mode. Same for `proxyUrl` in TasteDiveProvider options.
- **Fix:** Applied conditional spread pattern: `...(config.maxNodes !== undefined ? { maxNodes: config.maxNodes } : {})` — consistent with existing codebase pattern (noted in STATE.md decisions)
- **Files modified:** `packages/engine/src/engine/Engine.ts`
- **Verification:** `pnpm typecheck` exits 0
- **Committed in:** `5dc020e` (Task 04 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Single TypeScript fix required by project's exactOptionalPropertyTypes strictness. No scope creep.

## Issues Encountered

- Engine integration test "graceful degradation" timed out at 5000ms when using HTTP 500 for ListenBrainz failure — because 500 triggers NetworkError which is retryable, causing 3 retries with exponential backoff (1s+2s+4s=7s). Resolved by using 404 instead, which throws NotFoundError (non-retryable) and returns immediately.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full engine API is ready: `createEngine()` returns working engine with `explore(artistName)` and `expand(mbid)`
- Phase 3 (viewer) can import `@similar-artists-graph/engine` and call `createEngine()` to get `ArtistGraphData` for visualization
- `ExploreResult` extends `ArtistGraphData` with warnings array — viewer can display provider failure notifications
- Remaining concern: Spotify endpoint restriction (noted in STATE.md) may limit `expand()` usefulness for Spotify nodes

---
*Phase: 02-multi-provider-data-pipeline*
*Completed: 2026-03-16*

## Self-Check: PASSED

All 10 files found. All 6 task commits verified.
