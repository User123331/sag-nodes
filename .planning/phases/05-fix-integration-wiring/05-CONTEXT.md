# Phase 5: Fix Integration Wiring - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix three integration bugs identified by the v1.0 milestone audit: URL restore (SHAR-01), rate-limit cooldown dispatch (STAT-02), and edge thickness by similarity (VIS-04). All three are wiring/rendering bugs in existing code — no new features.

</domain>

<decisions>
## Implementation Decisions

### URL Restore (SHAR-01)
- Claude's discretion on approach — either store artist name in URL hash alongside MBID, or add `engine.expandByMbid()` to bypass name-search. Choose whichever is cleaner.
- Claude's discretion on whether to restore providers from URL hash or use defaults on restore.
- Current bug: `useUrlState.ts:52` passes MBID (UUID) to `engine.explore()` which runs Lucene text search — UUID text search returns zero matches.
- Write path correctly stores `seedMbid` in URL hash. Read path is broken.

### Rate-Limit Cooldown (STAT-02)
- Default 30s cooldown when `retryAfterMs` is missing (Deezer, TasteDive don't provide it)
- Auto-retry after cooldown expires — if provider responds, clear the badge; if still limited, restart 30s timer
- Providers always stay available for retry — no auto-disable after repeated rate limits. Badge is informational only.
- Current bug: `setProviderCooldown` action defined in controlSlice.ts:54 but never dispatched. `GraphCanvas.handleExpand` only calls `setProviderStatus(id, 'erroring')` without inspecting `RateLimitError.retryAfterMs`.
- Fix location: `GraphCanvas.handleExpand` error handling path — detect `RateLimitError` from `result.value.warnings`, dispatch `setProviderCooldown(id, endsAt)`.

### Edge Thickness (VIS-04)
- Subtle thickness range: 1x-2x (weak edges ~0.5px, strong edges ~1.5px). Opacity still does most visual work.
- Boost selected node's edges: 1.5x thickness multiplier on direct edges when a node is selected.
- Current bug: `GraphCanvas.tsx renderLink` uses `ctx.lineWidth = 1 / globalScale` (fixed). Only opacity varies by fusedScore.
- Fix: scale `lineWidth` by `fusedScore` within the 0.5-1.5px range, plus selection boost.

### Claude's Discretion
- URL restore approach (name-in-hash vs engine method)
- Provider restoration from URL
- Exact cooldown retry mechanism implementation
- Edge thickness scaling curve (linear vs eased)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Audit evidence
- `.planning/v1.0-MILESTONE-AUDIT.md` — Full gap descriptions, evidence, and fix suggestions for all three bugs

### URL restore
- `packages/viewer/src/hooks/useUrlState.ts` — Broken restore path (line 52), working write path (line 70-73)
- `packages/engine/src/engine/Engine.ts` — `explore()` method (line 133), only takes `artistName`
- `packages/engine/src/engine/types.ts` — Engine interface (line 31), `explore` signature

### Rate-limit cooldown
- `packages/viewer/src/store/controlSlice.ts` — `setProviderCooldown` action (line 54), `providerCooldownEndsAt` state (line 9)
- `packages/viewer/src/components/GraphCanvas.tsx` — `handleExpand` (line 189-228), where cooldown dispatch should go
- `packages/engine/src/types/errors.ts` — `RateLimitError` type with optional `retryAfterMs` (line 10-13)

### Edge thickness
- `packages/viewer/src/components/GraphCanvas.tsx` — `renderLink` callback (line 416-447), fixed `lineWidth` at line 445

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `controlSlice.setProviderCooldown(id, endsAt)`: Already implemented — just needs to be called
- `controlSlice.providerCooldownEndsAt`: Already wired to ControlPanel for countdown display
- `RateLimitError.retryAfterMs`: Already populated by MusicBrainz, ListenBrainz, Spotify providers; missing from Deezer, TasteDive
- `encodeHash()` / `decodeHash()` in useUrlState.ts: URL encoding already handles seed, depth, providers params

### Established Patterns
- `Result<T,E>` discriminated union: `result.ok` check pattern throughout viewer
- `result.value.warnings[]`: Array of per-provider errors from expand — each has `.provider` and `.error` fields
- Provider errors are `ProviderError` union type from `errors.ts` — need to narrow to `RateLimitError` kind
- `useRef` for stale closure avoidance in Canvas callbacks (extensive pattern in GraphCanvas)

### Integration Points
- `handleExpand` is the single point where expand results and provider errors are processed
- `renderLink` Canvas callback is where edge rendering happens — receives `ForceLink` with `fusedScore`
- `useUrlState` mount effect is the single point where URL hash is read on page load
- ControlPanel already reads `providerCooldownEndsAt` — once dispatched, the display should "just work"

</code_context>

<specifics>
## Specific Ideas

- Rate-limit auto-retry: 30s default cooldown, then automatically retry. Self-healing rather than manual intervention.
- Edge thickness subtle (1x-2x) with selection boost (1.5x) — opacity remains the primary visual differentiator, thickness is secondary.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-fix-integration-wiring*
*Context gathered: 2026-03-17*
