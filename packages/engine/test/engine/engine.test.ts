import { describe, it, expect, vi } from 'vitest';
import { createEngine } from '../../src/engine/Engine.js';
import { RequestQueue } from '../../src/queue/RequestQueue.js';
import {
  MOCK_MB_SEARCH_RESPONSE,
  MOCK_MB_ARTIST_URL_RELS_RESPONSE,
  MOCK_LB_SIMILAR_RESPONSE,
  MOCK_LASTFM_SIMILAR_RESPONSE,
  MOCK_DEEZER_SEARCH_RESPONSE,
  MOCK_DEEZER_RELATED_RESPONSE,
} from '../fixtures/mock-fetch.js';
import type { MockResponse } from '../fixtures/mock-fetch.js';

// Fast MB queue for tests — avoids 1 req/s throttle delays
function makeFastMbQueue() {
  return new RequestQueue({
    providerId: 'musicbrainz',
    requestsPerSecond: 1000,
    maxRetries: 3,
    maxDelayMs: 0,
    circuitBreakerThreshold: 10,
  });
}

// Routed mock fetch: maps URL patterns to mock responses
function createRoutedMockFetch(routes: Array<{ pattern: string | RegExp; response: MockResponse }>): typeof fetch {
  return vi.fn(async (url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : (url as Request).url;
    for (const route of routes) {
      const matches = typeof route.pattern === 'string'
        ? urlStr.includes(route.pattern)
        : route.pattern.test(urlStr);
      if (matches) {
        return {
          ok: route.response.status >= 200 && route.response.status < 300,
          status: route.response.status,
          statusText: route.response.statusText ?? 'OK',
          json: async () => route.response.body,
          text: async () => JSON.stringify(route.response.body),
          headers: new Headers(route.response.headers ?? {}),
        } as Response;
      }
    }
    // Default: 404 for unmatched routes
    return {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({}),
      text: async () => '{}',
      headers: new Headers(),
    } as Response;
  }) as unknown as typeof fetch;
}

// Standard routes for Radiohead explore tests
function createRadioheadRoutes(): Array<{ pattern: string | RegExp; response: MockResponse }> {
  return [
    // MusicBrainz search
    {
      pattern: 'musicbrainz.org/ws/2/artist?',
      response: { status: 200, body: MOCK_MB_SEARCH_RESPONSE },
    },
    // MusicBrainz artist details (url-rels)
    {
      pattern: 'musicbrainz.org/ws/2/artist/a74b1b7f',
      response: { status: 200, body: MOCK_MB_ARTIST_URL_RELS_RESPONSE },
    },
    // ListenBrainz similar artists
    {
      pattern: 'listenbrainz.org',
      response: { status: 200, body: MOCK_LB_SIMILAR_RESPONSE },
    },
    // Last.fm similar artists
    {
      pattern: 'audioscrobbler.com',
      response: { status: 200, body: MOCK_LASTFM_SIMILAR_RESPONSE },
    },
    // Deezer search by name
    {
      pattern: 'api.deezer.com/search/artist',
      response: { status: 200, body: MOCK_DEEZER_SEARCH_RESPONSE },
    },
    // Deezer related artists
    {
      pattern: 'api.deezer.com/artist/',
      response: { status: 200, body: MOCK_DEEZER_RELATED_RESPONSE },
    },
    // MusicBrainz URL lookup for Deezer ID resolution (returns 404 — not found is OK, node uses raw id)
    {
      pattern: 'musicbrainz.org/ws/2/url',
      response: { status: 404, body: {} },
    },
  ];
}

describe('Engine', () => {
  it('explore() returns graph with nodes from multiple providers (SC-1)', async () => {
    const mockFetch = createRoutedMockFetch(createRadioheadRoutes());
    const engine = createEngine({
      providers: { lastfm: { apiKey: 'test-api-key' } },
      fetchFn: mockFetch,
      mbQueue: makeFastMbQueue(),
    });

    const result = await engine.explore('Radiohead');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.nodes.length).toBeGreaterThanOrEqual(2);
    expect(result.value.seedMbid).toBe('a74b1b7f-71a5-4011-9441-d0b5e4122711');
  });

  it('edges carry fused score plus per-provider attribution (SC-2)', async () => {
    const mockFetch = createRoutedMockFetch(createRadioheadRoutes());
    const engine = createEngine({
      providers: { lastfm: { apiKey: 'test-api-key' } },
      fetchFn: mockFetch,
      mbQueue: makeFastMbQueue(),
    });

    const result = await engine.explore('Radiohead');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.edges.length).toBeGreaterThan(0);
    const edge = result.value.edges[0]!;
    expect(edge.attribution.length).toBeGreaterThanOrEqual(1);
    expect(edge.attribution[0]).toHaveProperty('provider');
    expect(edge.attribution[0]).toHaveProperty('rawScore');
    expect(edge.fusedScore).toBeGreaterThanOrEqual(0);
    expect(edge.fusedScore).toBeLessThanOrEqual(1);
  });

  it('expand() adds new artists without duplicating existing nodes (SC-3)', async () => {
    const mockFetch = createRoutedMockFetch(createRadioheadRoutes());
    const engine = createEngine({
      providers: { lastfm: { apiKey: 'test-api-key' } },
      fetchFn: mockFetch,
      mbQueue: makeFastMbQueue(),
    });

    const exploreResult = await engine.explore('Radiohead');
    expect(exploreResult.ok).toBe(true);
    if (!exploreResult.ok) return;

    const nodeCountAfterExplore = exploreResult.value.nodeCount;
    expect(nodeCountAfterExplore).toBeGreaterThan(1);

    // Expand on the seed node — should not decrease nodeCount
    const seedMbid = exploreResult.value.seedMbid;
    const expandResult = await engine.expand(seedMbid);

    expect(expandResult.ok).toBe(true);
    if (!expandResult.ok) return;

    // No duplicates — all MBIDs unique
    const mbids = expandResult.value.nodes.map(n => n.mbid);
    const uniqueMbids = new Set(mbids);
    expect(uniqueMbids.size).toBe(mbids.length);

    // nodeCount should not decrease
    expect(expandResult.value.nodeCount).toBeGreaterThanOrEqual(nodeCountAfterExplore);
  });

  it('enforces node budget and sets truncated=true (SC-3)', async () => {
    // Create lots of mock similar artists from LB
    const manyArtistsLB: Record<string, Array<{ recording_mbid: string; similar_artist_mbid: string; similar_artist_name: string; total_listen_count: number }>> = {};
    for (let i = 0; i < 20; i++) {
      const mbid = `artist-mbid-${i.toString().padStart(3, '0')}`;
      manyArtistsLB[mbid] = [{
        recording_mbid: `rec-${i}`,
        similar_artist_mbid: mbid,
        similar_artist_name: `Artist ${i}`,
        total_listen_count: 100,
      }];
    }

    const manyArtistsLastFm = {
      similarartists: {
        artist: Array.from({ length: 20 }, (_, i) => ({
          name: `LastFm Artist ${i}`,
          mbid: `lastfm-mbid-${i.toString().padStart(3, '0')}`,
          match: '0.8',
          url: `https://www.last.fm/music/Artist+${i}`,
          image: [],
        })),
        '@attr': { artist: 'Radiohead' },
      },
    };

    const mockFetch = createRoutedMockFetch([
      {
        pattern: 'musicbrainz.org/ws/2/artist?',
        response: { status: 200, body: MOCK_MB_SEARCH_RESPONSE },
      },
      {
        pattern: 'musicbrainz.org/ws/2/artist/a74b1b7f',
        response: { status: 200, body: MOCK_MB_ARTIST_URL_RELS_RESPONSE },
      },
      {
        pattern: 'listenbrainz.org',
        response: { status: 200, body: manyArtistsLB },
      },
      {
        pattern: 'audioscrobbler.com',
        response: { status: 200, body: manyArtistsLastFm },
      },
      {
        pattern: 'api.deezer.com/search/artist',
        response: { status: 200, body: MOCK_DEEZER_SEARCH_RESPONSE },
      },
      {
        pattern: 'api.deezer.com/artist/',
        response: { status: 200, body: MOCK_DEEZER_RELATED_RESPONSE },
      },
      {
        pattern: 'musicbrainz.org/ws/2/url',
        response: { status: 404, body: {} },
      },
    ]);

    const engine = createEngine({
      maxNodes: 5,
      providers: { lastfm: { apiKey: 'test-api-key' } },
      fetchFn: mockFetch,
      mbQueue: makeFastMbQueue(),
    });

    const result = await engine.explore('Radiohead');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.nodeCount).toBeLessThanOrEqual(5);
    expect(result.value.truncated).toBe(true);
  });

  it('Spotify is auto-disabled when no credentials provided', async () => {
    const mockFetch = createRoutedMockFetch(createRadioheadRoutes());
    // Create engine WITHOUT Spotify credentials
    const engine = createEngine({
      providers: { lastfm: { apiKey: 'test-api-key' } },
      fetchFn: mockFetch,
      mbQueue: makeFastMbQueue(),
    });

    await engine.explore('Radiohead');

    // Verify no calls were made to Spotify endpoints
    const calls = (mockFetch as ReturnType<typeof vi.fn>).mock.calls as Array<[string | URL | Request, RequestInit | undefined]>;
    const spotifyCalls = calls.filter(([url]) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : (url as Request).url;
      return urlStr.includes('spotify.com') || urlStr.includes('api.spotify');
    });
    expect(spotifyCalls.length).toBe(0);
  });

  it('graceful degradation when a provider fails', async () => {
    // Use 404 (NotFoundError, not retryable) to keep test fast
    const mockFetch = createRoutedMockFetch([
      // MusicBrainz search — OK
      {
        pattern: 'musicbrainz.org/ws/2/artist?',
        response: { status: 200, body: MOCK_MB_SEARCH_RESPONSE },
      },
      // MusicBrainz artist details — OK
      {
        pattern: 'musicbrainz.org/ws/2/artist/a74b1b7f',
        response: { status: 200, body: MOCK_MB_ARTIST_URL_RELS_RESPONSE },
      },
      // ListenBrainz — 404 (NotFoundError, not retryable — keeps test fast)
      {
        pattern: 'listenbrainz.org',
        response: { status: 404, statusText: 'Not Found', body: {} },
      },
      // Last.fm — OK
      {
        pattern: 'audioscrobbler.com',
        response: { status: 200, body: MOCK_LASTFM_SIMILAR_RESPONSE },
      },
      // Deezer search by name
      {
        pattern: 'api.deezer.com/search/artist',
        response: { status: 200, body: MOCK_DEEZER_SEARCH_RESPONSE },
      },
      // Deezer related artists
      {
        pattern: 'api.deezer.com/artist/',
        response: { status: 200, body: MOCK_DEEZER_RELATED_RESPONSE },
      },
      {
        pattern: 'musicbrainz.org/ws/2/url',
        response: { status: 404, body: {} },
      },
    ]);

    const engine = createEngine({
      providers: { lastfm: { apiKey: 'test-api-key' } },
      fetchFn: mockFetch,
      mbQueue: makeFastMbQueue(),
    });

    const result = await engine.explore('Radiohead');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Should still have results from Last.fm
    expect(result.value.nodes.length).toBeGreaterThan(1);

    // Warnings should include the ListenBrainz failure
    expect(result.value.warnings.length).toBeGreaterThan(0);
    const lbWarning = result.value.warnings.find(w => w.provider === 'listenbrainz');
    expect(lbWarning).toBeDefined();
  });

  it('explore() returns NotFoundError for unknown artist', async () => {
    const mockFetch = createRoutedMockFetch([
      // MusicBrainz search returns empty artists
      {
        pattern: 'musicbrainz.org/ws/2/artist?',
        response: {
          status: 200,
          body: {
            created: '2026-03-16T00:00:00.000Z',
            count: 0,
            offset: 0,
            artists: [],
          },
        },
      },
    ]);

    const engine = createEngine({
      fetchFn: mockFetch,
      mbQueue: makeFastMbQueue(),
    });

    const result = await engine.explore('xyznonexistent');

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe('NotFoundError');
  });
});
