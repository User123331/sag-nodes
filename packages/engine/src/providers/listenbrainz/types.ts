export interface LBRadioRecording {
  readonly recording_mbid: string;
  readonly similar_artist_mbid: string;
  readonly similar_artist_name: string;
  readonly total_listen_count: number;
}

// Response is a dict keyed by similar artist MBID → array of recordings
export type LBRadioResponse = Record<string, ReadonlyArray<LBRadioRecording>>;
