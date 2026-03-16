# Technology Stack

**Project:** Similar Artists Graph Engine
**Researched:** 2026-03-16
**Overall Confidence:** MEDIUM-HIGH

## Recommended Stack

### Core Framework & Build

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TypeScript | 5.7+ | Language | Strict mode, ESM-first -- already decided | HIGH |
| Vite | 8.0 | Viewer dev/build | Rolldown-integrated (10-30x faster builds), HMR, React plugin. Requires Node 20.19+ | HIGH |
| tsup | 8.5 | Engine library build | Zero-config ESM+CJS dual output via esbuild. Proven for library packaging | HIGH |
| Vitest | 4.1 | Testing | Native Vite integration, fast, TypeScript-first. v4.0 released recently | HIGH |
| pnpm | 9.x | Package manager | Workspace monorepo support, fast, disk-efficient -- already decided | HIGH |
| React | 19.x | Viewer UI | Current stable. react-force-graph-2d 1.29 lists React 16-19 as peer dep | HIGH |

### Graph Visualization

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| react-force-graph-2d | 1.29 | Force-directed graph | Most mature React force graph. Canvas-based, handles 1000+ nodes. Actively maintained (published ~1 month ago). Already decided | HIGH |

**Note:** react-force-graph-2d renders on HTML5 Canvas, which is critical for 200+ node performance. Do NOT use SVG-based alternatives (e.g., react-d3-graph) which choke above ~100 nodes.

### State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | 5.0 | Viewer state | v5.0.11 latest. Tiny (1KB), no boilerplate, React 19 compatible. Already decided | HIGH |

### Data Provider APIs

This is the most critical and volatile area of the stack. Provider availability dictates architecture.

| Provider | Endpoint | Auth Required | Rate Limit | Similar Artists? | Confidence |
|----------|----------|---------------|------------|-------------------|------------|
| **ListenBrainz Labs** | `labs.api.listenbrainz.org/similar-artists` | No | Generous (undocumented, ~1 req/s recommended) | YES - session-based collaborative filtering | HIGH |
| **MusicBrainz** | `musicbrainz.org/ws/2/artist` | No (User-Agent required) | 1 req/s unauthenticated | NO similar artists, but provides: MBID canonical IDs, artist metadata, genre tags, relations, external URL links | HIGH |
| **Last.fm** | `ws.audioscrobbler.com/2.0/?method=artist.getSimilar` | API key (free) | 5 req/s | YES - returns up to 250 similar artists with match score 0-1 | MEDIUM |
| **Deezer** | `api.deezer.com/artist/{id}/related` | No | 50 req/5s | YES - returns related artists | HIGH |
| **TasteDive** | `tastedive.com/api/similar` | API key (free) | 300 req/hr | YES - content-based recommendations | MEDIUM |
| **Spotify** | `api.spotify.com/v1/artists/{id}` | OAuth (Premium required for dev mode) | Standard | SEVERELY LIMITED - see below | HIGH |
| **TheAudioDB** | `theaudiodb.com/api/v1/json/` | API key (free) | 30 req/min | NO, but provides: artist images, bios, genre, mood, social links | MEDIUM |

### Spotify API Status (February 2026) - CRITICAL

**Verdict: Treat Spotify as optional metadata enrichment, NOT a primary similarity source.**

After the February 2026 restrictions:
- **Dev Mode requires**: Spotify Premium account, max 5 authorized users, 1 Client ID
- **Search**: Still works but limited to 10 results per request (was 50)
- **Get Artist**: Still works (single artist metadata: name, genres, images, external URLs)
- **Get Related Artists**: REMOVED - no longer accessible in Dev Mode
- **Get Artist's Top Tracks**: REMOVED
- **Artist popularity & follower counts**: REMOVED from response fields
- **Extended Access**: Reserved for apps with "established, scalable use cases" per Spotify criteria -- unlikely for an open-source tool

**What Spotify CAN still provide:** Artist name, genres array, images, Spotify external URL. That is it. No similarity data whatsoever.

**Recommendation:** Implement Spotify as a metadata-only provider (images, genres, external link). Do NOT rely on it for graph edges. Make it credential-optional -- works without it, enriches with it.

Sources:
- [Spotify Feb 2026 Migration Guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)
- [Spotify Feb 2026 Changelog](https://developer.spotify.com/documentation/web-api/references/changes/february-2026)
- [TechCrunch coverage](https://techcrunch.com/2026/02/06/spotify-changes-developer-mode-api-to-require-premium-accounts-limits-test-users/)

### Primary Similarity Data Strategy

Use a **multi-source weighted merge** from these providers (in priority order):

1. **Last.fm `artist.getSimilar`** -- Best similarity data: returns match scores 0-1, up to 250 results, well-established collaborative filtering. The `track.getSimilar` endpoint has reported instability in 2025, but `artist.getSimilar` appears to still function. **Test and verify early.**
2. **ListenBrainz Labs `similar-artists`** -- Session-based collaborative filtering from real listening data. No auth required. Requires MBID input (resolve artist name to MBID via MusicBrainz first).
3. **Deezer `/artist/{id}/related`** -- Free, no auth. Returns related artists. Need to resolve Deezer artist IDs (search by name).
4. **TasteDive `/api/similar`** -- Content-based recommendations. Good for diversity/discovery. 300 req/hr is tight for recursive expansion.

### Identity Resolution

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| MusicBrainz MBID | N/A | Canonical artist ID | Universal identifier across ListenBrainz, Last.fm (via MBID param), and metadata systems. Already decided | HIGH |
| string-similarity | 4.0.4 | Fuzzy name matching | Sorensen-Dice coefficient, ~700 bytes minified, O(n) performance. Perfect for artist name deduplication across providers | HIGH |

**Why string-similarity over Fuse.js:** Fuse.js (7.1.0, ~5KB gzipped) is a full fuzzy *search* library with indexing, scoring, and query parsing. We do not need search -- we need pairwise string comparison to deduplicate "The Beatles" vs "Beatles, The" vs "Beatles". `string-similarity` does exactly this at 1/7th the size. Use `compareTwoStrings()` and `findBestMatch()`.

**Why NOT Fuse.js:** Overkill for our use case. Fuse.js excels at searching through a local dataset with a query. We are comparing known strings from different providers, not searching a corpus.

### Rate Limiting & Request Queue

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| p-queue | 9.1 | Per-provider request queue | Actively maintained (sindresorhus). Concurrency control + `intervalCap`/`interval` for rate limiting. ESM-native. Supports AbortController for cancellation | HIGH |

**Why p-queue over Bottleneck:** Bottleneck (2.19.5) has not been updated in 6+ years. While stable and battle-tested (4.4M weekly downloads), it is effectively unmaintained. p-queue is actively maintained, ESM-native (critical for our ESM-first engine), smaller, and provides the exact primitives we need: concurrency control + interval-based rate limiting. Bottleneck's clustering/Redis features are irrelevant for a client-side library.

**Why NOT Bottleneck:** Last published 6 years ago. CJS-only, requires extra setup for ESM. Overkill features (Redis clustering, reservoir). The GitHub issue "Is bottleneck still maintained?" is telling.

### Caching

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Built-in Map/LRU | N/A | In-memory response cache | Engine must stay under 50KB gzipped. No external cache dependency needed for a client library. Simple TTL-based Map with max size is sufficient | HIGH |

**Why no external cache library:** The engine is a library that runs in both Node.js and browser. External cache libraries (lru-cache, node-cache) add weight and may not be isomorphic. A ~50-line custom LRU cache with TTL is trivial and keeps the engine dependency-free.

### HTTP Client

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Native `fetch` | N/A | All HTTP requests | Project constraint: no axios. `fetch` is available in Node 18+ and all modern browsers. Zero dependency. SSR-safe | HIGH |

**Do NOT use axios.** Project explicitly requires `fetch` for SSR safety and zero-dep engine.

### Supporting Libraries (Optional)

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| @tanstack/react-query | 5.x | Viewer data fetching | Only if viewer needs its own fetch layer beyond engine. Evaluate during Phase 1. Do not add prematurely | MEDIUM |
| zod | 3.x | Runtime validation | Validate API responses from providers. Type-safe parsing of unknown JSON. Lightweight (~2KB) | MEDIUM |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Graph viz | react-force-graph-2d | @nivo/network, react-d3-graph, vis-network | @nivo is SVG (perf ceiling), react-d3-graph unmaintained, vis-network not React-native |
| State | Zustand | Jotai, Redux Toolkit | Jotai is atom-based (over-engineered for this), Redux is boilerplate-heavy |
| Fuzzy match | string-similarity | Fuse.js, fuzzysort | Fuse.js is a search library not a comparator; fuzzysort optimized for sorting not matching |
| Rate limit | p-queue | Bottleneck, limiter | Bottleneck unmaintained 6yr; limiter less feature-rich |
| HTTP | fetch | axios, got, ky | Constraint: SSR-safe, zero-dep engine |
| Test | Vitest | Jest | Vite-native, faster, TypeScript-first |
| Bundler (engine) | tsup | esbuild, rollup, unbuild | tsup wraps esbuild with library-friendly defaults (DTS, dual format) |
| Bundler (viewer) | Vite 8 | webpack, Parcel | Vite 8 with Rolldown is fastest, best DX |

## Additional API Worth Considering

### TheAudioDB (Recommended Addition)

**What it provides:** High-quality artist images (thumbnails, logos, banners), biographies in 6 languages, genre/mood/style metadata, social media links. No similar artists.

**Why add it:** The viewer needs artist images for node rendering and detail panels. MusicBrainz has no images. Last.fm images are often broken/low-quality. TheAudioDB fills the visual metadata gap.

**Cost:** Free with API key. 30 req/min rate limit.

**Recommendation:** Add as a 7th provider focused on metadata enrichment (not similarity). Fetch lazily when user clicks a node to view details, not during graph expansion.

### Discogs API (Deferred)

Could provide discography data and additional images, but adds complexity without contributing to core graph building. Defer to a later phase if needed.

## Installation

```bash
# Initialize monorepo
pnpm init

# Engine package dependencies
cd packages/engine
pnpm add string-similarity p-queue
pnpm add -D tsup typescript vitest @types/string-similarity

# Viewer package dependencies
cd packages/viewer
pnpm add react react-dom react-force-graph-2d zustand
pnpm add -D vite @vitejs/plugin-react typescript vitest

# Optional (evaluate during Phase 1)
# pnpm add @tanstack/react-query zod
```

## Node.js Version Requirement

**Minimum: Node.js 20.19+** (required by Vite 8). Use `engines` field in package.json to enforce.

## Provider API Key Requirements

| Provider | Key Required | How to Get | Cost |
|----------|-------------|------------|------|
| MusicBrainz | No (User-Agent only) | Set custom User-Agent header | Free |
| ListenBrainz Labs | No | None | Free |
| Last.fm | Yes (API key) | https://www.last.fm/api/account/create | Free |
| Deezer | No | None | Free |
| TasteDive | Yes (API key) | https://tastedive.com/read/api | Free |
| Spotify | Yes (OAuth + Premium) | https://developer.spotify.com | Free but requires Premium account |
| TheAudioDB | Yes (API key) | https://www.theaudiodb.com/register.php | Free |

## Sources

- [react-force-graph GitHub](https://github.com/vasturiano/react-force-graph) -- v1.29.1, actively maintained
- [react-force-graph-2d npm](https://www.npmjs.com/package/react-force-graph-2d)
- [Zustand npm](https://www.npmjs.com/package/zustand) -- v5.0.11
- [Vite 8 announcement](https://vite.dev/blog/announcing-vite8) -- Rolldown integration
- [tsup npm](https://www.npmjs.com/package/tsup) -- v8.5.1
- [Vitest 4.0 blog](https://vitest.dev/blog/vitest-4) -- v4.1.0
- [p-queue GitHub](https://github.com/sindresorhus/p-queue) -- v9.1.0
- [string-similarity npm](https://www.npmjs.com/package/string-similarity) -- v4.0.4
- [Fuse.js](https://www.fusejs.io/) -- v7.1.0 (considered, not recommended)
- [Bottleneck GitHub issue: maintenance](https://github.com/SGrondin/bottleneck/issues/207)
- [Spotify Feb 2026 Migration Guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)
- [Spotify Feb 2026 Changelog](https://developer.spotify.com/documentation/web-api/references/changes/february-2026)
- [ListenBrainz Labs API](https://labs.api.listenbrainz.org/)
- [MusicBrainz API docs](https://musicbrainz.org/doc/MusicBrainz_API)
- [Last.fm API docs](https://www.last.fm/api)
- [Deezer API docs](https://developers.deezer.com/api)
- [TasteDive API docs](https://tastedive.com/read/api)
- [TheAudioDB API docs](https://www.theaudiodb.com/free_music_api)
