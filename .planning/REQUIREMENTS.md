# Requirements: Similar Artists Graph Engine

**Defined:** 2026-03-16
**Core Value:** Anyone can type an artist name and instantly explore their relational neighborhood as a rich, interactive graph with cross-platform metadata depth.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: Monorepo scaffold with pnpm workspaces (engine + viewer packages)
- [x] **INFRA-02**: TypeScript strict mode across all packages with shared base config
- [x] **INFRA-03**: Engine builds to ESM + CJS via tsup
- [x] **INFRA-04**: Viewer builds via Vite with HMR dev server
- [x] **INFRA-05**: Vitest test runner configured for both packages

### Providers

- [x] **PROV-01**: Provider interface contract (searchArtist, getSimilarArtists, resolveIdentity)
- [x] **PROV-02**: MusicBrainz provider — artist search, metadata, MBID resolution (no auth required)
- [x] **PROV-03**: ListenBrainz provider — similar artists via session-based collaborative filtering (no auth required)
- [x] **PROV-04**: Last.fm provider — similar artists with scored matches, artist metadata (free API key)
- [x] **PROV-05**: Deezer provider — related artists, genres, fan counts (no auth required)
- [x] **PROV-06**: TasteDive provider — similar artist recommendations (free API key, needs server proxy for CORS)
- [x] **PROV-07**: Spotify provider — whatever endpoints remain accessible; optional credential-based (research workarounds first)

### Identity Resolution

- [x] **IDEN-01**: MBID-anchored canonical artist identity mapping across all providers
- [x] **IDEN-02**: Fuzzy name matching fallback when MBID is unavailable (string-similarity)
- [x] **IDEN-03**: Cross-platform ID mapping cache (Last.fm name → MBID, Deezer ID → MBID, etc.)

### Graph Engine

- [ ] **GRPH-01**: Graph builder that constructs unified ArtistNode[] and SimilarityEdge[] from multi-provider data
- [ ] **GRPH-02**: Weighted similarity score fusion from multiple providers per edge
- [ ] **GRPH-03**: Node deduplication — same artist from multiple providers or expansion paths is one node
- [ ] **GRPH-04**: Recursive traversal logic (BFS expansion from any node)
- [ ] **GRPH-05**: Node budget enforcement (default 150, max 200) to prevent graph explosion
- [ ] **GRPH-06**: Per-edge provider attribution (which providers contributed, raw scores)

### Rate Limiting & Caching

- [x] **RATE-01**: Per-provider rate-limit aware request queue (p-queue with interval limiting)
- [x] **RATE-02**: Backoff and retry on rate limit responses (429 / 503)
- [x] **RATE-03**: In-memory LRU cache for provider responses
- [x] **RATE-04**: Graceful degradation when a provider is rate-limited or down (skip, don't block)

### Visualization

- [ ] **VIS-01**: Force-directed graph rendering via react-force-graph-2d with Canvas/WebGL
- [ ] **VIS-02**: Node sizing by popularity/prominence metric
- [ ] **VIS-03**: Node coloring by genre cluster (d3-scale-chromatic palette)
- [ ] **VIS-04**: Edge thickness/opacity by similarity strength
- [ ] **VIS-05**: Zoom, pan, drag interactions (mouse + trackpad)
- [ ] **VIS-06**: Click-to-expand — clicking a node fetches and renders its similar artists
- [ ] **VIS-07**: Expansion animation — new nodes bloom outward from clicked node
- [ ] **VIS-08**: Performance target — 200+ nodes rendered without noticeable lag

### Search

- [ ] **SRCH-01**: Text input with debounced search using MusicBrainz search API
- [ ] **SRCH-02**: Autocomplete dropdown with artist candidates and disambiguation
- [ ] **SRCH-03**: User selects correct artist → triggers initial graph construction

### Detail Panel

- [ ] **DETL-01**: Slide-in panel on node click showing artist name, genres, image
- [ ] **DETL-02**: Cross-platform metadata display (listener counts, fan counts, tags from all providers)
- [ ] **DETL-03**: External links (Spotify, Apple Music, YouTube, Last.fm, Deezer)
- [ ] **DETL-04**: Similarity score to seed artist
- [ ] **DETL-05**: List of connected artists in current graph
- [ ] **DETL-06**: "Expand" button to trigger recursive expansion from this node

### Control Panel

- [ ] **CTRL-01**: Max depth slider (1-5)
- [ ] **CTRL-02**: Provider toggles — enable/disable each data source, graph re-renders on toggle
- [ ] **CTRL-03**: Node limit slider
- [ ] **CTRL-04**: "Reset graph" button
- [ ] **CTRL-05**: "Export graph data" button (JSON download)
- [ ] **CTRL-06**: Layout toggle (force-directed / radial / tree)

### Provider Status

- [ ] **STAT-01**: Status indicator per provider (active, rate-limited, erroring)
- [ ] **STAT-02**: Rate limit remaining display per provider
- [ ] **STAT-03**: Visual feedback during multi-provider fetching

### Export

- [ ] **EXPT-01**: Export current graph state as JSON (compatible with re-import)
- [ ] **EXPT-02**: Export as GEXF format for Gephi compatibility

### Sharing & Navigation

- [ ] **SHAR-01**: URL-based graph state — seed artist + depth + provider config encoded in URL
- [ ] **SHAR-02**: Keyboard navigation — Tab/arrows through nodes, Enter to expand, Escape to deselect, "/" to search

### Packaging

- [ ] **PKG-01**: Engine publishable as standalone npm package (@similar-artists-graph/engine)
- [ ] **PKG-02**: Engine runs in Node.js and browser (no browser-only dependencies)
- [ ] **PKG-03**: Viewer components individually exportable for Next.js consumption
- [ ] **PKG-04**: Dynamic import friendly — graph component loadable via next/dynamic with { ssr: false }

### UI/UX

- [ ] **UI-01**: Dark-first minimalist design — near-black background, high-contrast nodes
- [ ] **UI-02**: Minimal chrome — search bar top-center, controls bottom-left, detail panel slides right
- [ ] **UI-03**: Monospace/system font stack, no custom fonts
- [ ] **UI-04**: Loading/progress indicators during multi-provider fetch

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: Alternative graph layouts (hierarchical, concentric)
- **ADV-02**: Graph filtering by genre, provider, popularity threshold
- **ADV-03**: Artist comparison mode (side-by-side neighborhood graphs)
- **ADV-04**: Light theme option
- **ADV-05**: LocalStorage auto-save of last session

## Out of Scope

| Feature | Reason |
|---------|--------|
| Demo/seed data mode | User explicitly requires live data only — no fake/pre-cached data |
| User accounts / saved graphs | Authentication, database, GDPR — scope creep for localhost tool |
| Playlist generation | Requires streaming platform write access, mixes discovery with consumption |
| Real-time collaborative exploration | WebSocket infrastructure, session management — massive complexity |
| 3D visualization | Occlusion, navigation complexity, no analytical benefit over 2D |
| Audio preview on hover | Streaming rights, hostile UX, API complexity per track |
| Mobile native app | Desktop-first for data exploration; responsive web is sufficient |
| Historical graph snapshots | Requires persistent storage, periodic re-fetching infrastructure |
| Proprietary scoring algorithms | Momentum/breakout scores belong in future paid dashboard, not open-source |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 1 | Complete |
| PROV-01 | Phase 1 | Complete |
| PROV-02 | Phase 1 | Complete |
| RATE-01 | Phase 1 | Complete |
| RATE-02 | Phase 1 | Complete |
| RATE-03 | Phase 1 | Complete |
| RATE-04 | Phase 1 | Complete |
| PROV-03 | Phase 2 | Complete |
| PROV-04 | Phase 2 | Complete |
| PROV-05 | Phase 2 | Complete |
| PROV-06 | Phase 2 | Complete |
| PROV-07 | Phase 2 | Complete |
| IDEN-01 | Phase 2 | Complete |
| IDEN-02 | Phase 2 | Complete |
| IDEN-03 | Phase 2 | Complete |
| GRPH-01 | Phase 2 | Pending |
| GRPH-02 | Phase 2 | Pending |
| GRPH-03 | Phase 2 | Pending |
| GRPH-04 | Phase 2 | Pending |
| GRPH-05 | Phase 2 | Pending |
| GRPH-06 | Phase 2 | Pending |
| PKG-01 | Phase 2 | Pending |
| PKG-02 | Phase 2 | Pending |
| VIS-01 | Phase 3 | Pending |
| VIS-02 | Phase 3 | Pending |
| VIS-03 | Phase 3 | Pending |
| VIS-04 | Phase 3 | Pending |
| VIS-05 | Phase 3 | Pending |
| VIS-06 | Phase 3 | Pending |
| VIS-07 | Phase 3 | Pending |
| VIS-08 | Phase 3 | Pending |
| SRCH-01 | Phase 3 | Pending |
| SRCH-02 | Phase 3 | Pending |
| SRCH-03 | Phase 3 | Pending |
| DETL-01 | Phase 3 | Pending |
| DETL-02 | Phase 3 | Pending |
| DETL-03 | Phase 3 | Pending |
| DETL-04 | Phase 3 | Pending |
| DETL-05 | Phase 3 | Pending |
| DETL-06 | Phase 3 | Pending |
| UI-01 | Phase 3 | Pending |
| UI-02 | Phase 3 | Pending |
| UI-03 | Phase 3 | Pending |
| UI-04 | Phase 3 | Pending |
| CTRL-01 | Phase 4 | Pending |
| CTRL-02 | Phase 4 | Pending |
| CTRL-03 | Phase 4 | Pending |
| CTRL-04 | Phase 4 | Pending |
| CTRL-05 | Phase 4 | Pending |
| CTRL-06 | Phase 4 | Pending |
| STAT-01 | Phase 4 | Pending |
| STAT-02 | Phase 4 | Pending |
| STAT-03 | Phase 4 | Pending |
| EXPT-01 | Phase 4 | Pending |
| EXPT-02 | Phase 4 | Pending |
| SHAR-01 | Phase 4 | Pending |
| SHAR-02 | Phase 4 | Pending |
| PKG-03 | Phase 4 | Pending |
| PKG-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 63 total
- Mapped to phases: 63
- Unmapped: 0

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after roadmap creation*
