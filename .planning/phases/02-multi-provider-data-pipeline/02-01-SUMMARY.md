---
phase: 02-multi-provider-data-pipeline
plan: 01
subsystem: providers
tags: [listenbrainz, lastfm, deezer, tastedive, spotify, musicbrainz, entity-resolution]

# Dependency graph
requires:
  - phase: 01-engine-foundation
    provides: ProviderAdapter interface, RequestQueue, LruCache, CacheStore, Result<T,E> type, MusicBrainzProvider pattern

provides:
  - ListenBrainzProvider (MBID-in, log-normalized similarity scores)
  - LastFmProvider (MBID-in, match string → float, empty-mbid fallback)
  - DeezerProvider (deezerId-in, fixed 0.5 score, nb_fan metadata, searchDeezerArtist helper)
  - TasteDiveProvider (name-in, browser CORS detection, proxyUrl routing, fixed 0.5 score)
  - SpotifyProvider (spotifyId-in, client credentials lifecycle, 60s refresh buffer)
  - EntityResolver (name→MBID, URL→MBID, MBID→platformIds, 24h TTL cache)
  - Extended mock-fetch fixtures for all 6 providers + URL lookup + ambiguous search

affects:
  - 02-multi-provider-data-pipeline (subsequent plans use these adapters)
  - 03-graph-engine (graph traversal uses provider results)

# Tech tracking
tech-stack:
  added:
    - graphology (graph data structure, for future traversal)
    - graphology-traversal
    - string-similarity (for fuzzy name matching, available for future use)
    - "@types/string-similarity"
    - graphology-types
  patterns:
    - All providers injectable: cache, queue, fetchFn, ttlMs constructor options
    - Result<T,E> discriminated union — providers never throw, callers narrow on .ok
    - exactOptionalPropertyTypes: conditional spread for optional constructor options
    - Browser env detection via 'window' in globalThis (not typeof globalThis.window)
    - Fixed-score providers (Deezer, TasteDive, Spotify) return 0.5 — no ranking signal
    - Log normalization: score = log(count+1)/log(max+1) for ListenBrainz

key-files:
  created:
    - packages/engine/src/providers/listenbrainz/ListenBrainzProvider.ts
    - packages/engine/src/providers/listenbrainz/types.ts
    - packages/engine/src/providers/listenbrainz/index.ts
    - packages/engine/src/providers/lastfm/LastFmProvider.ts
    - packages/engine/src/providers/lastfm/types.ts
    - packages/engine/src/providers/lastfm/index.ts
    - packages/engine/src/providers/deezer/DeezerProvider.ts
    - packages/engine/src/providers/deezer/types.ts
    - packages/engine/src/providers/deezer/index.ts
    - packages/engine/src/providers/tastedive/TasteDiveProvider.ts
    - packages/engine/src/providers/tastedive/types.ts
    - packages/engine/src/providers/tastedive/index.ts
    - packages/engine/src/providers/spotify/SpotifyProvider.ts
    - packages/engine/src/providers/spotify/types.ts
    - packages/engine/src/providers/spotify/index.ts
    - packages/engine/src/resolver/EntityResolver.ts
    - packages/engine/src/resolver/types.ts
    - packages/engine/src/resolver/index.ts
    - packages/engine/test/providers/listenbrainz.test.ts
    - packages/engine/test/providers/lastfm.test.ts
    - packages/engine/test/providers/deezer.test.ts
    - packages/engine/test/providers/tastedive.test.ts
    - packages/engine/test/providers/spotify.test.ts
    - packages/engine/test/resolver/entity-resolver.test.ts
  modified:
    - packages/engine/src/index.ts (added all 5 provider + EntityResolver exports)
    - packages/engine/test/fixtures/mock-fetch.ts (extended with all provider fixtures)
    - packages/engine/test/smoke.test.ts (verifies all 6 providers + resolver exported)
    - packages/engine/tsup.config.ts (added graphology + string-similarity to noExternal)
    - packages/engine/package.json (added 5 new deps)

key-decisions:
  - "EntityResolver keeps ambiguous artists (e.g. John Williams) as separate candidates — no merging"
  - "EntityResolver uses 0.75 MB score threshold for name resolution — configurable via fuzzyThreshold"
  - "resolveUrlToMbid calls fetchFn directly (not through queue/mbProvider) to avoid rate-limit cascade"
  - "TasteDive uses browser CORS guard via 'window' in globalThis (not typeof) to satisfy exactOptionalPropertyTypes"
  - "SpotifyProvider: injectable getNow clock for deterministic token expiry testing"
  - "DeezerProvider exposes searchDeezerArtist for name-to-ID resolution; engine will use this for MBID→Deezer routing"

patterns-established:
  - "Optional constructor props use conditional spread: ...(opt !== undefined ? { key: opt } : {}) — required by exactOptionalPropertyTypes"
  - "Browser detection: 'window' in globalThis — safe under TS strict mode, no index signature issues"
  - "Multi-call mock fetch: createMockFetch([{token},{related}]) — sequential array consumed per call"
  - "Fast test queue pattern: requestsPerSecond: 1000, maxDelayMs: 0 — used in all provider tests"

requirements-completed: [PROV-03, PROV-04, PROV-05, PROV-06, PROV-07, IDEN-01, IDEN-02, IDEN-03]

# Metrics
duration: 12min
completed: 2026-03-16
---

# Phase 2 Plan 1: Provider Adapters, Entity Resolver, and Test Fixtures Summary

**Five provider adapters (ListenBrainz, Last.fm, Deezer, TasteDive, Spotify) plus EntityResolver with MBID-anchored identity mapping, 95 tests passing**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-16T09:32:46Z
- **Completed:** 2026-03-16T09:45:25Z
- **Tasks:** 8
- **Files modified:** 29

## Accomplishments

- Built all 5 remaining provider adapters following MusicBrainzProvider pattern — each injectable, Result<T,E>-typed, test-covered
- ListenBrainz: log-normalized listen-count scores (log(count+1)/log(max+1)); Spotify: full client credentials token lifecycle with 60s refresh buffer
- EntityResolver maps artist names → MBIDs (0.75 threshold), platform URLs → MBIDs via MB URL lookup, and MBIDs → Spotify/Deezer IDs via url-rels — all 24h TTL cached
- 95 tests passing across 11 test files; tsup ESM+CJS+DTS build clean

## Task Commits

1. **Task 1: Install deps + mock fixtures** - `ef03064` (chore)
2. **Task 2: ListenBrainz provider** - `e065ee3` (feat)
3. **Task 3: Last.fm provider** - `5c299e1` (feat)
4. **Task 4: Deezer provider** - `4a9ecb9` (feat)
5. **Task 5: TasteDive provider** - `8323dbf` (feat)
6. **Task 6: Spotify provider** - `ce7819b` (feat)
7. **Task 7: EntityResolver** - `2b4ae60` (feat)
8. **Task 8: Index exports + build verification** - `f51cce9` (chore)

## Files Created/Modified

- `packages/engine/src/providers/listenbrainz/` - LBRadioResponse type, log-normalized scores, pop_begin/pop_end params
- `packages/engine/src/providers/lastfm/` - match string → float, empty-mbid → name fallback
- `packages/engine/src/providers/deezer/` - /artist/:id/related, nb_fan metadata, searchDeezerArtist helper
- `packages/engine/src/providers/tastedive/` - browser CORS guard, proxyUrl routing, music: query prefix
- `packages/engine/src/providers/spotify/` - client credentials, 60s refresh buffer, injectable getNow clock
- `packages/engine/src/resolver/EntityResolver.ts` - resolveNameToMbids, resolveUrlToMbid, resolveSpotifyIdToMbid, resolveDeezerIdToMbid, getPlatformIds
- `packages/engine/src/resolver/types.ts` - ArtistCandidate, ResolvedIdentity interfaces
- `packages/engine/src/index.ts` - all new exports added
- `packages/engine/test/fixtures/mock-fetch.ts` - extended with 8 new fixture objects

## Decisions Made

- **EntityResolver no merging:** Ambiguous artists like "John Williams" produce multiple separate ArtistCandidate entries — callers choose
- **0.75 fuzzy threshold:** MB scores normalized 0-1 (raw/100); 0.75 keeps clear matches, filters weak ones. Configurable via constructor.
- **resolveUrlToMbid direct fetch:** Bypasses mbProvider's queue to avoid rate-limit cascade when resolver used concurrently with provider calls
- **SpotifyProvider getNow clock:** Injectable `() => number` factory enables deterministic token expiry tests without real time manipulation
- **'window' in globalThis:** Preferred over `typeof globalThis.window` — avoids TS7017 index signature error under strict mode

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed exactOptionalPropertyTypes violations in TasteDiveProvider**
- **Found during:** Task 8 (build verification)
- **Issue:** `this.proxyUrl = options.proxyUrl` — TS2412 with exactOptionalPropertyTypes; `typeof globalThis.window` — TS7017 implicit any
- **Fix:** Changed to `if (options.proxyUrl !== undefined) this.proxyUrl = options.proxyUrl`; changed detection to `'window' in globalThis`
- **Files modified:** `packages/engine/src/providers/tastedive/TasteDiveProvider.ts`
- **Verification:** `pnpm build` DTS phase passes, tests still 9/9
- **Committed in:** `f51cce9`

**2. [Rule 1 - Bug] Fixed exactOptionalPropertyTypes violations in EntityResolver**
- **Found during:** Task 8 (build verification)
- **Issue:** Three TS2412 errors — MusicBrainzProvider constructor given `undefined`-typed opts; platformId string assignments from possibly-undefined array element
- **Fix:** Conditional spread for MB provider options; added `if (id !== undefined)` guard before platformId assignment
- **Files modified:** `packages/engine/src/resolver/EntityResolver.ts`
- **Verification:** `pnpm build` DTS phase passes; resolver tests still 12/12
- **Committed in:** `f51cce9`

---

**Total deviations:** 2 auto-fixed (both Rule 1 — TypeScript strictness bugs caught by DTS build)
**Impact on plan:** Both fixes required for correct TypeScript types under `exactOptionalPropertyTypes: true`. No scope creep.

## Issues Encountered

None beyond the auto-fixed TypeScript strictness issues above.

## Next Phase Readiness

- All 6 providers + EntityResolver exported from `packages/engine/src/index.ts`
- Ready for plan 02-02: multi-provider orchestration layer that fans out across providers and merges results
- Blocker note: Spotify `getRelatedArtists` API was deprecated in Nov 2024 — PROV-07 may need to pivot to search-based similarity in later plans

---
*Phase: 02-multi-provider-data-pipeline*
*Completed: 2026-03-16*
