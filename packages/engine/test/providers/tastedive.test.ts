import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TasteDiveProvider } from '../../src/providers/tastedive/TasteDiveProvider.js';
import { RequestQueue } from '../../src/queue/RequestQueue.js';
import { LruCache } from '../../src/cache/LruCache.js';
import {
  createMockFetch,
  MOCK_TASTEDIVE_RESPONSE,
} from '../fixtures/mock-fetch.js';

function makeTestQueue() {
  return new RequestQueue({
    providerId: 'tastedive',
    requestsPerSecond: 1000,
    maxRetries: 3,
    maxDelayMs: 0,
    circuitBreakerThreshold: 10,
  });
}

describe('TasteDiveProvider', () => {
  let cache: LruCache;
  let provider: TasteDiveProvider;

  beforeEach(() => {
    cache = new LruCache(100);
    // Ensure no window is defined in test environment
    if ('window' in globalThis) {
      delete (globalThis as any).window;
    }
  });

  it('returns SimilarArtist[] with names as IDs', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_TASTEDIVE_RESPONSE },
    ]);
    provider = new TasteDiveProvider({ apiKey: 'test-key', cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('Radiohead');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(3);
      expect(result.value[0]!.id).toBe('Portishead');
      expect(result.value[0]!.name).toBe('Portishead');
    }
  });

  it('all returned artists have fixed score of 0.5', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_TASTEDIVE_RESPONSE },
    ]);
    provider = new TasteDiveProvider({ apiKey: 'test-key', cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('Radiohead');
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const artist of result.value) {
        expect(artist.score).toBe(0.5);
      }
    }
  });

  it('uses music: prefix in query parameter', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_TASTEDIVE_RESPONSE },
    ]);
    provider = new TasteDiveProvider({ apiKey: 'test-key', cache, fetchFn: mockFetch, queue: makeTestQueue() });

    await provider.getSimilarArtists('Radiohead');
    const callArgs = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const url = callArgs[0] as string;
    expect(url).toContain('q=music%3ARadiohead');
  });

  it('returns empty array when in browser environment with no proxyUrl', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_TASTEDIVE_RESPONSE },
    ]);
    // Simulate browser environment
    (globalThis as any).window = {};
    provider = new TasteDiveProvider({ apiKey: 'test-key', cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('Radiohead');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
    // Should not have called fetch
    expect((mockFetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);

    // Cleanup
    delete (globalThis as any).window;
  });

  it('routes through proxyUrl when in browser environment with proxyUrl set', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_TASTEDIVE_RESPONSE },
    ]);
    (globalThis as any).window = {};
    provider = new TasteDiveProvider({
      apiKey: 'test-key',
      cache,
      fetchFn: mockFetch,
      queue: makeTestQueue(),
      proxyUrl: 'https://my-proxy.example.com/tastedive',
    });

    await provider.getSimilarArtists('Radiohead');
    const callArgs = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const url = callArgs[0] as string;
    expect(url).toContain('https://my-proxy.example.com/tastedive');

    delete (globalThis as any).window;
  });

  it('calls TasteDive directly in Node.js environment regardless of proxyUrl', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_TASTEDIVE_RESPONSE },
    ]);
    // No window defined — Node.js environment
    provider = new TasteDiveProvider({
      apiKey: 'test-key',
      cache,
      fetchFn: mockFetch,
      queue: makeTestQueue(),
      proxyUrl: 'https://my-proxy.example.com/tastedive',
    });

    await provider.getSimilarArtists('Radiohead');
    const callArgs = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const url = callArgs[0] as string;
    expect(url).toContain('tastedive.com/api/similar');
  });

  it('returns cached result on second call without hitting API', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: MOCK_TASTEDIVE_RESPONSE },
    ]);
    provider = new TasteDiveProvider({ apiKey: 'test-key', cache, fetchFn: mockFetch, queue: makeTestQueue() });

    await provider.getSimilarArtists('Radiohead');
    const result2 = await provider.getSimilarArtists('Radiohead');

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
    provider = new TasteDiveProvider({ apiKey: 'test-key', cache, fetchFn: mockFetch, queue: makeTestQueue() });

    const result = await provider.getSimilarArtists('Radiohead');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('RateLimitError');
    }
  });

  it('config: requiresAuth true, requestsPerSecond 0.05', () => {
    provider = new TasteDiveProvider({ apiKey: 'test-key' });
    expect(provider.config.requiresAuth).toBe(true);
    expect(provider.config.rateLimit.requestsPerSecond).toBe(0.05);
    expect(provider.config.capabilities.getSimilarArtists).toBe(true);
  });
});
