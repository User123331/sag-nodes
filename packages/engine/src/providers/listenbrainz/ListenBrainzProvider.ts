import type { ProviderAdapter, ProviderConfig } from '../../types/provider.js';
import type { SimilarArtist } from '../../types/artist.js';
import type { ProviderError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import type { CacheStore } from '../../cache/CacheStore.js';
import { ok } from '../../types/result.js';
import { RequestQueue } from '../../queue/RequestQueue.js';
import { LruCache } from '../../cache/LruCache.js';
import type { LBRadioResponse } from './types.js';

const LB_BASE = 'https://api.listenbrainz.org';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface ListenBrainzProviderOptions {
  readonly cache?: CacheStore;
  readonly ttlMs?: number;
  readonly fetchFn?: typeof fetch;
  readonly queue?: RequestQueue;
  readonly mode?: 'easy' | 'medium' | 'hard';
  readonly maxSimilarArtists?: number;
}

export class ListenBrainzProvider implements ProviderAdapter {
  readonly config: ProviderConfig = {
    id: 'listenbrainz',
    baseUrl: LB_BASE,
    rateLimit: { requestsPerSecond: 2 },
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
  private readonly mode: string;
  private readonly maxSimilarArtists: number;

  constructor(options: ListenBrainzProviderOptions = {}) {
    this.queue = options.queue ?? new RequestQueue({ providerId: 'listenbrainz', requestsPerSecond: 2 });
    this.cache = options.cache ?? new LruCache(500);
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.fetchFn = options.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
    this.mode = options.mode ?? 'easy';
    this.maxSimilarArtists = options.maxSimilarArtists ?? 20;
  }

  async getSimilarArtists(mbid: string): Promise<Result<SimilarArtist[], ProviderError>> {
    const cacheKey = `listenbrainz:getSimilarArtists:${mbid}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return ok(JSON.parse(cached) as SimilarArtist[]);
    }

    const params = new URLSearchParams({
      mode: this.mode,
      max_similar_artists: String(this.maxSimilarArtists),
      max_recordings_per_artist: '3',
      pop_begin: '0',
      pop_end: '100',
    });
    const url = `${LB_BASE}/1/lb-radio/artist/${encodeURIComponent(mbid)}?${params}`;

    const result = await this.queue.execute(async () => {
      const res = await this.fetchFn(url, {
        headers: { 'Accept': 'application/json' },
      });

      if (res.status === 404) {
        throw { kind: 'NotFoundError', provider: 'listenbrainz', query: mbid } satisfies ProviderError;
      }
      if (res.status === 429 || res.status === 503) {
        const retryAfter = res.headers.get('X-RateLimit-Reset-In');
        const rateLimitError: ProviderError = retryAfter
          ? { kind: 'RateLimitError', provider: 'listenbrainz', retryAfterMs: parseFloat(retryAfter) * 1000 }
          : { kind: 'RateLimitError', provider: 'listenbrainz' };
        throw rateLimitError;
      }
      if (!res.ok) {
        throw { kind: 'NetworkError', provider: 'listenbrainz', message: `HTTP ${res.status}: ${res.statusText}` } satisfies ProviderError;
      }

      const data = (await res.json()) as LBRadioResponse;
      return normalizeListenBrainzResponse(data);
    });

    if (result.ok) {
      this.cache.set(cacheKey, JSON.stringify(result.value), this.ttlMs);
    }

    return result;
  }
}

function normalizeListenBrainzResponse(data: LBRadioResponse): SimilarArtist[] {
  // Extract artists from response keys, aggregate listen counts
  const artistMap = new Map<string, { name: string; totalListens: number }>();

  for (const [mbid, recordings] of Object.entries(data)) {
    if (recordings.length === 0) continue;
    const first = recordings[0]!;
    const totalListens = recordings.reduce((sum, r) => sum + r.total_listen_count, 0);
    const existing = artistMap.get(mbid);
    if (existing) {
      existing.totalListens += totalListens;
    } else {
      artistMap.set(mbid, { name: first.similar_artist_name, totalListens });
    }
  }

  if (artistMap.size === 0) return [];

  // Log normalization: score = log(count+1) / log(maxCount+1)
  const maxCount = Math.max(...Array.from(artistMap.values()).map(a => a.totalListens));

  return Array.from(artistMap.entries()).map(([mbid, { name, totalListens }]) => ({
    id: mbid,
    name,
    score: Math.log(totalListens + 1) / Math.log(maxCount + 1),
  }));
}
