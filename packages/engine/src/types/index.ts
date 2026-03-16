export { ok, err } from './result.js';
export type { Result } from './result.js';
export type {
  ProviderId,
  NetworkError,
  RateLimitError,
  NotFoundError,
  ParseError,
  AuthError,
  CircuitOpenError,
  ProviderError,
} from './errors.js';
export type {
  ArtistSummary,
  SimilarArtist,
  ArtistDetails,
} from './artist.js';
export type {
  ProviderCapabilities,
  ProviderConfig,
  ProviderAdapter,
} from './provider.js';
