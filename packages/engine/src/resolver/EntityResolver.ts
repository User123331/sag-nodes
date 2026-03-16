import type { CacheStore } from '../cache/CacheStore.js';
import { LruCache } from '../cache/LruCache.js';
import { MusicBrainzProvider } from '../providers/musicbrainz/MusicBrainzProvider.js';
import type { RequestQueue } from '../queue/RequestQueue.js';
import type { ArtistCandidate, ResolvedIdentity } from './types.js';

const MAPPING_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FUZZY_THRESHOLD = 0.75; // MusicBrainz score threshold (0-1)

export interface EntityResolverOptions {
  readonly mbProvider?: MusicBrainzProvider;
  readonly cache?: CacheStore;
  readonly fetchFn?: typeof fetch;
  readonly queue?: RequestQueue;
  readonly fuzzyThreshold?: number;
}

export class EntityResolver {
  private readonly mbProvider: MusicBrainzProvider;
  private readonly cache: CacheStore;
  private readonly fetchFn: typeof fetch;
  private readonly fuzzyThreshold: number;

  constructor(options: EntityResolverOptions = {}) {
    this.mbProvider = options.mbProvider ?? new MusicBrainzProvider({
      cache: options.cache,
      fetchFn: options.fetchFn,
      queue: options.queue,
    });
    this.cache = options.cache ?? new LruCache(1000);
    this.fetchFn = options.fetchFn ?? fetch;
    this.fuzzyThreshold = options.fuzzyThreshold ?? FUZZY_THRESHOLD;
  }

  /**
   * Resolve an artist name to one or more canonical MBID-anchored identities.
   * Returns all MusicBrainz candidates with score >= fuzzyThreshold (default 0.75).
   * Ambiguous artists (e.g. "John Williams") are kept as separate candidates.
   * Results are cached with 24h TTL.
   */
  async resolveNameToMbids(name: string): Promise<ArtistCandidate[]> {
    const cacheKey = `resolver:name:${name.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached) as ArtistCandidate[];

    const result = await this.mbProvider.searchArtist(name);
    if (!result.ok) return [];

    const candidates: ArtistCandidate[] = result.value
      .filter(a => a.score >= this.fuzzyThreshold)
      .map(a => ({
        mbid: a.id,
        name: a.name,
        score: a.score,
        ...(a.disambiguation !== undefined ? { disambiguation: a.disambiguation } : {}),
      }));

    this.cache.set(cacheKey, JSON.stringify(candidates), MAPPING_TTL_MS);
    return candidates;
  }

  /**
   * Resolve a platform URL (Spotify or Deezer artist URL) to an MBID
   * via MusicBrainz /ws/2/url?resource=<url> endpoint.
   * Returns null if no mapping found.
   */
  async resolveUrlToMbid(platformUrl: string): Promise<string | null> {
    const cacheKey = `resolver:url:${platformUrl}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const mbBase = 'https://musicbrainz.org/ws/2';
    const url = `${mbBase}/url?resource=${encodeURIComponent(platformUrl)}&inc=artist-rels&fmt=json`;

    try {
      const res = await this.fetchFn(url, {
        headers: {
          'User-Agent': 'SimilarArtistsGraph/0.1.0 (https://github.com/similar-artists-graph)',
          'Accept': 'application/json',
        },
      });

      if (!res.ok) return null;

      const data = (await res.json()) as {
        relations?: Array<{
          type: string;
          artist?: { id: string; name: string };
        }>;
      };

      const artistRel = data.relations?.find(r => r.artist);
      const mbid = artistRel?.artist?.id ?? null;

      if (mbid) {
        this.cache.set(cacheKey, mbid, MAPPING_TTL_MS);
      }
      return mbid;
    } catch {
      return null;
    }
  }

  /**
   * Resolve a Spotify artist ID to MBID.
   * Constructs the Spotify artist URL and calls resolveUrlToMbid.
   */
  async resolveSpotifyIdToMbid(spotifyId: string): Promise<string | null> {
    return this.resolveUrlToMbid(`https://open.spotify.com/artist/${spotifyId}`);
  }

  /**
   * Resolve a Deezer artist ID to MBID.
   * Constructs the Deezer artist URL and calls resolveUrlToMbid.
   */
  async resolveDeezerIdToMbid(deezerId: string | number): Promise<string | null> {
    return this.resolveUrlToMbid(`https://www.deezer.com/artist/${deezerId}`);
  }

  /**
   * Get platform IDs (Spotify, Deezer) for a known MBID
   * via MusicBrainz artist lookup with url-rels.
   */
  async getPlatformIds(mbid: string): Promise<{ spotifyId?: string; deezerId?: string }> {
    const cacheKey = `resolver:platformIds:${mbid}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached) as { spotifyId?: string; deezerId?: string };

    const result = await this.mbProvider.getArtistDetails(mbid);
    if (!result.ok) return {};

    const platformIds: { spotifyId?: string; deezerId?: string } = {};
    const urls = result.value.externalUrls ?? [];

    for (const { url } of urls) {
      if (url.includes('open.spotify.com/artist/')) {
        const parts = url.split('/');
        platformIds.spotifyId = parts[parts.length - 1];
      }
      if (url.includes('deezer.com/artist/')) {
        const parts = url.split('/');
        platformIds.deezerId = parts[parts.length - 1];
      }
    }

    this.cache.set(cacheKey, JSON.stringify(platformIds), MAPPING_TTL_MS);
    return platformIds;
  }
}

// Export ResolvedIdentity to ensure it's used and not a dead import
export type { ResolvedIdentity };
