import type { ProviderAdapter, ProviderConfig } from '../../types/provider.js';
import type { SimilarArtist } from '../../types/artist.js';
import type { ProviderError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import type { CacheStore } from '../../cache/CacheStore.js';
import { ok } from '../../types/result.js';
import { RequestQueue } from '../../queue/RequestQueue.js';
import { LruCache } from '../../cache/LruCache.js';
import type { LastFmGetSimilarResponse } from './types.js';

const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0';
const DEFAULT_TTL_MS = 5 * 60 * 1000;

export interface LastFmProviderOptions {
  readonly apiKey: string;
  readonly cache?: CacheStore;
  readonly ttlMs?: number;
  readonly fetchFn?: typeof fetch;
  readonly queue?: RequestQueue;
  readonly limit?: number;
}

export class LastFmProvider implements ProviderAdapter {
  readonly config: ProviderConfig = {
    id: 'lastfm',
    baseUrl: LASTFM_BASE,
    rateLimit: { requestsPerSecond: 3 },
    requiresAuth: true,
    capabilities: {
      searchArtist: false,
      getSimilarArtists: true,
      getArtistDetails: false,
    },
  };

  private readonly apiKey: string;
  private readonly queue: RequestQueue;
  private readonly cache: CacheStore;
  private readonly ttlMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly limit: number;

  constructor(options: LastFmProviderOptions) {
    this.apiKey = options.apiKey;
    this.queue = options.queue ?? new RequestQueue({ providerId: 'lastfm', requestsPerSecond: 3 });
    this.cache = options.cache ?? new LruCache(500);
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.fetchFn = options.fetchFn ?? fetch;
    this.limit = options.limit ?? 50;
  }

  async getSimilarArtists(mbid: string): Promise<Result<SimilarArtist[], ProviderError>> {
    const cacheKey = `lastfm:getSimilarArtists:${mbid}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return ok(JSON.parse(cached) as SimilarArtist[]);
    }

    const params = new URLSearchParams({
      method: 'artist.getSimilar',
      mbid,
      api_key: this.apiKey,
      format: 'json',
      limit: String(this.limit),
    });
    const url = `${LASTFM_BASE}?${params}`;

    const result = await this.queue.execute(async () => {
      const res = await this.fetchFn(url, {
        headers: { 'Accept': 'application/json' },
      });

      if (res.status === 404) {
        throw { kind: 'NotFoundError', provider: 'lastfm', query: mbid } satisfies ProviderError;
      }
      if (res.status === 429 || res.status === 503) {
        throw { kind: 'RateLimitError', provider: 'lastfm' } satisfies ProviderError;
      }
      if (!res.ok) {
        throw { kind: 'NetworkError', provider: 'lastfm', message: `HTTP ${res.status}: ${res.statusText}` } satisfies ProviderError;
      }

      const data = (await res.json()) as LastFmGetSimilarResponse;
      return data.similarartists.artist.map(toSimilarArtist);
    });

    if (result.ok) {
      this.cache.set(cacheKey, JSON.stringify(result.value), this.ttlMs);
    }

    return result;
  }
}

function toSimilarArtist(artist: { name: string; mbid: string; match: string }): SimilarArtist {
  // Filter empty-string mbid: use name as fallback ID if mbid is empty/invalid
  const hasValidMbid = artist.mbid !== undefined && artist.mbid.length === 36;
  return {
    id: hasValidMbid ? artist.mbid : artist.name,
    name: artist.name,
    score: parseFloat(artist.match),
  };
}
