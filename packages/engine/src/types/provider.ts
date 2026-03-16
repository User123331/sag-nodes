import type { Result } from './result.js';
import type { ProviderError, ProviderId } from './errors.js';
import type { ArtistSummary, SimilarArtist, ArtistDetails } from './artist.js';

export interface ProviderCapabilities {
  readonly searchArtist: boolean;
  readonly getSimilarArtists: boolean;
  readonly getArtistDetails: boolean;
}

export interface ProviderConfig {
  readonly id: ProviderId;
  readonly baseUrl: string;
  readonly rateLimit: { readonly requestsPerSecond: number };
  readonly requiresAuth: boolean;
  readonly capabilities: ProviderCapabilities;
}

export interface ProviderAdapter {
  readonly config: ProviderConfig;
  searchArtist?(query: string): Promise<Result<ArtistSummary[], ProviderError>>;
  getSimilarArtists?(artistId: string): Promise<Result<SimilarArtist[], ProviderError>>;
  getArtistDetails?(artistId: string): Promise<Result<ArtistDetails, ProviderError>>;
}
