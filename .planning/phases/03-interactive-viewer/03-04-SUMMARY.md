---
phase: 03-interactive-viewer
plan: 04
subsystem: api
tags: [musicbrainz, requestqueue, throttle, uuid, engine, entity-resolver]

# Dependency graph
requires:
  - phase: 03-interactive-viewer
    provides: Engine.expand(), EntityResolver.resolveUrlToMbid(), MusicBrainzProvider

provides:
  - MusicBrainzProvider.queuedFetch() — throttled public method wrapping queue.execute with standard MB headers
  - EntityResolver.resolveUrlToMbid() routes through MB queue (no more raw fetchFn flood)
  - Engine.expand() UUID guard — rejects non-UUID args immediately with NotFoundError
  - Engine.fetchAndMergeSimilar() unresolved-artist filter — raw Deezer/Spotify IDs never inserted into graph
  - EngineConfig.mbQueue — injectable fast queue option for tests

affects: [03-interactive-viewer, viewer, UAT]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "queuedFetch pattern: public queue-wrapper method on MusicBrainzProvider for external callers needing throttled fetches"
    - "UUID_REGEX module-level constant guards expand() against non-canonical IDs before touching any provider"
    - "resolvedMbids filter pattern: filter artists array before addSimilarArtists to ensure only resolved artists enter graph"
    - "mbQueue injection: EngineConfig accepts optional RequestQueue so tests avoid 1 req/s throttle"

key-files:
  created: []
  modified:
    - packages/engine/src/providers/musicbrainz/MusicBrainzProvider.ts
    - packages/engine/src/resolver/EntityResolver.ts
    - packages/engine/src/engine/Engine.ts
    - packages/engine/src/engine/types.ts
    - packages/engine/test/resolver/entity-resolver.test.ts
    - packages/engine/test/engine/engine.test.ts

key-decisions:
  - "Reversed Phase 02 decision: resolveUrlToMbid now routes through MusicBrainzProvider.queuedFetch() — queue throttling prevents 503 floods on double-click expansion"
  - "queuedFetch throws NotFoundError on 404 (not NetworkError) so queue does not retry 404s — prevents test timeouts and correct behavior"
  - "mbQueue added to EngineConfig so engine tests inject RequestQueue(rps=1000) rather than triggering 1 req/s throttle"

patterns-established:
  - "Queue-routed fetch pattern: callers that need rate-limited MB requests use queuedFetch() rather than raw fetchFn"
  - "UUID guard pattern: expand() validates mbid against UUID_REGEX before any I/O — fast rejection of corrupt IDs"
  - "Unresolved-artist filter: needsMbidResolution providers filter artists array through resolvedMbids before addSimilarArtists"

requirements-completed: [VIS-07]

# Metrics
duration: 9min
completed: 2026-03-17
---

# Phase 3 Plan 04: Engine Bug Fixes Summary

**Queue-throttled URL lookups via MusicBrainzProvider.queuedFetch(), UUID guard in expand(), and unresolved-artist filter — eliminates 503 floods and Deezer numeric ID graph corruption**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-16T22:45:00Z
- **Completed:** 2026-03-16T22:54:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- `MusicBrainzProvider.queuedFetch(url)` public method wraps `queue.execute` with standard MB headers — all URL lookups now serialized through the 1 req/s queue
- `EntityResolver.resolveUrlToMbid()` replaced raw `fetchFn` call with `mbProvider.queuedFetch()` — reverses Phase 02 decision that caused unbounded parallel MusicBrainz 503s
- `Engine.expand()` UUID guard rejects non-UUID mbid arguments (e.g. Deezer numeric IDs) immediately with `NotFoundError`, zero provider calls
- `fetchAndMergeSimilar` filters `artists` array to only those present in `resolvedMbids` before calling `addSimilarArtists` — raw numeric Deezer/Spotify IDs never inserted into graph
- `EngineConfig.mbQueue` injectable option allows tests to bypass 1 req/s throttle without sacrificing production correctness

## Task Commits

Each task was committed atomically:

1. **Task 1: queuedFetch on MusicBrainzProvider + EntityResolver routing** - `dab2bd0` (feat)
2. **Task 2: UUID guard in expand() + unresolved-artist filter** - `5d8a1dd` (feat)

_Both tasks followed TDD (RED then GREEN). Test count grew from 118 to 124._

## Files Created/Modified
- `packages/engine/src/providers/musicbrainz/MusicBrainzProvider.ts` — Added public `queuedFetch(url)` method
- `packages/engine/src/resolver/EntityResolver.ts` — `resolveUrlToMbid` now calls `mbProvider.queuedFetch()` instead of raw `fetchFn`
- `packages/engine/src/engine/Engine.ts` — `UUID_REGEX` constant; UUID guard at top of `expand()`; `resolvedArtists` filter before `addSimilarArtists`; `mbQueue` wired into `MusicBrainzProvider` constructor
- `packages/engine/src/engine/types.ts` — Added `mbQueue?: RequestQueue` to `EngineConfig`
- `packages/engine/test/resolver/entity-resolver.test.ts` — 3 new tests: queue routing, 503 returns null, cache hit
- `packages/engine/test/engine/engine.test.ts` — 3 new tests: UUID guard, valid UUID expand, unresolved filter; all existing tests updated with `mbQueue: makeFastMbQueue()`

## Decisions Made
- Reversed Phase 02 decision "resolveUrlToMbid calls fetchFn directly to avoid rate-limit cascade" — experience showed the opposite: unbounded parallel calls cause 503s, serialization prevents them
- `queuedFetch` throws `NotFoundError` (not `NetworkError`) on 404 so the queue's retry logic doesn't retry 404s — critical for test speed and correct semantics
- Added `mbQueue` to `EngineConfig` (not a new interface) to minimize API surface change — tests inject a 1000 rps queue, production uses default 1 rps

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Engine tests timing out after queuedFetch change**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** `createEngine` uses default MB queue at 1 req/s; serializing Deezer URL lookups + all other MB calls through it caused 5s test timeouts
- **Fix:** Added `mbQueue?: RequestQueue` to `EngineConfig`; all engine tests pass `mbQueue: makeFastMbQueue()` (1000 rps, maxDelayMs 0)
- **Files modified:** `packages/engine/src/engine/types.ts`, `packages/engine/src/engine/Engine.ts`, `packages/engine/test/engine/engine.test.ts`
- **Verification:** All 124 tests pass in 1.1s
- **Committed in:** `dab2bd0` (part of Task 1 commit)

**2. [Rule 1 - Bug] queuedFetch 404 caused NetworkError retries**
- **Found during:** Task 1 (GREEN phase) — existing `resolveUrlToMbid` test for 404 timed out
- **Issue:** Initial `queuedFetch` threw `NetworkError` on any non-ok status; `RequestQueue.withRetry` retries `NetworkError` up to 3 times, causing 5s timeout on 404
- **Fix:** Added explicit 404 branch throwing `NotFoundError` (non-retryable) before the generic non-ok branch
- **Files modified:** `packages/engine/src/providers/musicbrainz/MusicBrainzProvider.ts`
- **Verification:** All tests pass including `returns null on HTTP error (404 response)`
- **Committed in:** `dab2bd0` (part of Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug)
**Impact on plan:** Both fixes necessary for test correctness and preventing retry storms. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## Next Phase Readiness
- Engine is now resilient to double-click expansion storms — URL lookups serialized through MB queue
- `expand()` will fast-reject any non-UUID passed from the UI (e.g. a node that was incorrectly inserted with a numeric ID)
- Graph is now purely MBID-keyed after this fix — Deezer/Spotify artists that fail URL resolution are silently skipped
- UAT test 13 (503 flood on expansion) and test 14 (Deezer numeric ID corruption) should now pass

---
*Phase: 03-interactive-viewer*
*Completed: 2026-03-17*
