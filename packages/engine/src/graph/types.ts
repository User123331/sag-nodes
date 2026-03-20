import type { ProviderId } from '../types/errors.js';

export interface ProviderAttribution {
  readonly provider: ProviderId;
  readonly rawScore: number;
}

export interface NodeAttrs {
  name: string;
  mbid: string;
  disambiguation?: string;
  sources: ProviderId[];
  tags?: ReadonlyArray<{ name: string; count: number }>;
  metadata?: {
    nb_fan?: number;
    imageUrl?: string;
    spotifyId?: string;
    deezerId?: string;
  };
  externalUrls?: ReadonlyArray<{ type: string; url: string }>;
}

export interface EdgeAttrs {
  fusedScore: number;
  attribution: ProviderAttribution[];
}

export interface ArtistNode {
  readonly mbid: string;
  readonly name: string;
  readonly disambiguation?: string;
  readonly sources: ReadonlyArray<ProviderId>;
  readonly tags?: ReadonlyArray<{ name: string; count: number }>;
  readonly metadata?: {
    readonly nb_fan?: number;
    readonly imageUrl?: string;
    readonly spotifyId?: string;
    readonly deezerId?: string;
  };
  readonly externalUrls?: ReadonlyArray<{ type: string; url: string }>;
}

export interface SimilarityEdge {
  readonly sourceMbid: string;
  readonly targetMbid: string;
  readonly fusedScore: number;
  readonly attribution: ReadonlyArray<ProviderAttribution>;
}

export interface ArtistGraphData {
  readonly nodes: ReadonlyArray<ArtistNode>;
  readonly edges: ReadonlyArray<SimilarityEdge>;
  readonly truncated: boolean;
  readonly seedMbid: string;
  readonly nodeCount: number;
  readonly edgeCount: number;
}
