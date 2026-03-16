export interface DeezerArtist {
  readonly id: number;
  readonly name: string;
  readonly link: string;
  readonly picture_medium?: string;
  readonly nb_album?: number;
  readonly nb_fan?: number;
  readonly radio?: boolean;
  readonly type: string;
}

export interface DeezerSearchResponse {
  readonly data: ReadonlyArray<DeezerArtist>;
  readonly total: number;
}

export interface DeezerRelatedResponse {
  readonly data: ReadonlyArray<DeezerArtist>;
  readonly total: number;
}
