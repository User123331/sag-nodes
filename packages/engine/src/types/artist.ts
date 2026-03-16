export interface ArtistSummary {
  readonly id: string;
  readonly name: string;
  readonly disambiguation?: string;
  readonly country?: string;
  readonly score: number;  // 0-1 normalized relevance
  readonly tags?: ReadonlyArray<{ name: string; count: number }>;
  readonly lifeSpan?: {
    readonly begin?: string;
    readonly end?: string;
    readonly ended?: boolean;
  };
}

export interface SimilarArtist {
  readonly id: string;
  readonly name: string;
  readonly score: number;  // 0-1 similarity score
}

export interface ArtistDetails {
  readonly id: string;
  readonly name: string;
  readonly disambiguation?: string;
  readonly country?: string;
  readonly tags?: ReadonlyArray<{ name: string; count: number }>;
  readonly lifeSpan?: {
    readonly begin?: string;
    readonly end?: string;
    readonly ended?: boolean;
  };
  readonly externalUrls?: ReadonlyArray<{ type: string; url: string }>;
}
