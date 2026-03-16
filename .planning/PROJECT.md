# Similar Artists Graph Engine

## What This Is

An open-source artist similarity graph engine with a React-based localhost viewer. Users input a seed artist, the engine fetches and computes similarity data from multiple live APIs (ListenBrainz, MusicBrainz, Last.fm, Deezer, TasteDive, and optionally Spotify), then renders an interactive force-directed node graph showing related artists, their connections, and rich cross-platform metadata. Built as a monorepo with a standalone engine package (`@similar-artists-graph/engine`) and a reference viewer (`@similar-artists-graph/viewer`).

## Core Value

Anyone can type an artist name and instantly explore their relational neighborhood as a rich, interactive graph — with cross-platform metadata depth that makes each node a window into an artist's full digital presence.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multi-provider data fetching (ListenBrainz, MusicBrainz, Last.fm, Deezer, TasteDive) — all live, no demo mode
- [ ] Spotify provider (research what's still publicly accessible; optional credential-based fallback)
- [ ] Cross-platform identity resolution with MBID as canonical anchor + fuzzy matching
- [ ] Interactive force-directed graph (react-force-graph-2d) with zoom, pan, drag
- [ ] Recursive click-to-expand exploration (similar artists of similar artists)
- [ ] Rich artist detail panel with cross-platform metadata, genres, images, external links
- [ ] Graph data export (JSON, Gephi-compatible)
- [ ] Control panel: depth slider, provider toggles, node limit, reset, layout toggle
- [ ] Provider status indicator (active, rate-limited, erroring)
- [ ] Rate-limit aware request queue with backoff and caching
- [ ] Node deduplication across providers and expansion paths
- [ ] Engine as standalone importable npm package (Node.js + browser compatible)
- [ ] Viewer components individually exportable for Next.js consumption
- [ ] Dark-first minimalist UI — graph IS the UI
- [ ] Node sizing by popularity, coloring by genre cluster
- [ ] Edge thickness/opacity by similarity strength
- [ ] 200+ node performance without lag (Canvas/WebGL rendering)

### Out of Scope

- Demo/seed data mode — app must work with live data from day one
- Proprietary scoring algorithms (momentum score, breakout probability)
- User authentication / subscription management
- Historical time-series data storage
- Playlist intelligence features
- Mobile app — web-first
- Real-time chat or social features

## Context

- Spotify gutted its public API in late 2024 and continued restricting endpoints through Feb 2026. Related artists, recommendations, audio features, top tracks, popularity, and follower counts are removed for new apps. This makes multi-source resilience critical.
- No open-source alternative exists for interactive artist graph exploration. Existing tools (Chartmetric $160+/mo, Songstats) are expensive and opaque.
- The engine will eventually be consumed by a private Next.js-based paid music analytics dashboard. Architecture must support SSR compatibility, API route integration, and theming override.
- Target users: indie artists, small managers/labels, music data enthusiasts, developers building music apps, researchers.
- Research needed on what Spotify data is still accessible publicly without extended access.

## Constraints

- **No paid APIs**: Everything must work with free-tier API keys or no keys at all (ListenBrainz and MusicBrainz require no auth)
- **TypeScript strict mode**: No `any` types in public API surface
- **Engine bundle size**: Under 50KB gzipped, no heavy dependencies
- **Browser compatibility**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **License**: MIT — no GPL-contaminating dependencies
- **SSR safe engine**: No browser-only deps in engine package; use `fetch` not `axios`
- **ESM-first exports**: With CJS fallback for engine
- **Package manager**: pnpm with workspace monorepo

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No demo/seed mode | User wants live data from day one — real artists, not generated | — Pending |
| react-force-graph-2d for visualization | Most mature React force graph lib, Canvas/WebGL, 1000+ nodes, active maintenance | — Pending |
| pnpm monorepo (engine + viewer) | Engine is standalone library, viewer is reference implementation | — Pending |
| Zustand for viewer state | Lightweight, React-native, no boilerplate | — Pending |
| MusicBrainz as identity anchor | MBID as universal key across providers | — Pending |
| All 6 providers for v1 | User wants ambitious scope; every provider is must-have | — Pending |
| Research Spotify workarounds | Spotify API heavily restricted; research what's still public | — Pending |
| Vite for viewer, tsup for engine | Vite = fast HMR for viewer; tsup = ESM+CJS for library | — Pending |
| Vitest for testing | Aligned with Vite ecosystem | — Pending |

---
*Last updated: 2026-03-16 after initialization*
