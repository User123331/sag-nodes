import type { ProviderAdapter, ProviderConfig } from '../../types/provider.js';
import type { SimilarArtist } from '../../types/artist.js';
import type { ProviderError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import type { CacheStore } from '../../cache/CacheStore.js';
import { ok } from '../../types/result.js';
import { RequestQueue } from '../../queue/RequestQueue.js';
import { LruCache } from '../../cache/LruCache.js';
import type { TasteDiveResponse } from './types.js';

const TASTEDIVE_BASE = 'https://tastedive.com/api/similar';
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes — high TTL due to low rate limit
const FIXED_SCORE = 0.5;

export interface TasteDiveProviderOptions {
  readonly apiKey: string;
  readonly cache?: CacheStore;
  readonly ttlMs?: number;
  readonly fetchFn?: typeof fetch;
  readonly queue?: RequestQueue;
  readonly proxyUrl?: string;
  readonly limit?: number;
}

export class TasteDiveProvider implements ProviderAdapter {
  readonly config: ProviderConfig = {
    id: 'tastedive',
    baseUrl: TASTEDIVE_BASE,
    rateLimit: { requestsPerSecond: 0.05 },
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
  private readonly proxyUrl?: string;
  private readonly limit: number;

  constructor(options: TasteDiveProviderOptions) {
    this.apiKey = options.apiKey;
    this.queue = options.queue ?? new RequestQueue({ providerId: 'tastedive', requestsPerSecond: 0.05 });
    this.cache = options.cache ?? new LruCache(500);
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.fetchFn = options.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
    if (options.proxyUrl !== undefined) this.proxyUrl = options.proxyUrl;
    this.limit = options.limit ?? 20;
  }

  /**
   * Get similar artists by name (TasteDive uses names, not IDs).
   * In browser environments, routes through proxyUrl if configured.
   * Skips silently if in browser with no proxyUrl.
   */
  async getSimilarArtists(artistName: string): Promise<Result<SimilarArtist[], ProviderError>> {
    const cacheKey = `tastedive:getSimilarArtists:${artistName.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return ok(JSON.parse(cached) as SimilarArtist[]);
    }

    // Browser environment detection: skip TasteDive if no proxy configured
    const isBrowser = 'window' in globalThis;
    if (isBrowser && !this.proxyUrl) {
      return ok([]); // Silently return empty — TasteDive cannot be used without proxy in browser
    }

    const params = new URLSearchParams({
      q: `music:${artistName}`,
      type: 'music',
      k: this.apiKey,
      limit: String(this.limit),
      info: '0',
    });

    const effectiveUrl = isBrowser && this.proxyUrl
      ? `${this.proxyUrl}?${params}`
      : `${TASTEDIVE_BASE}?${params}`;

    const result = await this.queue.execute(async () => {
      const res = await this.fetchFn(effectiveUrl, {
        headers: { 'Accept': 'application/json' },
      });

      if (res.status === 429) {
        throw { kind: 'RateLimitError', provider: 'tastedive' } satisfies ProviderError;
      }
      if (!res.ok) {
        throw { kind: 'NetworkError', provider: 'tastedive', message: `HTTP ${res.status}: ${res.statusText}` } satisfies ProviderError;
      }

      const data = (await res.json()) as TasteDiveResponse;
      return data.Similar.Results
        .filter(r => r.Type === 'music')
        .map(r => ({
          id: r.Name,     // TasteDive only has names, no platform IDs
          name: r.Name,
          score: FIXED_SCORE,
        }));
    });

    if (result.ok) {
      this.cache.set(cacheKey, JSON.stringify(result.value), this.ttlMs);
    }

    return result;
  }
}
