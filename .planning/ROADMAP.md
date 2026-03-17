# Roadmap: Similar Artists Graph Engine

## Overview

Build a multi-provider artist similarity graph engine and interactive viewer from the ground up. Start with monorepo infrastructure and the MusicBrainz identity anchor, then layer in all remaining providers with entity resolution and graph construction, then build the interactive force-directed viewer, and finally add controls, export, and polish features. Each phase delivers a verifiable capability that the next phase depends on.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Engine Foundation** - Monorepo scaffold, core types, rate-limited request infrastructure, MusicBrainz provider, and caching layer (completed 2026-03-16)
- [x] **Phase 2: Multi-Provider Data Pipeline** - All remaining providers, cross-platform entity resolution, graph construction, and engine public API (completed 2026-03-16)
- [x] **Phase 3: Interactive Viewer** - Force-directed graph rendering, artist search, detail panel, click-to-expand, and dark-first UI (completed 2026-03-16)
- [ ] **Phase 4: Controls, Export, and Polish** - Control panel, provider status dashboard, graph export, URL sharing, keyboard nav, and Next.js packaging

## Phase Details

### Phase 1: Engine Foundation
**Goal**: A working monorepo with typed infrastructure where a developer can query MusicBrainz for an artist and get rate-limited, cached responses through the engine's provider interface
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, PROV-01, PROV-02, RATE-01, RATE-02, RATE-03, RATE-04
**Success Criteria** (what must be TRUE):
  1. Running `pnpm build` from repo root successfully builds both engine (ESM+CJS) and viewer packages with zero TypeScript errors
  2. Running `pnpm test` executes Vitest suites in both packages
  3. Calling `searchArtist("Radiohead")` through the MusicBrainz provider returns artist data with an MBID, and a second identical call within TTL returns cached data without hitting the API
  4. Making rapid sequential requests to MusicBrainz automatically queues them at 1 req/s and retries with backoff on 429/503 responses
  5. When MusicBrainz is unreachable, the engine degrades gracefully with an error status rather than throwing unhandled exceptions
**Plans**: TBD

Plans:
- [ ] 01-01: Monorepo scaffold and build pipeline
- [ ] 01-02: Provider interface, rate-limited queue, cache, and MusicBrainz adapter

### Phase 2: Multi-Provider Data Pipeline
**Goal**: The engine fetches similarity data from 5+ providers, resolves artist identities across platforms using MBID as anchor, deduplicates results, and exposes a public API that returns a weighted graph of artist nodes and similarity edges
**Depends on**: Phase 1
**Requirements**: PROV-03, PROV-04, PROV-05, PROV-06, PROV-07, IDEN-01, IDEN-02, IDEN-03, GRPH-01, GRPH-02, GRPH-03, GRPH-04, GRPH-05, GRPH-06, PKG-01, PKG-02
**Success Criteria** (what must be TRUE):
  1. Calling `engine.explore("Radiohead")` returns a graph with artist nodes sourced from at least 3 providers, where the same artist appearing in multiple providers is represented as a single deduplicated node with merged metadata
  2. Each edge in the returned graph carries a fused similarity score plus per-provider attribution showing which sources contributed and their raw scores
  3. Calling `engine.expand(nodeId)` on any node in the graph adds new similar artists without duplicating existing nodes, and the total node count never exceeds the configured budget (default 150)
  4. Searching for an ambiguous artist name like "John Williams" correctly distinguishes between different artists via MBID resolution rather than silently merging them
  5. The engine package imports and runs correctly in both Node.js (`import { createEngine } from '@similar-artists-graph/engine'`) and browser environments without browser-only dependencies
**Plans**: TBD

Plans:
- [ ] 02-01: Provider adapters (ListenBrainz, Last.fm, Deezer, TasteDive, Spotify) and entity resolution
- [ ] 02-02: Graph builder, engine facade API, and packaging validation

### Phase 3: Interactive Viewer
**Goal**: Users can search for any artist and explore an interactive force-directed graph with click-to-expand, rich detail panels, and smooth performance at 200+ nodes
**Depends on**: Phase 2
**Requirements**: VIS-01, VIS-02, VIS-03, VIS-04, VIS-05, VIS-06, VIS-07, VIS-08, SRCH-01, SRCH-02, SRCH-03, DETL-01, DETL-02, DETL-03, DETL-04, DETL-05, DETL-06, UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. User types an artist name in the search bar, sees autocomplete suggestions with disambiguation, selects one, and a force-directed graph renders within seconds showing the artist and their similar artists
  2. Clicking any node in the graph expands it to show that artist's similar artists, with new nodes blooming outward in an animated expansion
  3. Clicking a node opens a slide-in detail panel showing the artist's name, image, genres, cross-platform listener/fan counts, external links (Spotify, Last.fm, Deezer, etc.), similarity score to seed, and list of connected artists
  4. The graph renders at 200+ nodes without noticeable lag, with zoom, pan, and drag interactions all responsive on a standard laptop
  5. Nodes are sized by popularity and colored by genre cluster, edges vary in thickness/opacity by similarity strength, and the overall UI is dark-first with minimal chrome
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Dependencies, types, Zustand store, utilities, dark theme CSS, and test infrastructure
- [ ] 03-02-PLAN.md — SearchBar with autocomplete and GraphCanvas with force-directed rendering
- [ ] 03-03-PLAN.md — DetailPanel, App wiring, expansion coordination, and visual verification

### Phase 4: Controls, Export, and Polish
**Goal**: Users have full control over the graph exploration experience with provider toggles, depth/limit controls, data export, shareable URLs, keyboard navigation, and the viewer is packaged for Next.js consumption
**Depends on**: Phase 3
**Requirements**: CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-05, CTRL-06, STAT-01, STAT-02, STAT-03, EXPT-01, EXPT-02, SHAR-01, SHAR-02, PKG-03, PKG-04
**Success Criteria** (what must be TRUE):
  1. User can toggle individual providers on/off and the graph re-renders showing only data from enabled providers; depth slider and node limit slider constrain graph expansion in real time
  2. Provider status indicators show each provider's current state (active, rate-limited, erroring) with rate limit remaining counts, and visual feedback appears during multi-provider fetching
  3. User can export the current graph as JSON (re-importable) or GEXF (opens in Gephi), and the "Reset graph" button clears everything back to the search state
  4. The current graph state (seed artist, depth, provider config) is encoded in the URL so copying and sharing the URL reproduces the same graph; keyboard navigation (Tab/arrows through nodes, Enter to expand, Escape to deselect, "/" to focus search) works throughout
  5. Viewer graph component is importable into a Next.js app via `next/dynamic` with `{ ssr: false }` and individual viewer components are exportable for composition in external projects
**Plans**: 3 plans

Plans:
- [ ] 04-01-PLAN.md — State layer, utility functions (filtering, export, URL, keyboard nav), and unit tests
- [ ] 04-02-PLAN.md — ControlPanel sidebar, ShortcutOverlay, GraphCanvas extensions (filtering, radial layout, keyboard nav), and visual verification
- [ ] 04-03-PLAN.md — Barrel exports, Vite library build, Next.js packaging, and SSR safety audit

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Engine Foundation | 2/2 | Complete   | 2026-03-16 |
| 2. Multi-Provider Data Pipeline | 2/2 | Complete   | 2026-03-16 |
| 3. Interactive Viewer | 5/5 | Complete   | 2026-03-16 |
| 4. Controls, Export, and Polish | 1/3 | In Progress|  |
