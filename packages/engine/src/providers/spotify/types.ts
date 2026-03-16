export interface SpotifyArtist {
  readonly id: string;
  readonly name: string;
  readonly images: ReadonlyArray<{ readonly url: string; readonly height: number; readonly width: number }>;
  readonly external_urls: { readonly spotify: string };
  readonly genres: ReadonlyArray<string>;
  readonly popularity: number;
  readonly type: string;
}

export interface SpotifyRelatedArtistsResponse {
  readonly artists: ReadonlyArray<SpotifyArtist>;
}

export interface SpotifySearchResponse {
  readonly artists: {
    readonly items: ReadonlyArray<SpotifyArtist>;
  };
}

export interface SpotifyTokenResponse {
  readonly access_token: string;
  readonly token_type: string;
  readonly expires_in: number;
}
