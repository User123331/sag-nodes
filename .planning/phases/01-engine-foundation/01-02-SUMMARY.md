---
phase: 01-engine-foundation
plan: "02"
subsystem: engine
tags: [typescript, p-queue, lru-cache, musicbrainz, rate-limiting, circuit-breaker, result-type]

requires:
  - phase: 01-engine-foundation-01-01
    provides: pnpm monorepo with tsup engine and vitest test infrastructure

provides:
  - Result<T,E> type with ok/err constructors (no exceptions from provider methods)
  - ProviderError typed union (NetworkError | RateLimitError | NotFoundError | ParseError | AuthError | CircuitOpenError)
  - ProviderAdapter interface with ProviderCapabilities and ProviderConfig
  - ArtistSummary, SimilarArtist, ArtistDetails data shapes
  - CacheStore interface with LRU implementation (TTL, injectable clock, max-size eviction)
  - RequestQueue wrapping p-queue with exponential backoff retry and circuit breaker
  - MusicBrainzProvider implementing searchArtist and getArtistDetails with cache + rate limit
  - 40 passing unit tests covering all components

affects: [02-provider-expansion, 03-graph-engine, viewer]

tech-stack:
  added: [p-queue@9]
  patterns:
    - Result<T,E> discriminated union — providers return Result, never throw
    - Injectable dependencies (fetchFn, cache, queue, getNow clock) for deterministic testing
    - Exponential backoff with jitter (base * 2^attempt, +-20%, capped at maxDelayMs)
    - Circuit breaker with configurable threshold and duration, auto-close on time expiry

key-files:
  created:
    - packages/engine/src/types/result.ts
    - packages/engine/src/types/errors.ts
    - packages/engine/src/types/artist.ts
    - packages/engine/src/types/provider.ts
    - packages/engine/src/types/index.ts
    - packages/engine/src/cache/CacheStore.ts
    - packages/engine/src/cache/LruCache.ts
    - packages/engine/src/cache/index.ts
    - packages/engine/src/queue/backoff.ts
    - packages/engine/src/queue/RequestQueue.ts
    - packages/engine/src/queue/index.ts
    - packages/engine/src/providers/musicbrainz/types.ts
    - packages/engine/src/providers/musicbrainz/MusicBrainzProvider.ts
    - packages/engine/src/providers/musicbrainz/index.ts
    - packages/engine/test/cache/lru-cache.test.ts
    - packages/engine/test/queue/backoff.test.ts
    - packages/engine/test/queue/request-queue.test.ts
    - packages/engine/test/fixtures/mock-fetch.ts
    - packages/engine/test/providers/musicbrainz.test.ts
  modified:
    - packages/engine/src/index.ts
    - packages/engine/package.json

key-decisions:
  - "Result<T,E> discriminated union (not thrown exceptions) is the provider contract — callers narrow on .ok"
  - "LRU eviction via Map insertion order (delete-then-reinsert for MRU promotion) — no external lib needed"
  - "RequestQueue injectable getNow clock enables circuit-breaker tests without real time delays"
  - "MusicBrainzProvider options accept injectable queue/cache/fetchFn — allows fast test queues to bypass backoff delays"
  - "exactOptionalPropertyTypes TS strictness requires conditional spread for optional fields in toArtistSummary/toArtistDetails"

patterns-established:
  - "Pattern: Result type — all async provider methods return Result<T, ProviderError>, never throw"
  - "Pattern: Injectable clock — classes accepting getNow:()=>number for deterministic time-based tests"
  - "Pattern: Injectable queue — provider constructors accept optional RequestQueue for test speed control"
  - "Pattern: Mock fetch — createMockFetch(responses[]) cycles through sequential responses for HTTP testing"

requirements-completed: [PROV-01, PROV-02, RATE-01, RATE-02, RATE-03, RATE-04]

duration: 8min
completed: 2026-03-16
---

# Phase 1 Plan 02: Provider Interface, Rate-Limited Queue, Cache, and MusicBrainz Adapter Summary

**Result<T,E> type, ProviderAdapter interface, LRU cache, p-queue-backed circuit-breaking request queue, and MusicBrainzProvider with 40 passing unit tests**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-16T01:23:52Z
- **Completed:** 2026-03-16T01:31:26Z
- **Tasks:** 7
- **Files modified:** 21

## Accomplishments

- Full provider infrastructure: Result type, ProviderError union, ProviderAdapter/ProviderCapabilities interfaces
- LruCache with TTL-based expiry, LRU eviction via Map insertion order, injectable clock for tests
- RequestQueue with p-queue, exponential backoff jitter, circuit breaker (threshold/duration), event emitter
- MusicBrainzProvider: searchArtist and getArtistDetails with rate limit, caching, 404/429/503 error mapping
- 40 unit tests passing; CJS build has p-queue inlined (no bare require); zero TypeScript errors

## Task Commits

1. **Task 01-02-01: Core types** - `6170429` (feat)
2. **Task 01-02-02: CacheStore + LRU** - `5120768` (feat)
3. **Task 01-02-03: Backoff utility** - `e7725c2` (feat)
4. **Task 01-02-04: RequestQueue** - `09e37ff` (feat)
5. **Task 01-02-05: MusicBrainz provider** - `0466504` (feat)
6. **Task 01-02-06: MusicBrainz tests** - `c9f68cc` (feat)
7. **Task 01-02-07: Full verification** - `2f391d8` (chore)

## Files Created/Modified

- `packages/engine/src/types/result.ts` - Result<T,E> type with ok/err constructors
- `packages/engine/src/types/errors.ts` - ProviderError union (6 error kinds), ProviderId
- `packages/engine/src/types/artist.ts` - ArtistSummary, SimilarArtist, ArtistDetails interfaces
- `packages/engine/src/types/provider.ts` - ProviderAdapter, ProviderConfig, ProviderCapabilities
- `packages/engine/src/types/index.ts` - barrel re-export
- `packages/engine/src/cache/CacheStore.ts` - CacheStore interface
- `packages/engine/src/cache/LruCache.ts` - LRU implementation with TTL and injectable clock
- `packages/engine/src/queue/backoff.ts` - calculateBackoff with jitter and configurable cap
- `packages/engine/src/queue/RequestQueue.ts` - p-queue wrapper with retry and circuit breaker
- `packages/engine/src/providers/musicbrainz/types.ts` - MB API response shapes
- `packages/engine/src/providers/musicbrainz/MusicBrainzProvider.ts` - full provider adapter
- `packages/engine/src/index.ts` - updated public API barrel
- `packages/engine/test/cache/lru-cache.test.ts` - 9 LRU tests
- `packages/engine/test/queue/backoff.test.ts` - 7 backoff tests
- `packages/engine/test/queue/request-queue.test.ts` - 12 queue/circuit-breaker tests
- `packages/engine/test/fixtures/mock-fetch.ts` - createMockFetch + MB mock data
- `packages/engine/test/providers/musicbrainz.test.ts` - 11 provider integration tests

## Decisions Made

- Result<T,E> discriminated union chosen over exceptions for provider contract; callers narrow on `.ok`
- LRU eviction implemented via Map insertion order (delete+reinsert for MRU) without external lib
- RequestQueue injectable `getNow` clock enables circuit-breaker time tests without real delays
- MusicBrainzProvider accepts injectable queue/cache/fetchFn to allow fast test queues that bypass backoff
- TypeScript `exactOptionalPropertyTypes` strictness requires conditional spread pattern for optional fields

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed exactOptionalPropertyTypes TypeScript errors in MusicBrainzProvider**
- **Found during:** Task 05 (MusicBrainz provider adapter)
- **Issue:** `satisfies ProviderError` with `retryAfterMs: undefined` failed `exactOptionalPropertyTypes`; object literals with optional undefined fields in `toArtistSummary`/`toArtistDetails` also failed
- **Fix:** RateLimitError construction uses conditional expression; toArtistSummary/toArtistDetails use conditional spread `...(field !== undefined ? { field } : {})`
- **Files modified:** packages/engine/src/providers/musicbrainz/MusicBrainzProvider.ts
- **Verification:** `pnpm build` DTS build passes with zero errors
- **Committed in:** 0466504 (Task 05 commit)

**2. [Rule 2 - Missing Critical] Added injectable RequestQueue to MusicBrainzProvider options**
- **Found during:** Task 06 (MusicBrainz tests)
- **Issue:** Tests with 503/429/500 error responses timed out (5s) because the real RequestQueue used `requestsPerSecond: 1` (1s interval) combined with backoff delays for 3 retries
- **Fix:** Added `queue?: RequestQueue` to `MusicBrainzProviderOptions`; tests inject a fast queue (`requestsPerSecond: 1000, maxDelayMs: 0`)
- **Files modified:** packages/engine/src/providers/musicbrainz/MusicBrainzProvider.ts, packages/engine/test/providers/musicbrainz.test.ts
- **Verification:** All 11 MusicBrainz tests pass in <1s
- **Committed in:** c9f68cc (Task 06 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 2 missing critical)
**Impact on plan:** Both fixes required for build correctness and test viability. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations documented above.

## User Setup Required

None - no external service configuration required. MusicBrainz API requires no auth key.

## Next Phase Readiness

- Provider infrastructure complete: any future provider implements `ProviderAdapter` and injects `RequestQueue` + `LruCache`
- MusicBrainzProvider ready for use as identity anchor in graph traversal (Phase 2+)
- Phase 02 (provider expansion) can implement Last.fm, Deezer, and ListenBrainz following the same patterns

---
*Phase: 01-engine-foundation*
*Completed: 2026-03-16*

## Self-Check: PASSED

All 6 key files verified present. All 7 task commits verified in git log.
