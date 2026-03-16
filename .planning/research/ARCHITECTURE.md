# Architecture Patterns

**Domain:** Multi-provider artist similarity graph engine (monorepo: engine library + React viewer)
**Researched:** 2026-03-16

## Recommended Architecture

The system is a **pipeline architecture** with four distinct layers: Provider, Resolution, Graph, and Presentation. Data flows strictly downward. The engine package owns the first three layers; the viewer owns the fourth.

```
[Seed Artist Input]
        |
  +-----v------+
  | PROVIDER    |  Per-provider adapters with rate-limit-aware queue
  | LAYER       |  Parallel fan-out, graceful degradation on failure
  +-----+------+
        |  ProviderResult[] (raw, heterogeneous)
  +-----v------+
  | RESOLUTION  |  Entity resolution: MBID anchor + fuzzy matching
  | LAYER       |  Deduplication, ID mapping table, metadata merge
  +-----+------+
        |  ResolvedArtist[] (canonical, deduplicated)
  +-----v------+
  | GRAPH       |  Graph construction: nodes, edges, weights
  | LAYER       |  Adjacency list, similarity scoring, expansion queue
  +-----+------+
        |  ArtistGraph { nodes: ArtistNode[], edges: SimilarityEdge[] }
  +-----v------+
  | PRESENTATION|  Force-directed rendering, interaction, UI state
  | LAYER       |  react-force-graph-2d, Zustand store, detail panel
  +-----------+
```

### Component Boundaries

| Component | Package | Responsibility | Communicates With |
|-----------|---------|---------------|-------------------|
| **ProviderRegistry** | engine | Registers/manages provider adapters, fan-out orchestration | RequestQueue, all Adapters |
| **ProviderAdapter** (x6) | engine | Translates provider-specific API to common `ProviderResult` type | External APIs, ProviderRegistry |
| **RequestQueue** | engine | Per-provider rate limiting, backoff, retry, circuit breaker | ProviderAdapters (wraps their HTTP calls) |
| **CacheManager** | engine | LRU in-memory cache with optional persistent adapter | RequestQueue (cache-before-fetch), all layers |
| **EntityResolver** | engine | MBID-anchored deduplication, fuzzy name matching, ID mapping | ProviderRegistry (consumes results), GraphBuilder |
| **GraphBuilder** | engine | Constructs/maintains adjacency list, computes edge weights, manages expansion | EntityResolver (consumes resolved artists) |
| **Engine Facade** | engine | Public API surface: `explore(seedArtist)`, `expand(artistId)`, event emitter | All engine internals, consumed by Viewer |
| **GraphStore** | viewer | Zustand store holding graph state, UI state, provider status | Engine Facade (subscribes to events) |
| **GraphRenderer** | viewer | react-force-graph-2d wrapper with Canvas/WebGL rendering | GraphStore (reads state) |
| **ControlPanel** | viewer | Provider toggles, depth slider, node limit, layout controls | GraphStore (dispatches actions) |
| **DetailPanel** | viewer | Artist metadata display, external links, images | GraphStore (selected node) |

### Data Flow

**Phase 1: Initial Exploration**
1. User inputs seed artist name (string)
2. Engine Facade receives `explore("Artist Name")`
3. ProviderRegistry fans out to all enabled adapters in parallel
4. Each adapter calls its API through RequestQueue (rate-limited)
5. Results arrive asynchronously; engine emits progress events
6. EntityResolver receives raw results, resolves MBID via MusicBrainz search, deduplicates
7. GraphBuilder creates initial graph with seed node + similar artist nodes + edges
8. Engine emits `graph:updated` event with serializable `ArtistGraph`
9. Viewer's GraphStore receives update, triggers re-render

**Phase 2: Expansion**
1. User clicks a node in the graph
2. Viewer calls `engine.expand(artistMbid)`
3. Same pipeline runs for the clicked artist
4. GraphBuilder merges new nodes/edges into existing graph (no duplicates)
5. Engine emits `graph:updated` with merged graph

**Phase 3: Progressive Enhancement**
- Metadata enrichment happens asynchronously after initial graph render
- Genre, image, popularity data trickle in from slower providers
- Engine emits `node:enriched` events for individual node updates
- Viewer updates affected nodes without full re-render

## Core Patterns to Follow

### Pattern 1: Provider Adapter Interface
**What:** Every data source implements a common interface. The engine never talks to APIs directly.
**When:** Always -- this is the core extensibility mechanism.
**Why:** Isolates API-specific quirks, makes adding providers trivial, enables per-provider circuit breaking.

```typescript
interface ProviderAdapter {
  readonly id: ProviderId;  // 'listenbrainz' | 'musicbrainz' | 'lastfm' | 'deezer' | 'tastedive' | 'spotify'
  readonly requiresAuth: boolean;
  readonly rateLimit: RateLimitConfig;

  searchArtist(query: string): Promise<ProviderArtistResult[]>;
  getSimilarArtists(artistRef: ArtistRef): Promise<ProviderSimilarResult[]>;
  getArtistMetadata?(artistRef: ArtistRef): Promise<ProviderMetadata>;
}

// ArtistRef allows lookup by provider-specific ID or name
type ArtistRef = { mbid: string } | { name: string; providerIds?: Record<ProviderId, string> };

interface ProviderSimilarResult {
  provider: ProviderId;
  artist: ProviderArtistResult;
  similarityScore?: number;  // 0-1, provider-specific
  confidence: number;        // How confident provider is in this match
}
```

### Pattern 2: Fan-Out with Graceful Degradation
**What:** Query all providers in parallel. Use whatever comes back. Never fail completely.
**When:** Every `explore()` and `expand()` call.
**Why:** If Last.fm is down, ListenBrainz + MusicBrainz still produce a useful graph.

```typescript
// Conceptual -- not exact implementation
async function fanOutProviders(ref: ArtistRef, adapters: ProviderAdapter[]): Promise<ProviderResult[]> {
  const results = await Promise.allSettled(
    adapters.map(adapter =>
      withCircuitBreaker(adapter.id, () =>
        withTimeout(adapter.getSimilarArtists(ref), 8000)
      )
    )
  );

  // Collect fulfilled results, log/emit failures, never throw
  return results
    .filter((r): r is PromiseFulfilledResult<ProviderSimilarResult[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);
}
```

### Pattern 3: MBID-Anchored Entity Resolution
**What:** Use MusicBrainz ID as the canonical key. Resolve all provider results to MBIDs.
**When:** After raw provider results arrive, before graph construction.
**Why:** "Radiohead" from Last.fm and "Radiohead" from Deezer must become one node. MBID guarantees this.

Resolution strategy (ordered):
1. **Direct MBID** -- Provider already returns MBID (ListenBrainz, MusicBrainz). Use it.
2. **Provider ID mapping** -- Cache maps Deezer ID / Last.fm URL to known MBID. Use it.
3. **MusicBrainz search** -- Query MB search API with artist name. Score > 90 = auto-match.
4. **Fuzzy matching** -- Normalize names (lowercase, remove "The", handle "&" vs "and"), compare against existing graph nodes. Levenshtein distance or similar.
5. **Create unresolved** -- If no match found, create node with provisional ID. Flag for later resolution.

```typescript
interface ResolvedArtist {
  mbid: string;                          // Canonical ID (or provisional UUID if unresolved)
  resolved: boolean;                     // Whether MBID is confirmed
  name: string;                          // Display name (best available)
  providerIds: Record<ProviderId, string>; // Mapping to each provider's ID
  metadata: MergedMetadata;              // Best-of from all providers
  sources: ProviderId[];                 // Which providers contributed data
}
```

### Pattern 4: Per-Provider Rate-Limited Request Queue
**What:** Each provider gets its own queue with rate limits matching the API's constraints.
**When:** Every HTTP request to an external API goes through the queue.
**Why:** Different APIs have wildly different rate limits. MusicBrainz = 1 req/s. Last.fm = 5 req/s. Must respect each independently.

Known rate limits:
| Provider | Rate Limit | Auth Required | Notes |
|----------|-----------|---------------|-------|
| MusicBrainz | 1 req/s average | No (custom User-Agent required) | 503 if exceeded, User-Agent format enforced |
| ListenBrainz | ~10 req/s (headers-based) | Optional (higher limits with token) | Returns X-RateLimit-* headers |
| Last.fm | 5 req/s avg over 5 min | API key required | Error 29 if exceeded |
| Deezer | 50 req/5s | No | 4xx if exceeded |
| TasteDive | ~5 req/s | API key optional | Limited data |
| Spotify | Varies | OAuth required | Heavily restricted; research needed |

**Implementation:** Use a minimal custom queue, not a library (bundle size constraint). Each queue instance tracks its window and defers requests when limit approached.

### Pattern 5: Adjacency List Graph with Weighted Edges
**What:** Maintain graph as adjacency list with weighted, attributed edges.
**When:** Graph construction and all graph operations.
**Why:** Adjacency list is memory-efficient for sparse graphs (artist similarity graphs are sparse). Custom implementation avoids dependency bloat.

```typescript
interface ArtistGraph {
  nodes: Map<string, ArtistNode>;         // mbid -> node
  edges: Map<string, SimilarityEdge[]>;   // mbid -> outgoing edges

  addNode(artist: ResolvedArtist): ArtistNode;
  addEdge(from: string, to: string, weight: number, sources: ProviderId[]): void;
  mergeGraph(other: ArtistGraph): void;   // For expansion -- adds without duplicates
  getNeighbors(mbid: string): ArtistNode[];
  toSerializable(): SerializableGraph;    // For viewer consumption & export
}

interface SimilarityEdge {
  source: string;        // mbid
  target: string;        // mbid
  weight: number;        // 0-1, normalized composite score
  providerWeights: Record<ProviderId, number>;  // Per-provider raw scores
  sources: ProviderId[]; // Which providers agree on this relationship
}
```

Edge weight computation: Aggregate across providers. More providers agreeing = higher confidence. Normalize to 0-1.

### Pattern 6: Event-Driven Engine-to-Viewer Communication
**What:** Engine emits typed events. Viewer subscribes. No direct coupling.
**When:** All state changes from engine to viewer.
**Why:** Engine must be framework-agnostic (SSR-safe, no React dependency). Events are the cleanest boundary.

```typescript
interface EngineEvents {
  'graph:updated': (graph: SerializableGraph) => void;
  'node:enriched': (nodeId: string, metadata: Partial<ArtistMetadata>) => void;
  'provider:status': (providerId: ProviderId, status: ProviderStatus) => void;
  'exploration:progress': (progress: ExplorationProgress) => void;
  'exploration:complete': () => void;
  'error': (error: EngineError) => void;
}

// Engine uses a typed EventEmitter (tiny-emitter or custom ~200 bytes)
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Provider-Aware Graph Layer
**What:** Graph construction code that knows about specific providers (e.g., `if (source === 'lastfm')`)
**Why bad:** Adding a new provider requires changes in graph layer. Violates separation of concerns.
**Instead:** All provider-specific logic stays in adapters. Graph layer receives uniform `ResolvedArtist` and `SimilarityEdge` types.

### Anti-Pattern 2: Synchronous Full-Graph Updates
**What:** Waiting for ALL providers to respond before rendering anything.
**Why bad:** User stares at a loading spinner for 3-8 seconds. Worst provider becomes bottleneck.
**Instead:** Stream results progressively. Render initial graph from fastest provider (typically Last.fm or Deezer), then merge in slower results. Event-driven updates.

### Anti-Pattern 3: Storing Raw Provider Data in Graph Nodes
**What:** Putting Last.fm response objects directly into graph nodes.
**Why bad:** Couples graph structure to provider API shapes. Bloats serialized graph. Breaks when APIs change.
**Instead:** Normalize all data into canonical `ArtistNode` / `MergedMetadata` shapes during resolution.

### Anti-Pattern 4: Global Rate Limiter
**What:** One rate limiter shared across all providers.
**Why bad:** MusicBrainz's 1 req/s limit would throttle Last.fm (which allows 5 req/s). Wastes capacity.
**Instead:** Per-provider rate limiter instances with per-provider configuration.

### Anti-Pattern 5: React State as Source of Truth for Graph Data
**What:** Building/mutating the graph inside React components or Zustand actions.
**Why bad:** Couples graph logic to React. Breaks SSR-safe engine requirement. Can't reuse in Node.js.
**Instead:** Engine owns all graph data. Viewer receives read-only serializable snapshots via events.

## Scalability Considerations

| Concern | At 50 nodes (seed + 1 depth) | At 200 nodes (2 depths) | At 500+ nodes (3+ depths) |
|---------|------------------------------|-------------------------|---------------------------|
| **API calls** | ~6-12 calls (1 seed x 6 providers) | ~60-120 calls | 300+ calls; must batch & cache aggressively |
| **Entity resolution** | Trivial; few collisions | Moderate; fuzzy matching needed | Must precompute; use cached MBID mappings |
| **Graph rendering** | Any approach works | Canvas required (not SVG) | Disable pointer tracking; consider web worker for simulation; cull off-screen nodes |
| **Memory** | Negligible | ~2-5MB graph data | ~10-25MB; consider pagination or depth-limiting |
| **Cache** | Nice-to-have | Important for re-expansion | Essential; LRU with TTL to avoid stale data |

## Caching Architecture

Two-tier caching strategy:

**Tier 1: Request Cache (in RequestQueue)**
- Caches raw HTTP responses by URL + params
- LRU, configurable max entries (default: 500)
- TTL: 1 hour for similarity data, 24 hours for metadata
- Prevents redundant API calls during expansion

**Tier 2: Resolution Cache (in EntityResolver)**
- Maps `(providerName, providerId)` -> MBID
- Maps `normalizedName` -> MBID
- LRU, configurable (default: 2000 entries)
- TTL: 7 days (artist identities rarely change)
- Prevents repeated MusicBrainz lookups for the same artist

**Optional Tier 3: Persistent Cache (adapter interface)**
- Engine exposes `CacheAdapter` interface
- Default: in-memory only (no dependencies)
- Users can plug in localStorage, IndexedDB, or fs-based cache
- Viewer ships with a localStorage adapter

```typescript
interface CacheAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

## Suggested Build Order (Dependencies Between Components)

Build order is driven by dependency chains. Each layer depends on the one below it.

```
Phase 1: Foundation (no external dependencies between components)
  1. Core types & interfaces (ArtistNode, SimilarityEdge, ProviderAdapter, etc.)
  2. RequestQueue with rate limiting (needed by all adapters)
  3. CacheManager with LRU (needed by RequestQueue)
  4. Event emitter (needed by Engine Facade)

Phase 2: Provider Layer (depends on Phase 1)
  5. MusicBrainz adapter (first -- provides MBID, the canonical anchor)
  6. ListenBrainz adapter (second -- no auth, has similar artists, uses MBID natively)
  7. Last.fm adapter (third -- most similar artist data, needs API key)
  8. Deezer adapter (fourth -- no auth, good metadata)
  9. TasteDive adapter (fifth -- supplementary)
  10. Spotify adapter (last -- research-dependent, most restricted)

Phase 3: Resolution Layer (depends on Phase 2)
  11. EntityResolver (MBID resolution + fuzzy matching + dedup)
  12. Metadata merger (combine best-of from all providers)

Phase 4: Graph Layer (depends on Phase 3)
  13. GraphBuilder (adjacency list, edge weighting, merge logic)
  14. Engine Facade (public API, wires everything together)

Phase 5: Viewer Layer (depends on Phase 4)
  15. GraphStore (Zustand store consuming engine events)
  16. GraphRenderer (react-force-graph-2d wrapper)
  17. ControlPanel + DetailPanel
  18. Export functionality (JSON, Gephi)
```

**Why this order:**
- Types first because everything depends on shared interfaces
- MusicBrainz first among providers because it is the identity anchor; you cannot test entity resolution without it
- RequestQueue before adapters because every adapter needs rate-limited HTTP
- Entity resolution before graph because the graph requires deduplicated nodes
- Engine Facade before viewer because the viewer consumes the engine's public API
- A single provider + resolution + graph is enough for an end-to-end demo; remaining providers are additive

## Sources

- [MusicBrainz API Rate Limiting](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting) -- HIGH confidence
- [MusicBrainz Identifiers (MBID)](https://musicbrainz.org/doc/MusicBrainz_Identifier) -- HIGH confidence
- [MusicBrainz API Search](https://musicbrainz.org/doc/MusicBrainz_API/Search) -- HIGH confidence
- [ListenBrainz API Documentation](https://listenbrainz.readthedocs.io/en/latest/users/api/index.html) -- HIGH confidence
- [Last.fm artist.getSimilar](https://www.last.fm/api/show/artist.getSimilar) -- HIGH confidence
- [Last.fm API Terms of Service (rate limits)](https://www.last.fm/api/tos) -- HIGH confidence
- [react-force-graph GitHub](https://github.com/vasturiano/react-force-graph) -- HIGH confidence
- [D3 Force-Directed Web Worker Pattern (Observable)](https://observablehq.com/@d3/force-directed-web-worker) -- HIGH confidence
- [Graphology](https://graphology.github.io/) -- MEDIUM confidence (considered but not recommended due to bundle size)
- [lru-cache npm](https://www.npmjs.com/package/lru-cache) -- HIGH confidence
- [Bottleneck Rate Limiter](https://dev.to/arifszn/prevent-api-overload-a-comprehensive-guide-to-rate-limiting-with-bottleneck-c2p) -- MEDIUM confidence (considered but custom preferred for bundle size)
- [Aggregator Pattern in Microservices](https://mdjamilkashemporosh.medium.com/the-aggregator-pattern-in-microservice-architecture-your-go-to-guide-cd54575a5e6e) -- MEDIUM confidence
- [Resilient REST API Integrations: Graceful Degradation](https://medium.com/@oshiryaeva/building-resilient-rest-api-integrations-graceful-degradation-and-combining-patterns-e8352d8e29c0) -- MEDIUM confidence
