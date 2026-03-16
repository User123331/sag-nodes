import type { ProviderAdapter, ProviderConfig } from '../../types/provider.js';
import type { SimilarArtist } from '../../types/artist.js';
import type { ProviderError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import type { CacheStore } from '../../cache/CacheStore.js';
import { ok } from '../../types/result.js';
import { RequestQueue } from '../../queue/RequestQueue.js';
import { LruCache } from '../../cache/LruCache.js';
import type { DeezerRelatedResponse, DeezerSearchResponse } from './types.js';

const DEEZER_BASE = 'https://api.deezer.com';
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const FIXED_SCORE = 0.5;

export interface DeezerProviderOptions {
  readonly cache?: CacheStore;
  readonly ttlMs?: number;
  readonly fetchFn?: typeof fetch;
  readonly queue?: RequestQueue;
}

export class DeezerProvider implements ProviderAdapter {
  readonly config: ProviderConfig = {
    id: 'deezer',
    baseUrl: DEEZER_BASE,
    rateLimit: { requestsPerSecond: 5 },
    requiresAuth: false,
    capabilities: {
      searchArtist: false,
      getSimilarArtists: true,
      getArtistDetails: false,
    },
  };

  private readonly queue: RequestQueue;
  private readonly cache: CacheStore;
  private readonly ttlMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: DeezerProviderOptions = {}) {
    this.queue = options.queue ?? new RequestQueue({ providerId: 'deezer', requestsPerSecond: 5 });
    this.cache = options.cache ?? new LruCache(500);
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  /**
   * Get similar artists by Deezer artist ID (numeric).
   * The ID is the Deezer-specific artist ID, not an MBID.
   * MBID resolution is handled by the EntityResolver, not by this provider.
   */
  async getSimilarArtists(deezerId: string): Promise<Result<SimilarArtist[], ProviderError>> {
    const cacheKey = `deezer:getSimilarArtists:${deezerId}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return ok(JSON.parse(cached) as SimilarArtist[]);
    }

    const url = `${DEEZER_BASE}/artist/${encodeURIComponent(deezerId)}/related`;

    const result = await this.queue.execute(async () => {
      const res = await this.fetchFn(url, {
        headers: { 'Accept': 'application/json' },
      });

      if (res.status === 404) {
        throw { kind: 'NotFoundError', provider: 'deezer', query: deezerId } satisfies ProviderError;
      }
      if (res.status === 429 || res.status === 503) {
        throw { kind: 'RateLimitError', provider: 'deezer' } satisfies ProviderError;
      }
      if (!res.ok) {
        throw { kind: 'NetworkError', provider: 'deezer', message: `HTTP ${res.status}: ${res.statusText}` } satisfies ProviderError;
      }

      const data = (await res.json()) as DeezerRelatedResponse;
      return data.data.map(a => ({
        id: String(a.id),
        name: a.name,
        score: FIXED_SCORE,
        ...(a.nb_fan !== undefined ? { metadata: { nb_fan: a.nb_fan } } : {}),
      }));
    });

    if (result.ok) {
      this.cache.set(cacheKey, JSON.stringify(result.value), this.ttlMs);
    }

    return result;
  }

  /**
   * Search for an artist by name to find their Deezer ID.
   * Used internally by the engine to find the Deezer ID from an artist name.
   */
  async searchDeezerArtist(name: string): Promise<Result<Array<{ id: number; name: string; nb_fan?: number }>, ProviderError>> {
    const cacheKey = `deezer:searchArtist:${name.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return ok(JSON.parse(cached) as Array<{ id: number; name: string; nb_fan?: number }>);
    }

    const url = `${DEEZER_BASE}/search/artist?q=${encodeURIComponent(name)}&limit=3`;

    const result = await this.queue.execute(async () => {
      const res = await this.fetchFn(url, {
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        throw { kind: 'NetworkError', provider: 'deezer', message: `HTTP ${res.status}: ${res.statusText}` } satisfies ProviderError;
      }

      const data = (await res.json()) as DeezerSearchResponse;
      return data.data.map(a => ({
        id: a.id,
        name: a.name,
        ...(a.nb_fan !== undefined ? { nb_fan: a.nb_fan } : {}),
      }));
    });

    if (result.ok) {
      this.cache.set(cacheKey, JSON.stringify(result.value), this.ttlMs);
    }

    return result;
  }
}
