# Project Research Summary

**Project:** Similar Artists Graph Engine
**Domain:** Multi-provider artist similarity graph exploration / music discovery
**Researched:** 2026-03-16
**Confidence:** HIGH

## Executive Summary

The Similar Artists Graph Engine is a monorepo (engine library + React viewer) that aggregates artist similarity data from 6 free/open APIs (ListenBrainz, MusicBrainz, Last.fm, Deezer, TasteDive, and optionally Spotify) into an interactive force-directed graph. The established pattern for this domain is a pipeline architecture: provider adapters fan out in parallel, an entity resolution layer deduplicates results using MusicBrainz IDs (MBIDs) as canonical anchors, a graph builder constructs weighted adjacency lists, and a presentation layer renders via Canvas-based force-directed layout. No existing open-source tool does multi-provider similarity fusion -- competitors like Music-Map use a single source, Every Noise at Once is defunct post-Spotify layoffs, and Chartmetric is a $160/mo SaaS. This project fills a genuine ecosystem gap.

The recommended approach is to build the engine's infrastructure first (types, request queue, caching, event system), then implement providers incrementally starting with MusicBrainz (identity anchor), then entity resolution and graph construction, and finally the React viewer. The stack is well-established: TypeScript 5.7+, Vite 8, tsup for engine builds, react-force-graph-2d for visualization, Zustand for state, and p-queue for rate limiting. Critical version requirement: Node.js 20.19+ (Vite 8 dependency). Spotify is explicitly NOT a viable primary data source -- its February 2026 API restrictions gutted all useful similarity endpoints for new apps. Treat it as optional metadata enrichment only.

The three highest risks are: (1) graph combinatorial explosion -- each artist yields ~20 similar artists, so depth 3 means 8,000 nodes without budgeting, (2) cross-provider entity resolution failures -- the same artist has different names/IDs across providers, and naive matching creates duplicate nodes or worse, merges different artists, and (3) API rate limit cascade -- MusicBrainz allows only 1 req/s while parallel provider fan-out can trigger simultaneous throttling across all sources. All three must be addressed in the engine's core architecture (Phase 1), not bolted on later.

## Key Findings

### Recommended Stack

The stack is high-confidence with most choices already decided by the project. TypeScript strict mode, pnpm workspaces, and native `fetch` (no axios) are constraints. The key decisions are Vite 8 with Rolldown for the viewer (10-30x faster builds), tsup for the engine library (ESM+CJS dual output), and p-queue for per-provider rate limiting (actively maintained, ESM-native, unlike the abandoned Bottleneck).

**Core technologies:**
- **react-force-graph-2d 1.29**: Canvas-based force graph -- handles 200+ nodes; SVG alternatives choke at ~100
- **p-queue 9.1**: Per-provider rate limiting -- ESM-native, concurrency + interval control
- **string-similarity 4.0.4**: Artist name deduplication -- Sorensen-Dice coefficient at 700 bytes, not Fuse.js (wrong tool for pairwise comparison)
- **Custom LRU cache**: In-memory with TTL -- no external dependency; engine must stay under 50KB gzipped
- **MusicBrainz MBID**: Canonical artist identity -- universal identifier across ListenBrainz, Last.fm, and metadata systems

**Data provider strategy:** Multi-source weighted merge. Primary similarity from Last.fm (best match scores) and ListenBrainz (no auth, MBID-native). Supplemented by Deezer (no auth, good metadata) and TasteDive (content-based diversity). Spotify is metadata-only (images, genres). MusicBrainz provides identity resolution, not similarity.

### Expected Features

**Must have (table stakes):**
- Seed artist search with MusicBrainz autocomplete
- Force-directed graph rendering with zoom/pan/drag (Canvas, not SVG)
- Click-to-expand recursive exploration (the killer interaction)
- Hover/click detail panel with cross-platform merged metadata
- Node sizing by popularity, coloring by genre
- Edge weight visualization (thickness/opacity = similarity strength)
- Multi-provider data fetching (minimum 3 providers)
- Rate-limit-aware request queue with caching
- Dark-first UI

**Should have (differentiators):**
- Provider toggle control panel (no competitor offers data source transparency)
- Similarity source attribution on edges ("why are these artists connected?")
- Graph data export (JSON + GEXF for Gephi)
- Depth slider and expansion controls
- URL-based shareable graph state
- Provider status dashboard

**Defer (v2+):**
- Engine as standalone npm package (needs stable API boundary first)
- Alternative graph layouts (radial, hierarchical)
- Advanced filtering by genre/provider/popularity
- Artist comparison mode

### Architecture Approach

Four-layer pipeline: Provider (adapters + rate-limited queue), Resolution (MBID anchor + fuzzy matching + dedup), Graph (adjacency list + weighted edges + expansion), Presentation (react-force-graph-2d + Zustand + UI panels). Engine owns layers 1-3 as a framework-agnostic library. Viewer owns layer 4. Communication is event-driven -- engine emits typed events, viewer subscribes. This boundary ensures the engine is SSR-safe and reusable outside React.

**Major components:**
1. **ProviderRegistry + Adapters** -- fan-out orchestration with graceful degradation (Promise.allSettled, never fail completely)
2. **EntityResolver** -- MBID-anchored dedup with 5-step resolution: direct MBID, cached ID mapping, MusicBrainz search, fuzzy matching, provisional ID
3. **GraphBuilder** -- adjacency list with attributed edges tracking per-provider similarity scores; merge logic for expansion without duplicates
4. **Engine Facade** -- public API surface (`explore()`, `expand()`) with typed event emitter
5. **GraphStore + Renderer** -- Zustand store consuming engine events; react-force-graph-2d with level-of-detail rendering

### Critical Pitfalls

1. **Graph combinatorial explosion** -- Hard-cap visible nodes at 150-200; limit expansion to top 5-8 similar artists per click, not the full 20+ each provider returns. Use a node budget in the engine, not just depth limits. Must be designed into Phase 1.
2. **Cross-provider entity resolution failures** -- Never assume artist names are unique. "John Williams" has multiple MBIDs. Build a dedicated EntityResolver module; never silently merge low-confidence matches. Test with ambiguous names, not just "Radiohead".
3. **API rate limit cascade** -- Per-provider queues are mandatory. MusicBrainz requires custom User-Agent header (missing = instant 403) and allows only 1 req/s. Stagger provider requests; show per-provider status indicators. Must be Phase 1 infrastructure.
4. **Spotify as dependency black hole** -- Do NOT build any core feature on Spotify data. Every feature must work with zero Spotify data. Build Spotify adapter last, if at all.
5. **react-force-graph performance cliff** -- Degrades visibly after ~200 nodes with custom rendering. Use simple shapes only; implement level-of-detail (labels only when zoomed in); enable `autoPauseRedraw`. Benchmark at 200 nodes as a CI gate.
6. **TasteDive CORS limitation** -- No CORS support. Must be called from server-side/Node.js, not browser. Requires a proxy or server-side execution path.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Engine Foundation
**Rationale:** Everything depends on shared types, request queue, caching, and event system. The architecture research is unambiguous: types first, then infrastructure, then a single provider to prove the pipeline end-to-end.
**Delivers:** Core TypeScript interfaces, per-provider request queue with rate limiting, LRU cache with TTL, typed event emitter, MusicBrainz adapter (the identity anchor), and the engine facade shell.
**Addresses:** Rate-limit-aware request queue, MBID identity model, dark-first monorepo scaffolding
**Avoids:** Rate limit cascade (queue built first), entity resolution failures (MBID model defined early), graph explosion (node budget in types)

### Phase 2: Provider Layer + Entity Resolution
**Rationale:** With infrastructure in place, add similarity providers incrementally. Entity resolution must be built alongside providers because deduplication quality depends on real multi-provider data. ListenBrainz first (no auth, uses MBID natively), then Last.fm (best similarity scores, needs API key), then Deezer (no auth, good metadata).
**Delivers:** 3-4 working provider adapters, EntityResolver with fuzzy matching, cross-provider deduplication, metadata merging, provider coverage indicators.
**Addresses:** Multi-provider data fusion, cross-platform identity resolution, similarity score normalization
**Avoids:** Entity resolution failures (dedicated module, tested with ambiguous names), stale/missing data (explicit "no data" handling per provider), Spotify trap (Spotify is NOT in this phase)

### Phase 3: Graph Construction + Engine API
**Rationale:** With resolved, deduplicated artist data flowing from multiple providers, build the graph data model and public API. The GraphBuilder depends on EntityResolver output. The Engine Facade wires everything together.
**Delivers:** Adjacency list graph with weighted attributed edges, `explore()` and `expand()` public API, graph merge logic for expansion, node budget enforcement, serializable graph output.
**Addresses:** Click-to-expand data pipeline, edge weight computation, expansion budgeting
**Avoids:** Graph combinatorial explosion (node budget enforced in engine), provider-aware graph layer anti-pattern

### Phase 4: Viewer Core
**Rationale:** The engine now produces complete graph data. Build the React viewer that consumes it. react-force-graph-2d rendering, Zustand store subscribing to engine events, seed artist search UI, basic detail panel.
**Delivers:** Working end-to-end application: search for an artist, see the graph, click to expand, view metadata on hover/click. Dark-first UI.
**Addresses:** Force-directed rendering, zoom/pan/drag, seed artist search, hover detail panel, node sizing/coloring, edge weight visualization
**Avoids:** Performance cliff (LOD rendering from the start, benchmark at 200 nodes), React state as graph source of truth (engine owns data)

### Phase 5: Viewer Enhancements + Additional Providers
**Rationale:** Core product is working. Add differentiating features and remaining providers. TasteDive (needs CORS proxy), Spotify (optional metadata only). Provider toggle panel, depth slider, export, URL sharing.
**Delivers:** Provider toggle control panel, graph export (JSON + GEXF), depth slider, provider status dashboard, similarity source attribution, URL-based shareable state, TasteDive + Spotify adapters.
**Addresses:** All P2 differentiator features, remaining provider integrations
**Avoids:** Spotify dependency (strictly optional, works without it)

### Phase Ordering Rationale

- **Infrastructure before providers** because every provider adapter needs the request queue and cache. Building providers without them means retrofitting every adapter later.
- **MusicBrainz before other providers** because it is the identity anchor. Entity resolution cannot be tested without it.
- **Graph construction after entity resolution** because the graph requires deduplicated nodes. Building the graph on raw provider data creates the anti-pattern of provider-aware graph logic.
- **Viewer after engine** because the viewer consumes the engine's public API. Building the viewer first creates tight coupling between React state and graph logic, violating the SSR-safe engine requirement.
- **Enhancements last** because they are additive. The core product (search, graph, expand, detail) must work before adding toggles, export, and sharing.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Providers + Resolution):** Each provider API has undocumented quirks. Last.fm `artist.getSimilar` stability needs early validation. TasteDive CORS workaround architecture needs design. Entity resolution confidence thresholds need tuning with real data.
- **Phase 4 (Viewer Core):** react-force-graph-2d configuration for level-of-detail rendering, force simulation tuning for expansion (fixing existing nodes, simulating only new ones), and Canvas performance optimization at 200 nodes.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Engine Foundation):** Well-documented patterns for TypeScript monorepo setup, request queuing, LRU caching, and event emitters. No novel decisions.
- **Phase 3 (Graph Construction):** Adjacency list with weighted edges is a textbook data structure. Edge weight normalization is straightforward math.
- **Phase 5 (Enhancements):** Provider toggles, export, URL state are standard React/UI patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core technologies verified against npm/official docs with current versions. Vite 8, Vitest 4, tsup 8.5, p-queue 9.1 all confirmed. |
| Features | HIGH | Competitor analysis covers 5 products. Feature prioritization grounded in real user expectations from graph tools. Anti-features well-reasoned. |
| Architecture | HIGH | Pipeline pattern is well-established for multi-source aggregation. Component boundaries are clean. Event-driven engine-viewer separation is proven. |
| Pitfalls | HIGH | All pitfalls verified against official API docs and community reports. Spotify restrictions confirmed against Feb 2026 changelog. Rate limits from official documentation. |

**Overall confidence:** HIGH

### Gaps to Address

- **Last.fm `artist.getSimilar` reliability:** Reports of instability in 2025 for `track.getSimilar`, but `artist.getSimilar` status is unconfirmed. Must test early in Phase 2. Fallback plan: ListenBrainz + Deezer carry the similarity data if Last.fm is unreliable.
- **ListenBrainz rate limits:** Documented as "generous" but no hard numbers published. Must read response headers dynamically and adapt. Start conservative at ~1 req/s.
- **Deezer rate limit specifics:** Poorly documented. Research says 50 req/5s but this needs empirical validation.
- **TasteDive CORS proxy architecture:** Must decide between server-side proxy, serverless function, or Node.js-only execution path. This affects whether TasteDive works in browser-only deployments.
- **Entity resolution confidence thresholds:** What Sorensen-Dice score threshold triggers auto-merge vs. "tentative" flagging? Needs tuning with real multi-provider data, not predetermined.
- **react-force-graph-2d at 200 nodes with LOD:** Performance claims need benchmarking on target hardware (2020 MacBook Air baseline). No published benchmarks at exactly our target configuration.

## Sources

### Primary (HIGH confidence)
- [MusicBrainz API docs](https://musicbrainz.org/doc/MusicBrainz_API) -- rate limiting, MBID, search
- [ListenBrainz API docs](https://listenbrainz.readthedocs.io/en/latest/users/api/index.html) -- similar artists, rate headers
- [Last.fm API docs](https://www.last.fm/api) -- artist.getSimilar, API key requirements
- [Spotify Feb 2026 Migration Guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) -- endpoint removals, Dev Mode restrictions
- [react-force-graph GitHub](https://github.com/vasturiano/react-force-graph) -- v1.29, performance issues, configuration
- [Vite 8 announcement](https://vite.dev/blog/announcing-vite8) -- Rolldown integration, Node 20.19+ requirement
- [p-queue GitHub](https://github.com/sindresorhus/p-queue) -- v9.1, ESM-native rate limiting

### Secondary (MEDIUM confidence)
- [MusicLynx academic paper](https://dl.acm.org/doi/fullHtml/10.1145/3184558.3186970) -- multi-source similarity patterns
- [Cambridge Intelligence graph UX](https://cambridge-intelligence.com/graph-visualization-ux-how-to-avoid-wrecking-your-graph-visualization/) -- hairball avoidance, progressive disclosure
- [Deezer API docs](https://developers.deezer.com/api) -- rate limits poorly documented
- [TasteDive API docs](https://tastedive.com/read/api) -- 300 req/hr, CORS limitations

### Tertiary (LOW confidence)
- ListenBrainz rate limits -- no published hard numbers, inferred from community posts
- Deezer rate limit specifics -- 50 req/5s is community-reported, not officially documented

---
*Research completed: 2026-03-16*
*Ready for roadmap: yes*
