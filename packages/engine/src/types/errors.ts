export type ProviderId = 'musicbrainz' | 'listenbrainz' | 'lastfm' | 'deezer' | 'tastedive' | 'spotify';

export type NetworkError = {
  readonly kind: 'NetworkError';
  readonly provider: ProviderId;
  readonly message: string;
  readonly originalError?: unknown;
};

export type RateLimitError = {
  readonly kind: 'RateLimitError';
  readonly provider: ProviderId;
  readonly retryAfterMs?: number;
};

export type NotFoundError = {
  readonly kind: 'NotFoundError';
  readonly provider: ProviderId;
  readonly query: string;
};

export type ParseError = {
  readonly kind: 'ParseError';
  readonly provider: ProviderId;
  readonly message: string;
};

export type AuthError = {
  readonly kind: 'AuthError';
  readonly provider: ProviderId;
};

export type CircuitOpenError = {
  readonly kind: 'CircuitOpenError';
  readonly provider: ProviderId;
  readonly reopensAt: number;
};

export type ProviderError =
  | NetworkError
  | RateLimitError
  | NotFoundError
  | ParseError
  | AuthError
  | CircuitOpenError;
