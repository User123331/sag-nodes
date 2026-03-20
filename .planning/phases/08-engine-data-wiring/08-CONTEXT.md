# Phase 8: Engine Data Wiring - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the viewer's node limit slider to the engine's actual GraphBuilder budget, fix hardcoded toast text to show real values, and store MusicBrainz external URLs in ArtistNode so Phase 10 can render them in the detail panel. Three focused wiring tasks, no new UI.

</domain>

<decisions>
## Implementation Decisions

### Node budget wiring
- Claude's discretion on approach (per-call parameter vs re-create engine) — pick what fits the codebase best
- Claude's discretion on hard cap (200 vs 512) — pick what makes phases 8+9 cleanest
- Claude's discretion on slider timing — slider change takes effect on next explore/expand, not immediate re-fetch (unless Claude finds a reason otherwise)
- Currently: `nodeLimit` in controlSlice.ts defaults to 150, only used for client-side `filterByNodeLimit()`. Engine created once via `initEngine()` in engineSlice.ts with no maxNodes override. GraphBuilder hard-caps at 200.

### External URL storage
- Add `externalUrls?: ReadonlyArray<{ type: string; url: string }>` as a **top-level field** on both `NodeAttrs` and `ArtistNode` (not nested in metadata)
- Matches the existing `ArtistDetails.externalUrls` shape already returned by MusicBrainz provider
- Only populate for artists that go through MusicBrainz detail lookup (seed + expanded artists). Similar artists from similarity lists won't have URLs unless expanded. Avoids extra API calls.

### Toast messaging
- Format: `"Node limit reached (${currentCount}/${configuredLimit}). Graph is at maximum size."` — show both current count and configured limit
- Replace hardcoded "150" in both GraphCanvas.tsx:263 and DetailPanel.tsx:58
- Toast fires on both initial explore truncation and expand truncation (current behavior, just fix the text)

### Claude's Discretion
- Implementation approach for wiring nodeLimit to engine (per-call vs re-init)
- Whether to raise hard cap from 200 to 512 now or defer to Phase 9
- Whether slider change applies only on next operation or immediately

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Engine types and budget
- `packages/engine/src/graph/types.ts` — ArtistNode and NodeAttrs interfaces (add externalUrls field here)
- `packages/engine/src/graph/GraphBuilder.ts` — DEFAULT_MAX_NODES, hard cap logic, budget enforcement
- `packages/engine/src/engine/types.ts` — EngineConfig with maxNodes option
- `packages/engine/src/engine/Engine.ts` — Engine.explore() and Engine.expand() where maxNodes propagates

### MusicBrainz external URLs
- `packages/engine/src/providers/musicbrainz/MusicBrainzProvider.ts` — `toArtistDetails()` already extracts externalUrls from relations (line 212-214)
- `packages/engine/src/types/artist.ts` — ArtistDetails interface with existing externalUrls field
- `packages/engine/src/graph/ArtistGraph.ts` — `toData()` serializes NodeAttrs to ArtistNode (needs to include externalUrls)

### Viewer wiring
- `packages/viewer/src/store/controlSlice.ts` — nodeLimit state (line 32, default 150)
- `packages/viewer/src/store/engineSlice.ts` — initEngine() call (line 18)
- `packages/viewer/src/components/GraphCanvas.tsx` — expand() call (line 257), toast (line 263), nodeLimit usage (line 176)
- `packages/viewer/src/components/DetailPanel.tsx` — expand() call (line 51), toast (line 58)
- `packages/viewer/src/components/SearchBar.tsx` — explore() call (line 83)

### Requirements
- `.planning/REQUIREMENTS.md` — BUDG-02, BUDG-03, LINK-01

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ArtistDetails.externalUrls` type already exists in `types/artist.ts` — same shape can be reused for ArtistNode
- `toArtistDetails()` in MusicBrainzProvider already parses MusicBrainz relations into `{type, url}` pairs
- `filterByNodeLimit()` utility already handles client-side node limiting

### Established Patterns
- Engine config flows through `EngineConfig` → `GraphBuilderOptions` → `GraphBuilder` constructor
- NodeAttrs in ArtistGraph map 1:1 to ArtistNode fields in `toData()`
- Toast uses `sonner` library, imported directly in components

### Integration Points
- GraphBuilder constructor receives `maxNodes` via options — needs to receive the viewer's slider value
- ArtistGraph.addOrUpdateNode() sets NodeAttrs — needs to carry externalUrls from ArtistDetails
- Engine.explore()/expand() return ArtistGraphData — downstream viewer consumes nodes with their metadata

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-engine-data-wiring*
*Context gathered: 2026-03-20*
