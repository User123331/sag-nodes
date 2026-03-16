export interface LastFmSimilarArtist {
  readonly name: string;
  readonly mbid: string;       // may be empty string "" for niche artists
  readonly match: string;      // string representation of 0-1 score, e.g. "0.989"
  readonly url: string;
  readonly image: ReadonlyArray<{ '#text': string; size: string }>;
}

export interface LastFmGetSimilarResponse {
  readonly similarartists: {
    readonly artist: ReadonlyArray<LastFmSimilarArtist>;
    readonly '@attr': { readonly artist: string };
  };
}
