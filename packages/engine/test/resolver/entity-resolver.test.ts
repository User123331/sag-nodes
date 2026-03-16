import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityResolver } from '../../src/resolver/EntityResolver.js';
import { MusicBrainzProvider } from '../../src/providers/musicbrainz/MusicBrainzProvider.js';
import { RequestQueue } from '../../src/queue/RequestQueue.js';
import { LruCache } from '../../src/cache/LruCache.js';
import {
  createMockFetch,
  MOCK_MB_SEARCH_RESPONSE,
  MOCK_MB_AMBIGUOUS_SEARCH_RESPONSE,
  MOCK_MB_URL_LOOKUP_RESPONSE,
  MOCK_MB_ARTIST_URL_RELS_RESPONSE,
} from '../fixtures/mock-fetch.js';

function makeTestQueue(providerId = 'musicbrainz') {
  return new RequestQueue({
    providerId,
    requestsPerSecond: 1000,
    maxRetries: 3,
    maxDelayMs: 0,
    circuitBreakerThreshold: 10,
  });
}

function makeMbProvider(mockFetch: ReturnType<typeof createMockFetch>) {
  return new MusicBrainzProvider({
    cache: new LruCache(100),
    fetchFn: mockFetch,
    queue: makeTestQueue('musicbrainz'),
  });
}

describe('EntityResolver', () => {
  let cache: LruCache;

  beforeEach(() => {
    cache = new LruCache(500);
  });

  describe('resolveNameToMbids', () => {
    it('returns single candidate with correct MBID and score >= 0.75 for unambiguous artist', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_SEARCH_RESPONSE },
      ]);
      const resolver = new EntityResolver({
        mbProvider: makeMbProvider(mockFetch),
        cache,
      });

      const candidates = await resolver.resolveNameToMbids('Radiohead');
      expect(candidates).toHaveLength(1);
      expect(candidates[0]!.mbid).toBe('a74b1b7f-71a5-4011-9441-d0b5e4122711');
      expect(candidates[0]!.name).toBe('Radiohead');
      expect(candidates[0]!.score).toBeGreaterThanOrEqual(0.75);
    });

    it('returns multiple candidates for ambiguous artist — does NOT merge them', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_AMBIGUOUS_SEARCH_RESPONSE },
      ]);
      const resolver = new EntityResolver({
        mbProvider: makeMbProvider(mockFetch),
        cache,
      });

      const candidates = await resolver.resolveNameToMbids('John Williams');
      // Film composer (score 1.0) and classical guitarist (score 0.95) pass threshold
      expect(candidates).toHaveLength(2);
      const mbids = candidates.map(c => c.mbid);
      expect(mbids).toContain('mbid-john-williams-film');
      expect(mbids).toContain('mbid-john-williams-guitar');
      // Each is kept as a separate distinct entry
      const film = candidates.find(c => c.mbid === 'mbid-john-williams-film');
      const guitar = candidates.find(c => c.mbid === 'mbid-john-williams-guitar');
      expect(film!.disambiguation).toBe('film composer');
      expect(guitar!.disambiguation).toBe('classical guitarist');
    });

    it('filters out candidates below fuzzyThreshold (score < 0.75)', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_AMBIGUOUS_SEARCH_RESPONSE },
      ]);
      const resolver = new EntityResolver({
        mbProvider: makeMbProvider(mockFetch),
        cache,
      });

      const candidates = await resolver.resolveNameToMbids('John Williams');
      // Country singer has score 50 → normalized 0.5 < 0.75
      const lowScoreEntry = candidates.find(c => c.mbid === 'mbid-john-williams-low');
      expect(lowScoreEntry).toBeUndefined();
    });

    it('caches results — second call with same name does not hit MusicBrainz API', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_SEARCH_RESPONSE },
      ]);
      const resolver = new EntityResolver({
        mbProvider: makeMbProvider(mockFetch),
        cache,
      });

      await resolver.resolveNameToMbids('Radiohead');
      const second = await resolver.resolveNameToMbids('Radiohead');

      expect(second).toHaveLength(1);
      expect((mockFetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    });
  });

  describe('resolveUrlToMbid', () => {
    it('returns correct MBID from MB URL lookup for a Spotify URL', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_URL_LOOKUP_RESPONSE },
      ]);
      const resolver = new EntityResolver({
        cache,
        fetchFn: mockFetch,
      });

      const mbid = await resolver.resolveUrlToMbid(
        'https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb',
      );
      expect(mbid).toBe('a74b1b7f-71a5-4011-9441-d0b5e4122711');
    });

    it('returns correct MBID from MB URL lookup for a Deezer URL', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_URL_LOOKUP_RESPONSE },
      ]);
      const resolver = new EntityResolver({
        cache,
        fetchFn: mockFetch,
      });

      // The mock returns the same MBID regardless; we just confirm routing works
      const mbid = await resolver.resolveUrlToMbid('https://www.deezer.com/artist/399');
      expect(mbid).toBe('a74b1b7f-71a5-4011-9441-d0b5e4122711');
    });

    it('returns null on HTTP error (404 response)', async () => {
      const mockFetch = createMockFetch([
        { status: 404, statusText: 'Not Found' },
      ]);
      const resolver = new EntityResolver({
        cache,
        fetchFn: mockFetch,
      });

      const mbid = await resolver.resolveUrlToMbid(
        'https://open.spotify.com/artist/unknown-id',
      );
      expect(mbid).toBeNull();
    });

    it('caches URL resolution — second call prevents duplicate MB lookup', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_URL_LOOKUP_RESPONSE },
      ]);
      const resolver = new EntityResolver({
        cache,
        fetchFn: mockFetch,
      });

      const url = 'https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb';
      await resolver.resolveUrlToMbid(url);
      const second = await resolver.resolveUrlToMbid(url);

      expect(second).toBe('a74b1b7f-71a5-4011-9441-d0b5e4122711');
      expect((mockFetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    });
  });

  describe('resolveSpotifyIdToMbid', () => {
    it('constructs correct Spotify URL and returns MBID', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_URL_LOOKUP_RESPONSE },
      ]);
      const resolver = new EntityResolver({
        cache,
        fetchFn: mockFetch,
      });

      const mbid = await resolver.resolveSpotifyIdToMbid('4Z8W4fKeB5YxbusRsdQVPb');
      expect(mbid).toBe('a74b1b7f-71a5-4011-9441-d0b5e4122711');

      const calledUrl = ((mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string])[0];
      expect(calledUrl).toContain(
        encodeURIComponent('https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb'),
      );
    });
  });

  describe('resolveDeezerIdToMbid', () => {
    it('constructs correct Deezer URL and returns MBID', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_URL_LOOKUP_RESPONSE },
      ]);
      const resolver = new EntityResolver({
        cache,
        fetchFn: mockFetch,
      });

      const mbid = await resolver.resolveDeezerIdToMbid(399);
      expect(mbid).toBe('a74b1b7f-71a5-4011-9441-d0b5e4122711');

      const calledUrl = ((mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string])[0];
      expect(calledUrl).toContain(encodeURIComponent('https://www.deezer.com/artist/399'));
    });
  });

  describe('getPlatformIds', () => {
    it('extracts Spotify and Deezer IDs from MusicBrainz url-rels', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_ARTIST_URL_RELS_RESPONSE },
      ]);
      const resolver = new EntityResolver({
        mbProvider: makeMbProvider(mockFetch),
        cache,
      });

      const ids = await resolver.getPlatformIds('a74b1b7f-71a5-4011-9441-d0b5e4122711');
      expect(ids.spotifyId).toBe('4Z8W4fKeB5YxbusRsdQVPb');
      expect(ids.deezerId).toBe('399');
    });

    it('caches platform ID results — second call does not re-fetch', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: MOCK_MB_ARTIST_URL_RELS_RESPONSE },
      ]);
      const resolver = new EntityResolver({
        mbProvider: makeMbProvider(mockFetch),
        cache,
      });

      const mbid = 'a74b1b7f-71a5-4011-9441-d0b5e4122711';
      await resolver.getPlatformIds(mbid);
      const second = await resolver.getPlatformIds(mbid);

      expect(second.spotifyId).toBe('4Z8W4fKeB5YxbusRsdQVPb');
      expect((mockFetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    });
  });
});
