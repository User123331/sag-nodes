# Feature Research

**Domain:** Artist similarity graph exploration / music discovery
**Researched:** 2026-03-16
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Seed artist search with autocomplete | Every graph tool starts with a search box. Without autocomplete, users misspell names and get nothing. | MEDIUM | Use MusicBrainz search API for autocomplete; fuzzy matching critical for artist names with special characters. |
| Force-directed graph rendering | This IS the product. Music-Map, MusicLynx, Every Noise all center on spatial visualization of artist relationships. | HIGH | react-force-graph-2d with Canvas/WebGL. Must handle 200+ nodes without lag. |
| Click-to-expand (recursive exploration) | The killer interaction per PROJECT.md. Every Noise and Obsidian graph view both support progressive disclosure. MusicLynx and Music-Map lack this, which limits their utility. | HIGH | Expand similar artists of any node on click. Must handle deduplication, re-layout animation, and preventing "starburst" (single hub dominating the view). |
| Hover detail panel | Chartmetric and Songstats both show rich metadata on hover/click. Music-Map shows nothing on hover, which feels empty. The "selling moment" is data depth on hover. | MEDIUM | Show artist image, genres, listener counts, external links. Panel should not obscure the graph. Sidebar or floating tooltip. |
| Zoom, pan, drag | Standard graph interaction from Obsidian, Gephi, any graph tool. Users will try pinch-to-zoom on first interaction. | LOW | Built into react-force-graph-2d. Ensure scroll-zoom works, touch gestures on trackpad. |
| Node sizing by relevance | Obsidian does this with link count, Chartmetric with popularity metrics. Uniform node sizes make the graph unreadable. | LOW | Size by cross-platform popularity composite or listener count. Seed node should be visually distinct (largest). |
| Genre-based node coloring | Every Noise at Once defined this pattern. Users expect color = genre. Without it, the graph is a blob of same-colored dots. | MEDIUM | Derive genre clusters from metadata. Need a consistent color palette for ~20 top-level genre groups. Handle multi-genre artists by primary genre. |
| Edge weight visualization | Academic similarity graphs and Gephi both use edge thickness/opacity for strength. Users expect thicker = more similar. | LOW | Map similarity score to edge opacity and/or thickness. Configurable threshold to hide weak connections. |
| Loading/progress indicators | Multi-API fetching takes time. No feedback = user thinks it is broken. | LOW | Per-provider status (fetching, done, rate-limited, error). Overall progress indicator during expansion. |
| Dark theme | PROJECT.md specifies "dark-first minimalist UI." Graph tools universally use dark backgrounds because nodes and edges are more visible on dark. | LOW | Dark by default. Light theme is NOT table stakes for v1. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multi-provider data fusion | No existing tool aggregates ListenBrainz + MusicBrainz + Last.fm + Deezer + TasteDive + Spotify. Music-Map uses one source (Gnoosic). Chartmetric uses proprietary data. This product's similarity scores are richer because they triangulate across providers. | HIGH | Core engine differentiator. Cross-platform identity resolution via MBID. Weighted fusion of similarity signals from each provider. |
| Provider toggle control panel | No competitor lets users choose which data sources contribute. Users can see how similarity changes when they toggle Last.fm off vs on. Data transparency is the opposite of Chartmetric's black box. | MEDIUM | Toggle providers on/off, see graph re-render. Shows which providers contributed to each edge. Educational and trust-building. |
| Cross-platform metadata richness | Hovering a node shows data from ALL providers: MusicBrainz bio, Last.fm listener count, Deezer fan count, genre tags from multiple sources. No single tool provides this cross-platform view for free. | MEDIUM | Merge and deduplicate metadata per artist from all active providers. Show source attribution for each data point. |
| Graph data export (JSON + GEXF) | Researchers and data enthusiasts can take the graph into Gephi for deeper analysis. No free music graph tool offers this. | LOW | Export current graph state as JSON (for re-import) and GEXF (for Gephi). Include all metadata and edge weights. |
| Depth slider / expansion control | Obsidian's depth slider for local graph is an excellent UX pattern. Control how many layers deep the graph expands. Prevents overwhelming the view. | LOW | Slider from 1-5 depth levels. Auto-expand to selected depth or manual click-to-expand. Node count limit as safety valve. |
| Open-source engine as npm package | No open-source artist similarity engine exists as a reusable package. MusicLynx was academic. Every Noise was Spotify-internal. This fills a genuine ecosystem gap. | MEDIUM | @similar-artists-graph/engine as standalone package. Node.js and browser compatible. Clean API for developers building their own UIs. |
| Provider status dashboard | Real-time visibility into which APIs are responding, rate-limited, or erroring. No competitor exposes this because they hide their data sources. | LOW | Traffic light indicators per provider. Shows rate limit remaining, last successful fetch, error messages. |
| Similarity source attribution on edges | Click an edge to see WHY two artists are connected: "Last.fm: co-listened 85%, TasteDive: recommended, MusicBrainz: shared tag 'post-punk'." No tool explains similarity reasoning. | MEDIUM | Store per-provider similarity evidence. Display on edge click or hover. Huge for data transparency. |
| URL-based graph state (shareable links) | Encode seed artist + depth + provider config in URL params so graphs can be shared/bookmarked. Music-Map does this minimally (just artist name in URL). | LOW | Serialize graph config to URL hash or query params. Does not need to encode full graph state, just seed + settings so it can be re-fetched. |
| Keyboard navigation | Power users expect Vim-like shortcuts. Tab through nodes, Enter to expand, Escape to collapse. Obsidian graph supports keyboard nav. | LOW | Arrow keys or Tab to navigate nodes. Enter to expand. Escape to deselect. Search with "/" shortcut. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Spotify-exclusive data dependency | Spotify has the most recognizable brand and users ask "does it work with Spotify?" | Spotify gutted its public API in late 2024. Related artists, audio features, top tracks, popularity, and follower counts are removed for new apps. Building on Spotify as primary source is building on sand. | Use Spotify as one optional provider with whatever endpoints remain accessible. Design so the product works fully without Spotify. |
| Proprietary scoring algorithms (momentum, breakout probability) | Chartmetric sells these. Users might expect them. | Requires historical time-series data, proprietary modeling, and ongoing data collection infrastructure. Massive scope creep for an open-source graph tool. | Surface raw cross-platform metrics (listener counts, fan counts) without inventing composite scores. Let users interpret the data. |
| User accounts and saved graphs | "I want to save my exploration and come back to it." | Authentication, database, session management, GDPR compliance -- all scope creep for a localhost-first tool. | Export graph as JSON file. Re-import to restore state. LocalStorage for last session auto-save. |
| Playlist generation | "Show me a playlist of these artists." | Requires write access to streaming APIs (Spotify write scope is heavily restricted). Mixes discovery tool with consumption tool. | Provide external links to each artist on streaming platforms. User can make their own playlist. |
| Real-time collaborative exploration | "Let me share my graph session with a friend live." | WebSocket infrastructure, conflict resolution, session management. Massive complexity for marginal value. | Shareable URL that recreates the same graph from the same seed + settings. |
| 3D graph visualization | "3D would look cooler." | 3D adds navigation complexity (camera rotation), occlusion (nodes behind other nodes), performance overhead, and accessibility issues. Academic research shows 2D graphs are more readable for analysis tasks. | Stick with 2D. Use node sizing, coloring, and edge weight to encode the third dimension of information. |
| Audio preview on node hover | "Let me hear a sample of each artist." | Requires audio streaming rights, increases API complexity (need preview URLs from providers), and auto-playing audio is hostile UX. Deezer previews require API calls per track. | Provide a "Listen" external link to the artist's page on Last.fm, Deezer, or Spotify. One click away, no audio complexity. |
| Mobile-native app | "Make it an app." | React Native or native development doubles the surface area. Graph interaction on small touch screens is inherently worse than desktop. | Responsive web design that works acceptably on tablets. Desktop-first is correct for data exploration tools. |
| Historical graph snapshots / time travel | "Show me how this artist's network changed over time." | Requires persistent storage, periodic re-fetching, and diff computation. Data infrastructure for a feature few users would use. | Show "last fetched" timestamps. User can re-run to see current state. |
| Demo/seed data mode | "Let it work without API keys." | PROJECT.md explicitly excludes this. Demo data misleads users about real data quality and creates a maintenance burden of keeping seed data fresh. | Clear onboarding that explains which APIs need keys and which do not (ListenBrainz and MusicBrainz require no auth). |

## Feature Dependencies

```
[Seed Artist Search]
    └──requires──> [MusicBrainz Identity Resolution (MBID lookup)]
                       └──requires──> [Provider API Integration]

[Force-Directed Graph Rendering]
    └──requires──> [Graph Data Model (nodes + edges)]
                       └──requires──> [Provider API Integration]
                       └──requires──> [Node Deduplication (cross-provider)]

[Click-to-Expand]
    └──requires──> [Force-Directed Graph Rendering]
    └──requires──> [Provider API Integration]
    └──requires──> [Node Deduplication]

[Hover Detail Panel]
    └──requires──> [Cross-Platform Metadata Merging]
                       └──requires──> [Provider API Integration]
                       └──requires──> [MusicBrainz Identity Resolution]

[Genre-Based Node Coloring]
    └──requires──> [Cross-Platform Metadata Merging]

[Provider Toggle Control Panel]
    └──requires──> [Multi-Provider Data Fusion]
    └──enhances──> [Force-Directed Graph Rendering] (re-renders on toggle)

[Graph Data Export]
    └──requires──> [Graph Data Model]

[Similarity Source Attribution]
    └──requires──> [Multi-Provider Data Fusion]
    └──enhances──> [Hover Detail Panel]

[Depth Slider]
    └──enhances──> [Click-to-Expand]

[URL-Based State]
    └──requires──> [Seed Artist Search]
    └──enhances──> [Provider Toggle Control Panel]
```

### Dependency Notes

- **Click-to-Expand requires Node Deduplication:** Without dedup, expanding two neighbors that share a common similar artist creates duplicate nodes, making the graph confusing and bloated.
- **Genre Coloring requires Cross-Platform Metadata Merging:** Genre tags come from MusicBrainz, Last.fm, and Deezer. Merging and normalizing these into a consistent genre taxonomy is prerequisite.
- **Provider Toggle enhances Graph Rendering:** Toggling a provider off should remove edges/similarity data from that source and re-render, which means the graph data model must track edge provenance.
- **Hover Detail Panel requires Identity Resolution:** To show merged metadata from all providers, the system must know that "Radiohead" on Last.fm, MusicBrainz, and Deezer are the same entity.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what is needed to validate the concept.

- [ ] Seed artist search with MusicBrainz autocomplete -- entry point to the entire product
- [ ] Multi-provider data fetching (ListenBrainz, MusicBrainz, Last.fm minimum) -- at least 3 providers for meaningful data fusion
- [ ] Cross-platform identity resolution via MBID -- without this, dedup fails and metadata cannot merge
- [ ] Force-directed graph rendering with zoom/pan/drag -- the core visualization
- [ ] Click-to-expand recursive exploration -- the killer interaction
- [ ] Hover/click detail panel with merged metadata -- the selling moment (data depth on hover)
- [ ] Node sizing by popularity, coloring by genre -- visual encoding that makes the graph readable
- [ ] Edge weight visualization -- similarity strength must be visible
- [ ] Rate-limit aware request queue with caching -- without this, APIs will block the app within minutes
- [ ] Dark-first UI -- the graph is the UI

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Deezer + TasteDive providers -- expand to 5+ providers once the multi-provider architecture is proven
- [ ] Spotify provider (whatever endpoints remain) -- research-dependent, add when scope is clear
- [ ] Provider toggle control panel -- let users control which sources contribute
- [ ] Graph data export (JSON + GEXF) -- for researchers and data enthusiasts
- [ ] Depth slider and node limit controls -- power user controls
- [ ] Provider status dashboard -- transparency into API health
- [ ] Similarity source attribution on edges -- "why are these artists connected?"
- [ ] URL-based shareable graph state -- bookmarkable explorations
- [ ] Keyboard navigation -- power user efficiency

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Engine as standalone npm package (@similar-artists-graph/engine) -- requires clean API boundary, documentation, and testing. Do after internal architecture stabilizes.
- [ ] Viewer components individually exportable for Next.js -- downstream consumption architecture. Do after viewer is feature-complete.
- [ ] Layout toggle (force-directed vs radial vs hierarchical) -- alternative layouts are nice but not essential
- [ ] Graph filtering by genre, provider, popularity threshold -- advanced filtering for power users
- [ ] Artist comparison mode (side-by-side neighborhood graphs) -- unique feature but high complexity

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Seed artist search + autocomplete | HIGH | MEDIUM | P1 |
| Multi-provider data fetching (3+ providers) | HIGH | HIGH | P1 |
| Cross-platform identity resolution (MBID) | HIGH | HIGH | P1 |
| Force-directed graph rendering | HIGH | MEDIUM | P1 |
| Click-to-expand recursive exploration | HIGH | HIGH | P1 |
| Hover detail panel with merged metadata | HIGH | MEDIUM | P1 |
| Node sizing + genre coloring | HIGH | MEDIUM | P1 |
| Edge weight visualization | MEDIUM | LOW | P1 |
| Rate-limit queue + caching | HIGH | MEDIUM | P1 |
| Dark-first UI | MEDIUM | LOW | P1 |
| Deezer + TasteDive providers | MEDIUM | MEDIUM | P2 |
| Spotify provider (limited) | MEDIUM | MEDIUM | P2 |
| Provider toggle control panel | MEDIUM | MEDIUM | P2 |
| Graph data export (JSON + GEXF) | MEDIUM | LOW | P2 |
| Depth slider + node limit | MEDIUM | LOW | P2 |
| Provider status dashboard | LOW | LOW | P2 |
| Similarity source attribution | MEDIUM | MEDIUM | P2 |
| URL-based shareable state | MEDIUM | LOW | P2 |
| Keyboard navigation | LOW | LOW | P2 |
| Standalone engine npm package | HIGH | MEDIUM | P3 |
| Next.js exportable components | MEDIUM | MEDIUM | P3 |
| Alternative graph layouts | LOW | MEDIUM | P3 |
| Advanced graph filtering | LOW | MEDIUM | P3 |
| Artist comparison mode | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Music-Map | Every Noise at Once | Chartmetric | MusicLynx (academic) | Our Approach |
|---------|-----------|---------------------|-------------|----------------------|--------------|
| Visual graph of artist relationships | Yes (proximity-based, no edges) | Yes (genre map, not artist graph) | Yes (neighboring artists list) | Yes (force-directed) | Force-directed graph with explicit edges and weights |
| Click-to-expand / recursive exploration | No (single-level only) | No (genre navigation only) | No (static lists) | Limited (category browsing) | Full recursive expand on any node -- primary differentiator |
| Rich metadata on hover/click | No (just names) | Minimal (audio preview) | Yes (behind $160/mo paywall) | Minimal (external links) | Cross-platform merged metadata from all providers, free |
| Multiple data sources | Single (Gnoosic) | Single (Spotify internal) | Proprietary aggregation | Multiple open sources | 6 open/free APIs with transparent source attribution |
| Data source transparency | None | None | None | Partial (shows categories) | Full: which providers contributed what, edge-level attribution |
| Graph export | No | No | CSV export (paid) | No | JSON + GEXF for Gephi |
| Depth/expansion control | No | No | N/A | No | Depth slider, node limit, provider toggles |
| Open source | No | No (defunct post-Spotify layoffs) | No (SaaS) | Academic (not maintained) | MIT licensed, engine as npm package |
| Cost | Free | Free (no longer updating) | $160+/mo | Free (academic demo) | Free, open source |

## Sources

- [Music-Map](https://www.music-map.com/) -- simple proximity visualization, single data source
- [Chartmetric Features](https://chartmetric.com/features/artist-analytics) -- neighboring artists, cross-platform analytics
- [Every Noise at Once (Wikipedia)](https://en.wikipedia.org/wiki/Every_Noise_at_Once) -- genre map, no longer updating after Spotify layoffs
- [MusicLynx: Exploring Music Through Artist Similarity Graphs](https://dl.acm.org/doi/fullHtml/10.1145/3184558.3186970) -- academic prototype with multi-source similarity
- [Music Galaxy (Casey Primozic)](https://cprimozic.net/blog/building-music-galaxy/) -- 3D artist exploration using graph embeddings
- [Graph Visualization UX Best Practices (Cambridge Intelligence)](https://cambridge-intelligence.com/graph-visualization-ux-how-to-avoid-wrecking-your-graph-visualization/) -- hairballs, starbursts, progressive disclosure
- [Obsidian Graph View](https://help.obsidian.md/plugins/graph) -- local graph, depth slider, filtering patterns
- [Songstats](https://songstats.com/) -- streaming analytics, playlist tracking
- [GEXF File Format](https://gexf.net/) -- Gephi-native graph exchange format
- [Graphsify: Interactive Music Exploration Tool](https://www.cs.rpi.edu/~cutler/classes/visualization/S18/final_projects/alec_alexandra.pdf) -- academic Spotify graph explorer

---
*Feature research for: Artist similarity graph exploration*
*Researched: 2026-03-16*
