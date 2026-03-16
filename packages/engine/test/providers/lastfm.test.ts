import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LastFmProvider } from '../../src/providers/lastfm/LastFmProvider.js';
import { RequestQueue } from '../../src/queue/RequestQueue.js';
import { LruCache } from '../../src/cache/LruCache.js';
import {
  createMockFetch,
  MOCK_LASTFM_SIMILAR_RESPONSE,
} from '../fixtures/mock-fetch.js';

function makeTestQueue() {
  return new RequestQueue({
    providerId: 'lastfm',
    requestsPerSecond: 1000,
    maxRetries: 3,
    maxDelayMs: 0,
    circuitBreakerThreshold: 10,
  });
}

describe('LastFmProvider', () => {
  let cache: LruCache;
  let provider: LastFmProvider;

  beforeEach(() => {
    cache = new LruCache(100);
  });

  it('returns SimilarArtist[] with parsed match scores', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_LASTFM_SIMILAR_RESPONSE },
    ]);
    provider = new LastFmProvider({ apiKey: 'test-key', cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('a74b1b7f-71a5-4011-9441-d0b5e4122711');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(3);
    }
  });

  it('parses match string "0.989" to float 0.989', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_LASTFM_SIMILAR_RESPONSE },
    ]);
    provider = new LastFmProvider({ apiKey: 'test-key', cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('a74b1b7f-71a5-4011-9441-d0b5e4122711');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const thomYorke = result.value.find(a => a.name === 'Thom Yorke');
      expect(thomYorke).toBeDefined();
      expect(thomYorke!.score).toBeCloseTo(0.989);
    }
  });

  it('uses artist name as fallback ID when mbid is empty string', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_LASTFM_SIMILAR_RESPONSE },
    ]);
    provider = new LastFmProvider({ apiKey: 'test-key', cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('a74b1b7f-71a5-4011-9441-d0b5e4122711');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const obscure = result.value.find(a => a.name === 'Obscure Artist');
      expect(obscure).toBeDefined();
      expect(obscure!.id).toBe('Obscure Artist'); // not empty string
    }
  });

  it('uses valid 36-char mbid as id field', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_LASTFM_SIMILAR_RESPONSE },
    ]);
    provider = new LastFmProvider({ apiKey: 'test-key', cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('a74b1b7f-71a5-4011-9441-d0b5e4122711');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const thomYorke = result.value.find(a => a.name === 'Thom Yorke');
      expect(thomYorke!.id).toBe('b7ffd2af-418f-4be2-bdd1-22f8b48613da');
    }
  });

  it('returns cached result on second call without hitting API', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_LASTFM_SIMILAR_RESPONSE },
    ]);
    provider = new LastFmProvider({ apiKey: 'test-key', cache, fetchFn: mockFetch, queue: makeTestQueue() });

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
    provider = new LastFmProvider({ apiKey: 'test-key', cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('a74b1b7f-71a5-4011-9441-d0b5e4122711');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('RateLimitError');
      expect(result.error.provider).toBe('lastfm');
    }
  });

  it('has requiresAuth: true and getSimilarArtists: true in config', () => {
    provider = new LastFmProvider({ apiKey: 'test-key' });
    expect(provider.config.requiresAuth).toBe(true);
    expect(provider.config.capabilities.getSimilarArtists).toBe(true);
    expect(provider.config.id).toBe('lastfm');
  });

  it('constructor requires apiKey parameter', () => {
    // @ts-expect-error — intentionally missing apiKey
    expect(() => new LastFmProvider({})).not.toThrow(); // no runtime check, just type check
    expect(() => new LastFmProvider({ apiKey: 'my-key' })).not.toThrow();
  });
});
