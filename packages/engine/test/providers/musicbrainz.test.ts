import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MusicBrainzProvider } from '../../src/providers/musicbrainz/MusicBrainzProvider.js';
import { RequestQueue } from '../../src/queue/RequestQueue.js';
import { LruCache } from '../../src/cache/LruCache.js';
import {
  createMockFetch,
  MOCK_MB_SEARCH_RESPONSE,
  MOCK_MB_ARTIST_DETAILS_RESPONSE,
} from '../fixtures/mock-fetch.js';

/** Fast queue for tests: high throughput, no real backoff delay, low circuit threshold */
function makeTestQueue() {
  return new RequestQueue({
    providerId: 'musicbrainz',
    requestsPerSecond: 1000,
    maxRetries: 3,
    maxDelayMs: 0,
    circuitBreakerThreshold: 10,
  });
}

describe('MusicBrainzProvider', () => {
  let cache: LruCache;
  let provider: MusicBrainzProvider;

  describe('searchArtist', () => {
    beforeEach(() => {
      cache = new LruCache(100);
    });

    it('returns artist summaries with MBID for a valid query', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_SEARCH_RESPONSE },
      ]);
      provider = new MusicBrainzProvider({ cache, fetchFn: mockFetch });

      const result = await provider.searchArtist('Radiohead');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]!.id).toBe('a74b1b7f-71a5-4011-9441-d0b5e4122711');
        expect(result.value[0]!.name).toBe('Radiohead');
        expect(result.value[0]!.disambiguation).toBe('English rock band');
        expect(result.value[0]!.country).toBe('GB');
      }
    });

    it('normalizes score from 0-100 to 0-1', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_SEARCH_RESPONSE },
      ]);
      provider = new MusicBrainzProvider({ cache, fetchFn: mockFetch });

      const result = await provider.searchArtist('Radiohead');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0]!.score).toBe(1); // 100/100 = 1
      }
    });

    it('sends User-Agent header with every request', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_SEARCH_RESPONSE },
      ]);
      provider = new MusicBrainzProvider({ cache, fetchFn: mockFetch });

      await provider.searchArtist('Radiohead');
      const callArgs = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
      const headers = callArgs[1].headers as Record<string, string>;
      expect(headers['User-Agent']).toContain('SimilarArtistsGraph');
    });

    it('returns cached result on second call without hitting API', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_SEARCH_RESPONSE },
      ]);
      provider = new MusicBrainzProvider({ cache, fetchFn: mockFetch });

      await provider.searchArtist('Radiohead');
      const result2 = await provider.searchArtist('Radiohead');

      expect(result2.ok).toBe(true);
      // Only 1 fetch call — second was cached
      expect((mockFetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    });

    it('returns RateLimitError on 503 response', async () => {
      const mockFetch = createMockFetch([
        { status: 503, statusText: 'Service Unavailable' },
        { status: 503, statusText: 'Service Unavailable' },
        { status: 503, statusText: 'Service Unavailable' },
        { status: 503, statusText: 'Service Unavailable' },
      ]);
      provider = new MusicBrainzProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

      const result = await provider.searchArtist('Radiohead');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('RateLimitError');
        expect(result.error.provider).toBe('musicbrainz');
      }
    });

    it('returns RateLimitError on 429 response', async () => {
      const mockFetch = createMockFetch([
        { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '5' } },
        { status: 429, statusText: 'Too Many Requests' },
        { status: 429, statusText: 'Too Many Requests' },
        { status: 429, statusText: 'Too Many Requests' },
      ]);
      provider = new MusicBrainzProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

      const result = await provider.searchArtist('Radiohead');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('RateLimitError');
      }
    });

    it('returns NotFoundError on 404 response', async () => {
      const mockFetch = createMockFetch([
        { status: 404, statusText: 'Not Found' },
      ]);
      provider = new MusicBrainzProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

      const result = await provider.searchArtist('nonexistent_artist_xyz');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('NotFoundError');
      }
    });

    it('returns NetworkError on unexpected HTTP status', async () => {
      const mockFetch = createMockFetch([
        { status: 500, statusText: 'Internal Server Error' },
      ]);
      provider = new MusicBrainzProvider({ cache, fetchFn: mockFetch, queue: makeTestQueue() });

      const result = await provider.searchArtist('Radiohead');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('NetworkError');
      }
    });
  });

  describe('getArtistDetails', () => {
    beforeEach(() => {
      cache = new LruCache(100);
    });

    it('returns artist details with tags and external URLs', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_ARTIST_DETAILS_RESPONSE },
      ]);
      provider = new MusicBrainzProvider({ cache, fetchFn: mockFetch });

      const result = await provider.getArtistDetails('a74b1b7f-71a5-4011-9441-d0b5e4122711');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('a74b1b7f-71a5-4011-9441-d0b5e4122711');
        expect(result.value.name).toBe('Radiohead');
        expect(result.value.tags).toBeDefined();
        expect(result.value.tags).toHaveLength(2);
        expect(result.value.externalUrls).toBeDefined();
        expect(result.value.externalUrls).toHaveLength(1);
        expect(result.value.externalUrls![0]!.url).toBe('https://radiohead.com');
      }
    });

    it('caches artist details on second request', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_ARTIST_DETAILS_RESPONSE },
      ]);
      provider = new MusicBrainzProvider({ cache, fetchFn: mockFetch });

      await provider.getArtistDetails('a74b1b7f-71a5-4011-9441-d0b5e4122711');
      const result2 = await provider.getArtistDetails('a74b1b7f-71a5-4011-9441-d0b5e4122711');

      expect(result2.ok).toBe(true);
      expect((mockFetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    });
  });

  describe('config', () => {
    it('reports correct capabilities', () => {
      provider = new MusicBrainzProvider();
      expect(provider.config.id).toBe('musicbrainz');
      expect(provider.config.capabilities.searchArtist).toBe(true);
      expect(provider.config.capabilities.getSimilarArtists).toBe(false);
      expect(provider.config.capabilities.getArtistDetails).toBe(true);
      expect(provider.config.requiresAuth).toBe(false);
      expect(provider.config.rateLimit.requestsPerSecond).toBe(1);
    });
  });
});
