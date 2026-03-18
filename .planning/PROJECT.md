# Similar Artists Graph Engine

## What This Is

An open-source artist similarity graph engine with a React-based localhost viewer. Users input a seed artist, the engine fetches and computes similarity data from multiple live APIs (ListenBrainz, MusicBrainz, Last.fm, Deezer, TasteDive, and optionally Spotify), then renders an interactive force-directed node graph showing related artists, their connections, and rich cross-platform metadata. Built as a monorepo with a standalone engine package (`@similar-artists-graph/engine`) and a reference viewer (`@similar-artists-graph/viewer`).

## Core Value

Anyone can type an artist name and instantly explore their relational neighborhood as a rich, interactive graph — with cross-platform metadata depth that makes each node a window into an artist's full digital presence.

## Requirements

## Current Milestone: v1.1 UX Polish & Data Completeness

**Goal:** Fix UX friction (node limits, navigation, panel behavior) and surface all available cross-platform data that's already being fetched but not displayed.

**Target features:**
- Node limit slider wired to engine (64–512 range)
- Spatial arrow key navigation in both views
- Full external links from MusicBrainz relations
- Larger artist labels, thinner genre outlines
- Manual panel collapse with minimized views
- Particle animation toggle (off by default)

### Validated

<!-- Shipped and confirmed valuable in v1.0 -->

- ✓ Multi-provider data fetching (ListenBrainz, MusicBrainz, Last.fm, Deezer, TasteDive) — v1.0
- ✓ Spotify provider (optional credential-based fallback, dev mode only) — v1.0
- ✓ Cross-platform identity resolution with MBID as canonical anchor + fuzzy matching — v1.0
- ✓ Interactive force-directed graph (react-force-graph-2d) with zoom, pan, drag — v1.0
- ✓ Recursive click-to-expand exploration (similar artists of similar artists) — v1.0
- ✓ Rich artist detail panel with cross-platform metadata, genres, images, external links — v1.0
- ✓ Graph data export (JSON, Gephi-compatible) — v1.0
- ✓ Control panel: depth slider, provider toggles, node limit, reset, layout toggle — v1.0
- ✓ Provider status indicator (active, rate-limited, erroring) — v1.0
- ✓ Rate-limit aware request queue with backoff and caching — v1.0
- ✓ Node deduplication across providers and expansion paths — v1.0
- ✓ Engine as standalone importable npm package (Node.js + browser compatible) — v1.0
- ✓ Viewer components individually exportable for Next.js consumption — v1.0
- ✓ Dark-first minimalist UI — graph IS the UI — v1.0
- ✓ Node sizing by popularity, coloring by genre cluster — v1.0
- ✓ Edge thickness/opacity by similarity strength — v1.0
- ✓ 200+ node performance without lag (Canvas/WebGL rendering) — v1.0

### Active

<!-- Current scope: v1.1 UX Polish & Data Completeness -->

- [ ] Node limit slider controls engine budget (64–512), not just client-side filtering
- [ ] Arrow key navigation uses spatial mode in both main view and detail panel view
- [ ] External links populated from all providers (MusicBrainz relations → Deezer, Spotify, YouTube, ListenBrainz, etc.)
- [ ] Artist label font size 2x larger with adaptive zoom scaling preserved
- [ ] Left panel: manual (x) toggle instead of auto-collapse, keep minimized view
- [ ] Right panel: minimized view with icon to reopen, node count + artist list when no selection
- [ ] Genre outline reduced to thin border (smaller lineWidth, reduced shadow)
- [ ] Particle animation off by default, toggleable in control panel


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
| Research Spotify workarounds | Spotify API heavily restricted; research what's still public | ⚠️ Revisit |
| SoundCharts API rejected | $250/mo, 1K trial only, just wraps Spotify data — not viable for free project | ✓ Good |
| Spotify related artists already wired | Endpoint works but restricted to dev mode (5 users) — keep as optional fallback | ✓ Good |
| Vite for viewer, tsup for engine | Vite = fast HMR for viewer; tsup = ESM+CJS for library | — Pending |
| Vitest for testing | Aligned with Vite ecosystem | — Pending |

---
*Last updated: 2026-03-19 after milestone v1.1 start*
