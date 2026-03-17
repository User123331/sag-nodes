---
phase: 05-fix-integration-wiring
plan: 01
subsystem: engine + viewer
tags: [url-sharing, engine-api, mbid, fix]
dependency_graph:
  requires: []
  provides: [exploreByMbid-engine-method, url-restore-mbid-path]
  affects: [useUrlState, EngineImpl, Engine interface, EntityResolver]
tech_stack:
  added: []
  patterns: [UUID-guard, MBID-direct-lookup, TDD-red-green]
key_files:
  created: []
  modified:
    - packages/engine/src/engine/types.ts
    - packages/engine/src/engine/Engine.ts
    - packages/engine/src/resolver/EntityResolver.ts
    - packages/viewer/src/hooks/useUrlState.ts
    - packages/engine/test/engine/engine.test.ts
decisions:
  - exploreByMbid uses UUID guard then getArtistDetails (not searchArtist) — bypasses Lucene name search entirely for MBID-to-graph resolution
  - EntityResolver.mbProvider changed from private to readonly — allows EngineImpl to access mbProvider directly without routing through EntityResolver
metrics:
  duration: 2 min
  completed: 2026-03-17
  tasks_completed: 2
  files_modified: 5
key_decisions:
  - exploreByMbid resolves MBID by calling getArtistDetails(mbid) directly — no Lucene text search, no name disambiguation needed
  - EntityResolver.mbProvider visibility changed from private to readonly to enable EngineImpl access
---

# Phase 05 Plan 01: URL Restore Fix (exploreByMbid) Summary

**One-liner:** Added `exploreByMbid(mbid)` to Engine interface and fixed URL restore path to bypass Lucene name search for UUID seeds.

## What Was Built

URL sharing was broken: pasting a shared URL into a new tab caused `engine.explore(uuid-string)` to run a MusicBrainz Lucene text search on the UUID, returning zero matches. This plan fixes the issue by adding a dedicated engine method that takes an MBID directly.

### exploreByMbid method (Engine interface + EngineImpl)

- Added `exploreByMbid(mbid: string): Promise<Result<ExploreResult, ProviderError>>` to the `Engine` interface in `types.ts`
- Implemented `EngineImpl.exploreByMbid` with the same UUID guard pattern as `expand()` — non-UUID strings fail immediately without touching providers
- Method calls `this.resolver.mbProvider.getArtistDetails(mbid)` to get artist name, then calls `graphBuilder.reset()`, `setSeed()`, and `fetchAndMergeSimilar()` — identical graph construction flow to `explore()` but without the name search step
- Changed `EntityResolver.mbProvider` from `private readonly` to `readonly` (one-word change) to allow EngineImpl direct access

### useUrlState restore path fix

- Changed `engine.explore(seed)` to `engine.exploreByMbid(seed)` on the URL restore path (line 52)
- The write path already correctly stores `seedMbid` (a UUID) as the URL hash seed — this fix ensures the read path handles it correctly

## Tests

4 new tests added to `packages/engine/test/engine/engine.test.ts` under `describe('exploreByMbid')`:

1. Valid UUID returns `ok` result with graph data and correct `seedMbid`
2. Non-UUID string returns `err` with `kind: 'NotFoundError'` and makes 0 API calls
3. No Lucene name search is called (no requests to `musicbrainz.org/ws/2/artist?`)
4. MBID not found in MusicBrainz (404) returns `err` with `kind: 'NotFoundError'`

## Verification

All checks pass:
- `pnpm --filter @similar-artists-graph/engine test --run` — 128 tests pass (including 4 new)
- `pnpm --filter @similar-artists-graph/viewer test --run` — 91 tests pass
- `pnpm build` — full monorepo builds without TypeScript errors

## Deviations from Plan

None — plan executed exactly as written. The TDD red/green cycle was followed: tests written first (4 failures), then implementation added (4 passes, 128 total).

## Self-Check: PASSED

All created/modified files exist on disk. Both task commits (a3a9e25, 828351b) are present in git log.
