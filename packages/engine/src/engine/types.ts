import type { Result } from '../types/result.js';
import type { ProviderError } from '../types/errors.js';
import type { ArtistGraphData } from '../graph/types.js';
import type { CacheStore } from '../cache/CacheStore.js';
import type { RequestQueue } from '../queue/RequestQueue.js';

export interface ProviderCredentials {
  readonly lastfm?: { readonly apiKey: string };
  readonly tastedive?: { readonly apiKey: string; readonly proxyUrl?: string };
  readonly spotify?: { readonly clientId: string; readonly clientSecret: string };
}

export interface EngineConfig {
  readonly providers?: ProviderCredentials;
  readonly maxNodes?: number;        // default 150, hard cap 200
  readonly maxDepth?: number;        // default 2
  readonly cache?: CacheStore;
  readonly fetchFn?: typeof fetch;
  readonly deezerBaseUrl?: string;   // override for browser proxy (e.g. '/deezer-proxy')
  readonly mbQueue?: RequestQueue;   // override MusicBrainz queue (e.g. for tests)
}

export interface ExploreResult extends ArtistGraphData {
  readonly warnings: ReadonlyArray<{
    readonly provider: string;
    readonly error: string;
  }>;
}

export interface Engine {
  explore(artistName: string): Promise<Result<ExploreResult, ProviderError>>;
  expand(mbid: string): Promise<Result<ExploreResult, ProviderError>>;
}
