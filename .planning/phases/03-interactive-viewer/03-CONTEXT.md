# Phase 3: Interactive Viewer - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can search for any artist and explore an interactive force-directed graph with click-to-expand, rich detail panels, and smooth performance at 200+ nodes. This phase delivers: react-force-graph-2d rendering with Canvas/WebGL, artist search with autocomplete, Zustand state management wired to engine events, detail panel with cross-platform metadata, node/edge visual styling, expansion animations, and dark-first UI. Control panel, export, URL sharing, and keyboard nav are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Graph Visual Design
- **Node sizing**: Fan count (Deezer `nb_fan`) determines node radius. Fallback to minimum size when no fan data is available. Logarithmic scale to prevent huge disparity between mainstream and niche artists
- **Node coloring**: Auto-cluster MusicBrainz tags into genre families (rock, electronic, hip-hop, jazz, pop, metal, etc.), assign each family a color from d3-scale-chromatic palette. Mixed-genre artists get dominant tag's color. No-tag artists render neutral gray
- **Edge styling**: Opacity-only — all edges same thin width, opacity scales linearly with fusedScore (strong = fully opaque, weak = near-transparent). Keeps graph clean at 200+ nodes
- **Node labels**: Zoom-adaptive — at full zoom-out, only seed node and largest nodes show labels. As user zooms in, more labels become visible. All nodes labeled at close zoom. Clean text rendering at every zoom level

### Search & Autocomplete
- **Disambiguation display**: Two-line dropdown rows — artist name on first line, disambiguation + country as smaller gray subtitle text
- **Loading state**: Skeleton placeholder rows (3-4 shimmering rows) in dropdown while MusicBrainz responds
- **Graph initial load**: Seed node appears at center immediately after artist selection. Radial pulse animation while providers respond. Nodes appear progressively as each provider returns data. Force simulation settles into layout over ~1 second
- **Search bar persistence**: Stays visible at top-center after graph loads, slightly translucent. Shows current artist name with clear (X) button. Always accessible for new searches without extra clicks

### Detail Panel
- **Panel type**: Right drawer, ~320px fixed width, slides in from right edge. Graph viewport resizes to accommodate. Panel has its own scroll for long content
- **Content (rich cross-platform)**: Artist image (when available), name, genre tags, fan count, similarity score to seed, provider source badges, external links, list of connected artists in current graph, Expand button
- **External links**: Constructed from stored IDs — no extra API calls. MusicBrainz from MBID, Spotify from spotifyId, Deezer from deezerId, Last.fm from encoded artist name. Only show links where ID exists
- **Missing data handling**: Graceful hide — don't render sections with no data. Panel adjusts height naturally. No placeholder text or "unknown" labels

### Expansion Interaction
- **Click behavior**: Single click = select node (highlight it, dim others) + open detail panel. Double-click = quick expand (shortcut for power users). Expand also available via panel button
- **Bloom animation**: Radial bloom — new nodes spawn at the expanded node's position, force simulation pushes them outward naturally. Organic, physics-based feel
- **Node loading indicator**: Pulsing glow animation on the expanding node while providers fetch data. Other nodes stay fully interactive during fetch
- **Budget truncation UX**: Non-blocking toast notification at bottom when node limit is reached: "Node limit reached (150/150). Graph is at maximum size." Toast fades after 5 seconds. Graph stays fully interactive

### Claude's Discretion
- Exact d3-scale-chromatic palette selection for genre colors
- Genre tag clustering algorithm (mapping raw MusicBrainz tags to families)
- Debounce timing for search input
- Exact zoom threshold for label visibility
- Force simulation parameters (charge strength, link distance, decay)
- Toast notification implementation approach
- Zustand store shape and slice organization
- CSS approach for dark theme (CSS variables, Tailwind, or vanilla)
- react-force-graph-2d configuration for Canvas vs WebGL mode

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specs
- `.planning/PROJECT.md` — Constraints: no paid APIs, <50KB engine bundle, MIT license, SSR-safe engine, ESM-first. Key decisions: react-force-graph-2d, Zustand, Vite, monospace/system fonts
- `.planning/REQUIREMENTS.md` — Requirement definitions for VIS-01 through VIS-08, SRCH-01 through SRCH-03, DETL-01 through DETL-06, UI-01 through UI-04
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria (5 criteria), plan breakdown (03-01 graph + search + store, 03-02 detail panel + styling + animation + polish)

### Prior Phase Context
- `.planning/phases/01-engine-foundation/01-CONTEXT.md` — Provider interface contract (Result<T, ProviderError>), rate limiting/retry, cache strategy, error typing, event-based health
- `.planning/phases/02-multi-provider-data-pipeline/02-CONTEXT.md` — Entity resolution, score fusion (equal average), node budget (150 default, 200 hard cap), engine API (explore/expand), provider attribution per edge, progressive results

### Engine API Types (key files to read)
- `packages/engine/src/engine/types.ts` — Engine, EngineConfig, ExploreResult, ProviderCredentials interfaces
- `packages/engine/src/graph/types.ts` — ArtistNode, SimilarityEdge, ArtistGraphData, NodeAttrs, EdgeAttrs, ProviderAttribution
- `packages/engine/src/types/artist.ts` — ArtistSummary (search results), ArtistDetails, SimilarArtist
- `packages/engine/src/index.ts` — Full public API surface (createEngine, all types)

### External Library Documentation
- react-force-graph-2d (npm) — Force-directed graph React component, Canvas/WebGL rendering, node/link customization API
- d3-scale-chromatic (npm) — Color scales for genre clustering
- Zustand (npm) — Lightweight React state management

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createEngine()` factory: Returns `Engine` with `explore(artistName)` and `expand(mbid)` — viewer's primary data source
- `MusicBrainzProvider.searchArtist()`: Returns `ArtistSummary[]` with `name`, `disambiguation`, `country`, `score`, `tags` — powers autocomplete
- `ExploreResult`: Extends `ArtistGraphData` with `warnings[]` — viewer can show provider failure toasts
- `ArtistNode.metadata`: Contains `nb_fan` (sizing), `imageUrl` (panel), `spotifyId`/`deezerId` (external links)
- `SimilarityEdge.attribution[]`: Per-provider raw scores — viewer can show breakdown on hover/panel

### Established Patterns
- `Result<T, ProviderError>` discriminated union — viewer must handle `.ok` success and error cases from engine
- Injectable deps pattern — viewer can pass custom `fetchFn` and `cache` to engine if needed
- Event-based health (`onProviderError`, `onProviderRecovery`, `onRateLimitHit`) — viewer can subscribe for status indicators

### Integration Points
- `packages/viewer/src/App.tsx`: Currently empty shell — all Phase 3 code goes here
- `packages/viewer/package.json`: React 19, Vite 8, no state management or graph libs yet — need to add react-force-graph-2d, zustand, d3-scale-chromatic
- Engine is workspace dependency: `@similar-artists-graph/engine` importable from viewer

</code_context>

<specifics>
## Specific Ideas

- User chose all recommended defaults throughout — prioritizes clean, performant, progressive UX
- Progressive loading pattern: seed node appears immediately, other nodes bloom in as providers respond — feels fast even with multi-provider latency
- Single-click = select + detail, double-click = quick expand — two distinct interaction paths, discoverable but not required
- Graph is the primary UI — detail panel supplements but doesn't dominate. Minimal chrome principle carries through

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-interactive-viewer*
*Context gathered: 2026-03-16*
