import type { ProviderId } from '../types/errors.js';

export interface ArtistCandidate {
  readonly mbid: string;
  readonly name: string;
  readonly disambiguation?: string;
  readonly score: number;  // 0-1 from MusicBrainz search
}

export interface ResolvedIdentity {
  readonly mbid: string;
  readonly name: string;
  readonly disambiguation?: string;
  readonly platformIds?: Readonly<Record<ProviderId, string>>;
}
