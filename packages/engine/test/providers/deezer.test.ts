import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeezerProvider } from '../../src/providers/deezer/DeezerProvider.js';
import { RequestQueue } from '../../src/queue/RequestQueue.js';
import { LruCache } from '../../src/cache/LruCache.js';
import {
  createMockFetch,
  MOCK_DEEZER_RELATED_RESPONSE,
  MOCK_DEEZER_SEARCH_RESPONSE,
} from '../fixtures/mock-fetch.js';

function makeTestQueue() {
  return new RequestQueue({
    providerId: 'deezer',
    requestsPerSecond: 1000,
    maxRetries: 3,
    maxDelayMs: 0,
    circuitBreakerThreshold: 10,
  });
}

describe('DeezerProvider', () => {
  let cache: LruCache;
  let provider: DeezerProvider;

  beforeEach(() => {
    cache = new LruCache(100);
  });

  it('returns SimilarArtist[] with Deezer IDs as strings', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_DEEZER_RELATED_RESPONSE },
    ]);
    provider = new DeezerProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('399');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0]!.id).toBe('6404');  // string, not number
      expect(result.value[1]!.id).toBe('1188');
    }
  });

  it('all returned artists have fixed score of 0.5', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_DEEZER_RELATED_RESPONSE },
    ]);
    provider = new DeezerProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('399');
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const artist of result.value) {
        expect(artist.score).toBe(0.5);
      }
    }
  });

  it('includes nb_fan in metadata when present', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_DEEZER_RELATED_RESPONSE },
    ]);
    provider = new DeezerProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('399');
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Both artists in mock have nb_fan
      const muse = result.value.find(a => a.name === 'Muse');
      expect(muse).toBeDefined();
      expect((muse as any).metadata?.nb_fan).toBe(790414);
    }
  });

  it('returns cached result on second call without hitting API', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_DEEZER_RELATED_RESPONSE },
    ]);
    provider = new DeezerProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

    await provider.getSimilarArtists('399');
    const result2 = await provider.getSimilarArtists('399');

    expect(result2.ok).toBe(true);
    expect((mockFetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it('returns NotFoundError on 404 response', async () => {
    const mockFetch = createMockFetch([
      { status: 404, statusText: 'Not Found' },
    ]);
    provider = new DeezerProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('99999');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('NotFoundError');
      expect(result.error.provider).toBe('deezer');
    }
  });

  it('returns RateLimitError on 429 response', async () => {
    const mockFetch = createMockFetch([
      { status: 429, statusText: 'Too Many Requests' },
      { status: 429, statusText: 'Too Many Requests' },
      { status: 429, statusText: 'Too Many Requests' },
      { status: 429, statusText: 'Too Many Requests' },
    ]);
    provider = new DeezerProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('399');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('RateLimitError');
    }
  });

  it('config: requiresAuth false, getSimilarArtists true, requestsPerSecond 5', () => {
    provider = new DeezerProvider();
    expect(provider.config.requiresAuth).toBe(false);
    expect(provider.config.capabilities.getSimilarArtists).toBe(true);
    expect(provider.config.rateLimit.requestsPerSecond).toBe(5);
  });

  it('searchDeezerArtist returns artists with numeric IDs', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_DEEZER_SEARCH_RESPONSE },
    ]);
    provider = new DeezerProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.searchDeezerArtist('Radiohead');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]!.id).toBe(399); // numeric
      expect(result.value[0]!.name).toBe('Radiohead');
    }
  });
});
