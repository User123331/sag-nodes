import type { ForceNode, ForceLink } from '../types/graph.js';
import type { ArtistNode, SimilarityEdge } from '@similar-artists-graph/engine';

interface JsonExport {
  version: '1.0';
  exportedAt: string;
  metadata: {
    seedMbid: string;
    seedName: string;
    depth: number;
    enabledProviders: string[];
  };
  nodes: ArtistNode[];
  edges: SimilarityEdge[];
}

export function buildJsonExport(
  nodes: ForceNode[],
  links: ForceLink[],
  seedMbid: string,
  seedName: string,
  depth: number,
  enabledProviders: string[],
): JsonExport {
  const artistNodes: ArtistNode[] = nodes.map((n) => ({
    mbid: n.mbid,
    name: n.name,
    ...(n.disambiguation !== undefined ? { disambiguation: n.disambiguation } : {}),
    sources: [...n.sources],
    ...(n.metadata !== undefined ? {
      metadata: {
        ...(n.metadata.nb_fan !== undefined ? { nb_fan: n.metadata.nb_fan } : {}),
        ...(n.metadata.imageUrl !== undefined ? { imageUrl: n.metadata.imageUrl } : {}),
        ...(n.metadata.spotifyId !== undefined ? { spotifyId: n.metadata.spotifyId } : {}),
        ...(n.metadata.deezerId !== undefined ? { deezerId: n.metadata.deezerId } : {}),
      },
    } : {}),
  }));

  const similarityEdges: SimilarityEdge[] = links.map((l) => ({
    sourceMbid: l.sourceMbid,
    targetMbid: l.targetMbid,
    fusedScore: l.fusedScore,
    attribution: [...l.attribution],
  }));

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    metadata: {
      seedMbid,
      seedName,
      depth,
      enabledProviders: [...enabledProviders],
    },
    nodes: artistNodes,
    edges: similarityEdges,
  };
}

export function downloadJson(data: object, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
