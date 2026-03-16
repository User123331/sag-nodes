import type { ProviderAdapter, ProviderConfig } from '../../types/provider.js';
import type { ArtistSummary, ArtistDetails } from '../../types/artist.js';
import type { ProviderError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import type { CacheStore } from '../../cache/CacheStore.js';
import { ok, err } from '../../types/result.js';
import { RequestQueue } from '../../queue/RequestQueue.js';
import { LruCache } from '../../cache/LruCache.js';
import type { MBArtistSearchResponse, MBArtistLookupResponse, MBArtist } from './types.js';

const MB_BASE = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'SimilarArtistsGraph/0.1.0 (https://github.com/similar-artists-graph)';
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour for MusicBrainz (rarely changes)
const SEARCH_LIMIT = 10;

export interface MusicBrainzProviderOptions {
  readonly cache?: CacheStore;
  readonly userAgent?: string;
  readonly ttlMs?: number;
  readonly fetchFn?: typeof fetch;
  readonly queue?: RequestQueue;
}

export class MusicBrainzProvider implements ProviderAdapter {
  readonly config: ProviderConfig = {
    id: 'musicbrainz',
    baseUrl: MB_BASE,
    rateLimit: { requestsPerSecond: 1 },
    requiresAuth: false,
    capabilities: {
      searchArtist: true,
      getSimilarArtists: false,
      getArtistDetails: true,
    },
  };

  private readonly queue: RequestQueue;
  private readonly cache: CacheStore;
  private readonly userAgent: string;
  private readonly ttlMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: MusicBrainzProviderOptions = {}) {
    this.queue = options.queue ?? new RequestQueue({
      providerId: 'musicbrainz',
      requestsPerSecond: 1,
    });
    this.cache = options.cache ?? new LruCache(500);
    this.userAgent = options.userAgent ?? USER_AGENT;
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.fetchFn = options.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  }

  async searchArtist(query: string): Promise<Result<ArtistSummary[], ProviderError>> {
    const cacheKey = `musicbrainz:searchArtist:${JSON.stringify(query)}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return ok(JSON.parse(cached) as ArtistSummary[]);
    }

    const url = `${MB_BASE}/artist?query=${encodeURIComponent(query)}&fmt=json&limit=${SEARCH_LIMIT}`;
    const result = await this.queue.execute(async () => {
      const res = await this.fetchFn(url, {
        headers: { 'User-Agent': this.userAgent, 'Accept': 'application/json' },
      });

      if (res.status === 404) {
        throw { kind: 'NotFoundError', provider: 'musicbrainz', query } satisfies ProviderError;
      }
      if (res.status === 429 || res.status === 503) {
        const retryAfter = res.headers.get('Retry-After');
        const rateLimitError: ProviderError = retryAfter
          ? { kind: 'RateLimitError', provider: 'musicbrainz', retryAfterMs: parseInt(retryAfter, 10) * 1000 }
          : { kind: 'RateLimitError', provider: 'musicbrainz' };
        throw rateLimitError;
      }
      if (!res.ok) {
        const networkError: ProviderError = {
          kind: 'NetworkError',
          provider: 'musicbrainz',
          message: `HTTP ${res.status}: ${res.statusText}`,
        };
        throw networkError;
      }

      const data = (await res.json()) as MBArtistSearchResponse;
      return data.artists.map(toArtistSummary);
    });

    if (result.ok) {
      this.cache.set(cacheKey, JSON.stringify(result.value), this.ttlMs);
    }

    return result;
  }

  async getArtistDetails(artistId: string): Promise<Result<ArtistDetails, ProviderError>> {
    const cacheKey = `musicbrainz:getArtistDetails:${JSON.stringify(artistId)}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return ok(JSON.parse(cached) as ArtistDetails);
    }

    const url = `${MB_BASE}/artist/${encodeURIComponent(artistId)}?fmt=json&inc=tags+url-rels`;
    const result = await this.queue.execute(async () => {
      const res = await this.fetchFn(url, {
        headers: { 'User-Agent': this.userAgent, 'Accept': 'application/json' },
      });

      if (res.status === 404) {
        throw { kind: 'NotFoundError', provider: 'musicbrainz', query: artistId } satisfies ProviderError;
      }
      if (res.status === 429 || res.status === 503) {
        const retryAfter = res.headers.get('Retry-After');
        const rateLimitError: ProviderError = retryAfter
          ? { kind: 'RateLimitError', provider: 'musicbrainz', retryAfterMs: parseInt(retryAfter, 10) * 1000 }
          : { kind: 'RateLimitError', provider: 'musicbrainz' };
        throw rateLimitError;
      }
      if (!res.ok) {
        const networkError: ProviderError = {
          kind: 'NetworkError',
          provider: 'musicbrainz',
          message: `HTTP ${res.status}: ${res.statusText}`,
        };
        throw networkError;
      }

      const data = (await res.json()) as MBArtistLookupResponse;
      return toArtistDetails(data);
    });

    if (result.ok) {
      this.cache.set(cacheKey, JSON.stringify(result.value), this.ttlMs);
    }

    return result;
  }
}

function toLifeSpan(ls: { begin?: string; end?: string; ended?: boolean } | undefined) {
  if (!ls) return undefined;
  const result: { begin?: string; end?: string; ended?: boolean } = {};
  if (ls.begin !== undefined) result.begin = ls.begin;
  if (ls.end !== undefined) result.end = ls.end;
  if (ls.ended !== undefined) result.ended = ls.ended;
  return result;
}

function toArtistSummary(artist: MBArtist): ArtistSummary {
  const lifeSpan = toLifeSpan(artist['life-span']);
  const base: ArtistSummary = {
    id: artist.id,
    name: artist.name,
    score: artist.score / 100,  // Normalize 0-100 to 0-1
  };
  return {
    ...base,
    ...(artist.disambiguation !== undefined ? { disambiguation: artist.disambiguation } : {}),
    ...(artist.country !== undefined ? { country: artist.country } : {}),
    ...(artist.tags !== undefined ? { tags: artist.tags.map(t => ({ name: t.name, count: t.count })) } : {}),
    ...(lifeSpan !== undefined ? { lifeSpan } : {}),
  };
}

function toArtistDetails(data: MBArtistLookupResponse): ArtistDetails {
  const lifeSpan = toLifeSpan(data['life-span']);
  const base: ArtistDetails = {
    id: data.id,
    name: data.name,
  };
  const externalUrls = data.relations
    ?.filter(r => r.url?.resource)
    .map(r => ({ type: r.type, url: r.url!.resource }));
  return {
    ...base,
    ...(data.disambiguation !== undefined ? { disambiguation: data.disambiguation } : {}),
    ...(data.country !== undefined ? { country: data.country } : {}),
    ...(data.tags !== undefined ? { tags: data.tags.map(t => ({ name: t.name, count: t.count })) } : {}),
    ...(lifeSpan !== undefined ? { lifeSpan } : {}),
    ...(externalUrls !== undefined ? { externalUrls } : {}),
  };
}
