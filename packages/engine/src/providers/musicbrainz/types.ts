export interface MBArtistSearchResponse {
  readonly created: string;
  readonly count: number;
  readonly offset: number;
  readonly artists: ReadonlyArray<MBArtist>;
}

export interface MBArtist {
  readonly id: string;
  readonly name: string;
  readonly disambiguation?: string;
  readonly country?: string;
  readonly score: number;  // 0-100
  readonly 'life-span'?: {
    readonly begin?: string;
    readonly end?: string;
    readonly ended?: boolean;
  };
  readonly tags?: ReadonlyArray<{ readonly name: string; readonly count: number }>;
}

export interface MBArtistLookupResponse {
  readonly id: string;
  readonly name: string;
  readonly disambiguation?: string;
  readonly country?: string;
  readonly 'life-span'?: {
    readonly begin?: string;
    readonly end?: string;
    readonly ended?: boolean;
  };
  readonly tags?: ReadonlyArray<{ readonly name: string; readonly count: number }>;
  readonly relations?: ReadonlyArray<{
    readonly type: string;
    readonly url?: { readonly resource: string };
  }>;
}
