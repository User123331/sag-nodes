import type { Result } from '../types/result.js';
import type { ProviderError, ProviderId } from '../types/errors.js';
import type { SimilarArtist } from '../types/artist.js';
import { ok, err } from '../types/result.js';
import { LruCache } from '../cache/LruCache.js';
import { MusicBrainzProvider } from '../providers/musicbrainz/MusicBrainzProvider.js';
import { ListenBrainzProvider } from '../providers/listenbrainz/ListenBrainzProvider.js';
import { LastFmProvider } from '../providers/lastfm/LastFmProvider.js';
import { DeezerProvider } from '../providers/deezer/DeezerProvider.js';
import { TasteDiveProvider } from '../providers/tastedive/TasteDiveProvider.js';
import { SpotifyProvider } from '../providers/spotify/SpotifyProvider.js';
import { EntityResolver } from '../resolver/EntityResolver.js';
import { GraphBuilder } from '../graph/GraphBuilder.js';
import type { EngineConfig, Engine as EngineInterface, ExploreResult } from './types.js';

interface ProviderEntry {
  id: ProviderId;
  getSimilar: (seedId: string) => Promise<Result<SimilarArtist[], ProviderError>>;
  getIdForSeed: (mbid: string, name: string) => Promise<string | null>;
}

export class EngineImpl implements EngineInterface {
  private readonly resolver: EntityResolver;
  private readonly graphBuilder: GraphBuilder;
  private readonly providers: ProviderEntry[];
  private readonly maxDepth: number;

  constructor(config: EngineConfig = {}) {
    const cache = config.cache ?? new LruCache(1000);
    const fetchFn = config.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

    const mbProvider = new MusicBrainzProvider({
      cache,
      fetchFn,
      ...(config.mbQueue !== undefined ? { queue: config.mbQueue } : {}),
    });
    this.resolver = new EntityResolver({ mbProvider, cache, fetchFn });
    this.graphBuilder = new GraphBuilder({
      ...(config.maxNodes !== undefined ? { maxNodes: config.maxNodes } : {}),
    });
    this.maxDepth = config.maxDepth ?? 2;

    // Build provider list — only include providers that have their required credentials
    this.providers = [];

    // ListenBrainz — no auth required, always enabled
    const lbProvider = new ListenBrainzProvider({ cache, fetchFn });
    this.providers.push({
      id: 'listenbrainz',
      getSimilar: (mbid) => lbProvider.getSimilarArtists(mbid),
      getIdForSeed: async (mbid) => mbid, // LB uses MBID directly
    });

    // Last.fm — requires API key
    if (config.providers?.lastfm?.apiKey) {
      const lastfmProvider = new LastFmProvider({
        apiKey: config.providers.lastfm.apiKey,
        cache,
        fetchFn,
      });
      this.providers.push({
        id: 'lastfm',
        getSimilar: (mbid) => lastfmProvider.getSimilarArtists(mbid),
        getIdForSeed: async (mbid) => mbid, // Last.fm accepts MBID
      });
    }

    // Deezer — no auth required, but needs Deezer ID lookup
    const deezerProvider = new DeezerProvider({
      cache,
      fetchFn,
      ...(config.deezerBaseUrl !== undefined ? { baseUrl: config.deezerBaseUrl } : {}),
    });
    this.providers.push({
      id: 'deezer',
      getSimilar: (deezerId) => deezerProvider.getSimilarArtists(deezerId),
      getIdForSeed: async (mbid, name) => {
        // Try to get Deezer ID from MusicBrainz url-rels first
        const platformIds = await this.resolver.getPlatformIds(mbid);
        if (platformIds.deezerId) return platformIds.deezerId;
        // Fallback: search Deezer by name
        const searchResult = await deezerProvider.searchDeezerArtist(name);
        if (searchResult.ok && searchResult.value.length > 0) {
          return String(searchResult.value[0]!.id);
        }
        return null;
      },
    });

    // TasteDive — requires API key
    if (config.providers?.tastedive?.apiKey) {
      const tdProvider = new TasteDiveProvider({
        apiKey: config.providers.tastedive.apiKey,
        ...(config.providers.tastedive.proxyUrl !== undefined ? { proxyUrl: config.providers.tastedive.proxyUrl } : {}),
        cache,
        fetchFn,
      });
      this.providers.push({
        id: 'tastedive',
        getSimilar: (name) => tdProvider.getSimilarArtists(name),
        getIdForSeed: async (_mbid, name) => name, // TasteDive uses artist names
      });
    }

    // Spotify — optional, requires clientId AND clientSecret
    if (config.providers?.spotify?.clientId && config.providers?.spotify?.clientSecret) {
      const spotifyProvider = new SpotifyProvider({
        clientId: config.providers.spotify.clientId,
        clientSecret: config.providers.spotify.clientSecret,
        cache,
        fetchFn,
      });
      this.providers.push({
        id: 'spotify',
        getSimilar: (spotifyId) => spotifyProvider.getSimilarArtists(spotifyId),
        getIdForSeed: async (mbid, name) => {
          // Try to get Spotify ID from MusicBrainz url-rels first
          const platformIds = await this.resolver.getPlatformIds(mbid);
          if (platformIds.spotifyId) return platformIds.spotifyId;
          // Fallback: search Spotify by name
          const searchResult = await spotifyProvider.searchSpotifyArtist(name);
          if (searchResult.ok && searchResult.value.length > 0) {
            return searchResult.value[0]!.id;
          }
          return null;
        },
      });
    }
  }

  async explore(artistName: string): Promise<Result<ExploreResult, ProviderError>> {
    // Step 1: Resolve name to MBID
    const candidates = await this.resolver.resolveNameToMbids(artistName);
    if (candidates.length === 0) {
      return err({
        kind: 'NotFoundError',
        provider: 'musicbrainz',
        query: artistName,
      });
    }

    // Use the top candidate (highest score)
    const seed = candidates[0]!;
    this.graphBuilder.setSeed(seed.mbid, seed.name, seed.disambiguation);

    // Step 2: Fan out to all providers in parallel
    const warnings = await this.fetchAndMergeSimilar(seed.mbid, seed.name);

    // Step 3: Return graph data
    const graphData = this.graphBuilder.getGraphData();
    return ok({
      ...graphData,
      warnings,
    });
  }

  async expand(mbid: string): Promise<Result<ExploreResult, ProviderError>> {
    // Verify the node exists in the graph
    if (!this.graphBuilder.hasNode(mbid)) {
      return err({
        kind: 'NotFoundError',
        provider: 'musicbrainz',
        query: mbid,
      });
    }

    // Get the artist name from the existing graph
    const nodeAttrs = this.graphBuilder.artistGraph.graph.getNodeAttributes(mbid);
    const name = nodeAttrs.name;

    // Fan out to all providers
    const warnings = await this.fetchAndMergeSimilar(mbid, name);

    const graphData = this.graphBuilder.getGraphData();
    return ok({
      ...graphData,
      warnings,
    });
  }

  private async fetchAndMergeSimilar(
    seedMbid: string,
    seedName: string,
  ): Promise<Array<{ provider: string; error: string }>> {
    if (this.graphBuilder.isBudgetReached()) {
      return [];
    }

    const warnings: Array<{ provider: string; error: string }> = [];

    // Fan out: resolve platform IDs and fetch similar artists in parallel
    const providerResults = await Promise.allSettled(
      this.providers.map(async (provider) => {
        // Get provider-specific ID for the seed artist
        const seedId = await provider.getIdForSeed(seedMbid, seedName);
        if (!seedId) {
          return { providerId: provider.id, artists: [] as SimilarArtist[], skipped: true };
        }

        const result = await provider.getSimilar(seedId);
        if (!result.ok) {
          warnings.push({ provider: provider.id, error: result.error.kind });
          return { providerId: provider.id, artists: [] as SimilarArtist[], skipped: true };
        }

        return { providerId: provider.id, artists: result.value, skipped: false };
      }),
    );

    // Merge results into graph
    for (const result of providerResults) {
      if (result.status === 'rejected') {
        continue;
      }
      const { providerId, artists, skipped } = result.value;
      if (skipped || artists.length === 0) continue;

      // For providers that return platform-specific IDs (not MBIDs),
      // resolve each artist to MBID
      const needsMbidResolution = providerId === 'deezer' || providerId === 'tastedive' || providerId === 'spotify';

      let resolvedMbids: Map<string, string> | undefined;
      if (needsMbidResolution) {
        resolvedMbids = new Map<string, string>();
        for (const artist of artists) {
          try {
            let mbid: string | null = null;
            if (providerId === 'deezer') {
              mbid = await this.resolver.resolveDeezerIdToMbid(artist.id);
            } else if (providerId === 'spotify') {
              mbid = await this.resolver.resolveSpotifyIdToMbid(artist.id);
            } else {
              // TasteDive: resolve by name
              const candidates = await this.resolver.resolveNameToMbids(artist.name);
              if (candidates.length > 0) {
                mbid = candidates[0]!.mbid;
              }
            }
            if (mbid) {
              resolvedMbids.set(artist.id, mbid);
            }
          } catch {
            // Skip unresolvable artists — they won't appear in graph
          }
        }
      }

      this.graphBuilder.addSimilarArtists(
        seedMbid,
        artists,
        providerId,
        resolvedMbids,
      );
    }

    return warnings;
  }
}

export function createEngine(config?: EngineConfig): EngineInterface {
  return new EngineImpl(config);
}
