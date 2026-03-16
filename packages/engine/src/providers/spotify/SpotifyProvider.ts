import type { ProviderAdapter, ProviderConfig } from '../../types/provider.js';
import type { SimilarArtist } from '../../types/artist.js';
import type { ProviderError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import type { CacheStore } from '../../cache/CacheStore.js';
import { ok, err } from '../../types/result.js';
import { RequestQueue } from '../../queue/RequestQueue.js';
import { LruCache } from '../../cache/LruCache.js';
import type { SpotifyRelatedArtistsResponse, SpotifySearchResponse, SpotifyTokenResponse } from './types.js';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const FIXED_SCORE = 0.5;
const TOKEN_REFRESH_BUFFER_MS = 60_000; // refresh 60s before expiry

export interface SpotifyProviderOptions {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly cache?: CacheStore;
  readonly ttlMs?: number;
  readonly fetchFn?: typeof fetch;
  readonly queue?: RequestQueue;
  readonly getNow?: () => number;
}

export class SpotifyProvider implements ProviderAdapter {
  readonly config: ProviderConfig = {
    id: 'spotify',
    baseUrl: SPOTIFY_API_BASE,
    rateLimit: { requestsPerSecond: 5 },
    requiresAuth: true,
    capabilities: {
      searchArtist: false,
      getSimilarArtists: true,
      getArtistDetails: false,
    },
  };

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly queue: RequestQueue;
  private readonly cache: CacheStore;
  private readonly ttlMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly getNow: () => number;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(options: SpotifyProviderOptions) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.queue = options.queue ?? new RequestQueue({ providerId: 'spotify', requestsPerSecond: 5 });
    this.cache = options.cache ?? new LruCache(500);
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.fetchFn = options.fetchFn ?? fetch;
    this.getNow = options.getNow ?? Date.now;
  }

  async getSimilarArtists(spotifyId: string): Promise<Result<SimilarArtist[], ProviderError>> {
    const cacheKey = `spotify:getSimilarArtists:${spotifyId}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return ok(JSON.parse(cached) as SimilarArtist[]);
    }

    const tokenResult = await this.ensureAccessToken();
    if (!tokenResult.ok) return tokenResult;

    const url = `${SPOTIFY_API_BASE}/artists/${encodeURIComponent(spotifyId)}/related-artists`;

    const result = await this.queue.execute(async () => {
      const res = await this.fetchFn(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (res.status === 401) {
        // Token expired mid-request — clear and throw AuthError
        this.accessToken = null;
        this.tokenExpiresAt = 0;
        throw { kind: 'AuthError', provider: 'spotify' } satisfies ProviderError;
      }
      if (res.status === 404) {
        throw { kind: 'NotFoundError', provider: 'spotify', query: spotifyId } satisfies ProviderError;
      }
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const rateLimitError: ProviderError = retryAfter
          ? { kind: 'RateLimitError', provider: 'spotify', retryAfterMs: parseInt(retryAfter, 10) * 1000 }
          : { kind: 'RateLimitError', provider: 'spotify' };
        throw rateLimitError;
      }
      if (!res.ok) {
        throw { kind: 'NetworkError', provider: 'spotify', message: `HTTP ${res.status}: ${res.statusText}` } satisfies ProviderError;
      }

      const data = (await res.json()) as SpotifyRelatedArtistsResponse;
      return data.artists.map(a => ({
        id: a.id,
        name: a.name,
        score: FIXED_SCORE,
      }));
    });

    if (result.ok) {
      this.cache.set(cacheKey, JSON.stringify(result.value), this.ttlMs);
    }

    return result;
  }

  /**
   * Search for an artist by name to find their Spotify ID.
   */
  async searchSpotifyArtist(name: string): Promise<Result<Array<{ id: string; name: string }>, ProviderError>> {
    const tokenResult = await this.ensureAccessToken();
    if (!tokenResult.ok) return tokenResult;

    const url = `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(name)}&type=artist&limit=3`;

    return this.queue.execute(async () => {
      const res = await this.fetchFn(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (res.status === 401) {
        this.accessToken = null;
        this.tokenExpiresAt = 0;
        throw { kind: 'AuthError', provider: 'spotify' } satisfies ProviderError;
      }
      if (!res.ok) {
        throw { kind: 'NetworkError', provider: 'spotify', message: `HTTP ${res.status}: ${res.statusText}` } satisfies ProviderError;
      }

      const data = (await res.json()) as SpotifySearchResponse;
      return data.artists.items.map(a => ({ id: a.id, name: a.name }));
    });
  }

  private async ensureAccessToken(): Promise<Result<void, ProviderError>> {
    if (this.accessToken && this.getNow() < this.tokenExpiresAt - TOKEN_REFRESH_BUFFER_MS) {
      return ok(undefined);
    }

    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);

    try {
      const res = await this.fetchFn(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!res.ok) {
        return err({ kind: 'AuthError', provider: 'spotify' } satisfies ProviderError);
      }

      const data = (await res.json()) as SpotifyTokenResponse;
      this.accessToken = data.access_token;
      this.tokenExpiresAt = this.getNow() + data.expires_in * 1000;
      return ok(undefined);
    } catch {
      return err({ kind: 'AuthError', provider: 'spotify' } satisfies ProviderError);
    }
  }
}
