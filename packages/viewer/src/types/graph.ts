import type { ArtistNode, SimilarityEdge, ProviderId, ProviderAttribution } from '@similar-artists-graph/engine';

export interface ForceNode {
  mbid: string;
  name: string;
  disambiguation?: string;
  sources: ProviderId[];
  depthFromSeed: number;
  tags?: ReadonlyArray<{ name: string; count: number }>;
  metadata?: {
    nb_fan?: number;
    imageUrl?: string;
    spotifyId?: string;
    deezerId?: string;
  };
  addedAt?: number;  // timestamp ms — set on new nodes in addExpansion for bloom animation
  // d3 simulation fields — mutable, added by force layout
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface ForceLink {
  source: string | ForceNode;  // mbid or resolved node ref
  target: string | ForceNode;  // mbid or resolved node ref
  sourceMbid: string;
  targetMbid: string;
  fusedScore: number;
  attribution: ProviderAttribution[];
}

export function toForceNode(node: ArtistNode): ForceNode {
  return {
    mbid: node.mbid,
    name: node.name,
    depthFromSeed: 0, // overridden by graphSlice context (setGraph/addExpansion)
    ...(node.disambiguation !== undefined ? { disambiguation: node.disambiguation } : {}),
    sources: [...node.sources],
    ...(node.tags !== undefined ? { tags: node.tags } : {}),
    ...(node.metadata !== undefined ? {
      metadata: {
        ...(node.metadata.nb_fan !== undefined ? { nb_fan: node.metadata.nb_fan } : {}),
        ...(node.metadata.imageUrl !== undefined ? { imageUrl: node.metadata.imageUrl } : {}),
        ...(node.metadata.spotifyId !== undefined ? { spotifyId: node.metadata.spotifyId } : {}),
        ...(node.metadata.deezerId !== undefined ? { deezerId: node.metadata.deezerId } : {}),
      }
    } : {}),
  };
}

export function toForceLink(edge: SimilarityEdge): ForceLink {
  return {
    source: edge.sourceMbid,
    target: edge.targetMbid,
    sourceMbid: edge.sourceMbid,
    targetMbid: edge.targetMbid,
    fusedScore: edge.fusedScore,
    attribution: [...edge.attribution],
  };
}
