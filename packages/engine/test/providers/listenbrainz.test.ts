import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ListenBrainzProvider } from '../../src/providers/listenbrainz/ListenBrainzProvider.js';
import { RequestQueue } from '../../src/queue/RequestQueue.js';
import { LruCache } from '../../src/cache/LruCache.js';
import {
  createMockFetch,
  MOCK_LB_SIMILAR_RESPONSE,
} from '../fixtures/mock-fetch.js';

function makeTestQueue() {
  return new RequestQueue({
    providerId: 'listenbrainz',
    requestsPerSecond: 1000,
    maxRetries: 3,
    maxDelayMs: 0,
    circuitBreakerThreshold: 10,
  });
}

describe('ListenBrainzProvider', () => {
  let cache: LruCache;
  let provider: ListenBrainzProvider;

  beforeEach(() => {
    cache = new LruCache(100);
  });

  it('returns SimilarArtist[] with MBIDs extracted from response keys', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_LB_SIMILAR_RESPONSE },
    ]);
    provider = new ListenBrainzProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('a74b1b7f-71a5-4011-9441-d0b5e4122711');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(3);
      const ids = result.value.map(a => a.id);
      expect(ids).toContain('cb67438a-7f50-4f2b-a6f1-2bb2729fd538');
      expect(ids).toContain('8bfac288-ccc5-448d-9573-c33ea2aa5c30');
      expect(ids).toContain('b7ffd2af-418f-4be2-bdd1-22f8b48613da');
    }
  });

  it('log-normalizes scores — highest listen count gets score 1.0', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_LB_SIMILAR_RESPONSE },
    ]);
    provider = new ListenBrainzProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('a74b1b7f-71a5-4011-9441-d0b5e4122711');
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Björk has 900 listens — the max, so score should be 1.0
      const bjork = result.value.find(a => a.name === 'Björk');
      expect(bjork).toBeDefined();
      expect(bjork!.score).toBeCloseTo(1.0);
      // All scores 0-1
      for (const a of result.value) {
        expect(a.score).toBeGreaterThanOrEqual(0);
        expect(a.score).toBeLessThanOrEqual(1);
      }
    }
  });

  it('returns cached result on second call without hitting API', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_LB_SIMILAR_RESPONSE },
    ]);
    provider = new ListenBrainzProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const mbid = 'a74b1b7f-71a5-4011-9441-d0b5e4122711';
    await provider.getSimilarArtists(mbid);
    const result2 = await provider.getSimilarArtists(mbid);

    expect(result2.ok).toBe(true);
    expect((mockFetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it('returns RateLimitError on 429 response', async () => {
    const mockFetch = createMockFetch([
      { status: 429, statusText: 'Too Many Requests' },
      { status: 429, statusText: 'Too Many Requests' },
      { status: 429, statusText: 'Too Many Requests' },
      { status: 429, statusText: 'Too Many Requests' },
    ]);
    provider = new ListenBrainzProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('a74b1b7f-71a5-4011-9441-d0b5e4122711');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('RateLimitError');
      expect(result.error.provider).toBe('listenbrainz');
    }
  });

  it('returns NotFoundError on 404 response', async () => {
    const mockFetch = createMockFetch([
      { status: 404, statusText: 'Not Found' },
    ]);
    provider = new ListenBrainzProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('unknown-mbid');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('NotFoundError');
      expect(result.error.provider).toBe('listenbrainz');
    }
  });

  it('reports correct capabilities', () => {
    provider = new ListenBrainzProvider();
    expect(provider.config.id).toBe('listenbrainz');
    expect(provider.config.capabilities.searchArtist).toBe(false);
    expect(provider.config.capabilities.getSimilarArtists).toBe(true);
    expect(provider.config.capabilities.getArtistDetails).toBe(false);
    expect(provider.config.requiresAuth).toBe(false);
  });

  it('handles empty response — returns empty array', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: {} },
    ]);
    provider = new ListenBrainzProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('a74b1b7f-71a5-4011-9441-d0b5e4122711');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('includes pop_begin=0 and pop_end=100 in request URL', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_LB_SIMILAR_RESPONSE },
    ]);
    provider = new ListenBrainzProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

    await provider.getSimilarArtists('a74b1b7f-71a5-4011-9441-d0b5e4122711');
    const callArgs = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const url = callArgs[0] as string;
    expect(url).toContain('pop_begin=0');
    expect(url).toContain('pop_end=100');
  });
});
