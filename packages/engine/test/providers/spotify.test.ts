import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpotifyProvider } from '../../src/providers/spotify/SpotifyProvider.js';
import { RequestQueue } from '../../src/queue/RequestQueue.js';
import { LruCache } from '../../src/cache/LruCache.js';
import {
  createMockFetch,
  MOCK_SPOTIFY_TOKEN_RESPONSE,
  MOCK_SPOTIFY_RELATED_RESPONSE,
  MOCK_SPOTIFY_SEARCH_RESPONSE,
} from '../fixtures/mock-fetch.js';

function makeTestQueue() {
  return new RequestQueue({
    providerId: 'spotify',
    requestsPerSecond: 1000,
    maxRetries: 0,
    maxDelayMs: 0,
    circuitBreakerThreshold: 10,
  });
}

describe('SpotifyProvider', () => {
  let cache: LruCache;
  let provider: SpotifyProvider;

  beforeEach(() => {
    cache = new LruCache(100);
  });

  it('acquires token then fetches related artists — returns SimilarArtist[] with fixed 0.5 score', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_SPOTIFY_TOKEN_RESPONSE },
      { status: 200, body: MOCK_SPOTIFY_RELATED_RESPONSE },
    ]);
    provider = new SpotifyProvider({ clientId: 'id', clientSecret: 'secret', cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('4Z8W4fKeB5YxbusRsdQVPb');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0]!.score).toBe(0.5);
      expect(result.value[0]!.name).toBe('Twenty One Pilots');
    }
  });

  it('caches token — second identical call does not re-acquire token', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_SPOTIFY_TOKEN_RESPONSE },
      { status: 200, body: MOCK_SPOTIFY_RELATED_RESPONSE },
      { status: 200, body: MOCK_SPOTIFY_RELATED_RESPONSE },
    ]);
    const nowFn = vi.fn().mockReturnValue(0);
    provider = new SpotifyProvider({
      clientId: 'id',
      clientSecret: 'secret',
      cache: new LruCache(100), // separate cache so result isn't cached
      fetchFn: mockFetch,
      queue: makeTestQueue(),
      getNow: nowFn,
    });

    await provider.getSimilarArtists('4Z8W4fKeB5YxbusRsdQVPb');
    await provider.getSimilarArtists('different-id');

    const calls = (mockFetch as ReturnType<typeof vi.fn>).mock.calls;
    // First call = token, second = related artists, third = related artists (no second token call)
    expect(calls).toHaveLength(3);
    const tokenCalls = calls.filter(([url]) => (url as string).includes('api/token'));
    expect(tokenCalls).toHaveLength(1);
  });

  it('refreshes token when expired', async () => {
    let now = 0;
    const getNow = vi.fn(() => now);
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_SPOTIFY_TOKEN_RESPONSE }, // first token
      { status: 200, body: MOCK_SPOTIFY_RELATED_RESPONSE }, // first request
      { status: 200, body: MOCK_SPOTIFY_TOKEN_RESPONSE }, // second token (refreshed)
      { status: 200, body: MOCK_SPOTIFY_RELATED_RESPONSE }, // second request
    ]);
    provider = new SpotifyProvider({
      clientId: 'id',
      clientSecret: 'secret',
      cache: new LruCache(100),
      fetchFn: mockFetch,
      queue: makeTestQueue(),
      getNow,
    });

    await provider.getSimilarArtists('4Z8W4fKeB5YxbusRsdQVPb');

    // Advance time past token expiry (expires_in=3600 seconds, buffer=60s)
    now = (3600 - 59) * 1000; // past the buffer
    await provider.getSimilarArtists('different-id');

    const calls = (mockFetch as ReturnType<typeof vi.fn>).mock.calls;
    const tokenCalls = calls.filter(([url]) => (url as string).includes('api/token'));
    expect(tokenCalls).toHaveLength(2);
  });

  it('returns AuthError on 401 response and clears cached token', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_SPOTIFY_TOKEN_RESPONSE },
      { status: 401, statusText: 'Unauthorized' },
    ]);
    provider = new SpotifyProvider({ clientId: 'id', clientSecret: 'secret', cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('4Z8W4fKeB5YxbusRsdQVPb');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('AuthError');
      expect(result.error.provider).toBe('spotify');
    }
  });

  it('returns RateLimitError on 429 response with Retry-After header parsed', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_SPOTIFY_TOKEN_RESPONSE },
      { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '30' } },
    ]);
    provider = new SpotifyProvider({ clientId: 'id', clientSecret: 'secret', cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('4Z8W4fKeB5YxbusRsdQVPb');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('RateLimitError');
      if (result.error.kind === 'RateLimitError') {
        expect(result.error.retryAfterMs).toBe(30000);
      }
    }
  });

  it('returns cached results on second identical call without fetch', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_SPOTIFY_TOKEN_RESPONSE },
      { status: 200, body: MOCK_SPOTIFY_RELATED_RESPONSE },
    ]);
    provider = new SpotifyProvider({ clientId: 'id', clientSecret: 'secret', cache, fetchFn: mockFetch, queue: makeTestQueue() });

    await provider.getSimilarArtists('4Z8W4fKeB5YxbusRsdQVPb');
    const result2 = await provider.getSimilarArtists('4Z8W4fKeB5YxbusRsdQVPb');

    expect(result2.ok).toBe(true);
    // Only 2 calls (token + related), not 4
    expect((mockFetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
  });

  it('config: requiresAuth true, getSimilarArtists true, requestsPerSecond 5', () => {
    provider = new SpotifyProvider({ clientId: 'id', clientSecret: 'secret' });
    expect(provider.config.requiresAuth).toBe(true);
    expect(provider.config.capabilities.getSimilarArtists).toBe(true);
    expect(provider.config.rateLimit.requestsPerSecond).toBe(5);
  });

  it('searchSpotifyArtist returns artists with Spotify IDs', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_SPOTIFY_TOKEN_RESPONSE },
      { status: 200, body: MOCK_SPOTIFY_SEARCH_RESPONSE },
    ]);
    provider = new SpotifyProvider({ clientId: 'id', clientSecret: 'secret', cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.searchSpotifyArtist('Radiohead');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]!.id).toBe('4Z8W4fKeB5YxbusRsdQVPb');
      expect(result.value[0]!.name).toBe('Radiohead');
    }
  });
});
