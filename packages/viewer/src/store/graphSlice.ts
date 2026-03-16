import type { StateCreator } from 'zustand';
import type { ForceNode, ForceLink } from '../types/graph.js';
import { toForceNode, toForceLink } from '../types/graph.js';
import type { ExploreResult } from '@similar-artists-graph/engine';

export interface GraphSlice {
  nodes: ForceNode[];
  links: ForceLink[];
  seedMbid: string | null;
  truncated: boolean;
  setGraph: (result: ExploreResult) => void;
  addExpansion: (result: ExploreResult, expandingNode: ForceNode) => void;
  clearGraph: () => void;
}

export const createGraphSlice: StateCreator<GraphSlice> = (set, get) => ({
  nodes: [],
  links: [],
  seedMbid: null,
  truncated: false,
  setGraph: (result) => set({
    nodes: result.nodes.map(toForceNode),
    links: result.edges.map(toForceLink),
    seedMbid: result.seedMbid,
    truncated: result.truncated,
  }),
  addExpansion: (result, expandingNode) => {
    const { nodes: existing, links: existingLinks } = get();
    const existingMbids = new Set(existing.map(n => n.mbid));

    // Pin all existing nodes at their current positions
    existing.forEach((n: ForceNode) => { n.fx = n.x ?? null; n.fy = n.y ?? null; });

    // New nodes spawn at expanding node's position
    const newNodes = result.nodes
      .filter((n: { mbid: string }) => !existingMbids.has(n.mbid))
      .map((n: typeof result.nodes[number]): ForceNode => ({
        ...toForceNode(n),
        ...(expandingNode.x !== undefined ? { x: expandingNode.x } : {}),
        ...(expandingNode.y !== undefined ? { y: expandingNode.y } : {}),
      }));

    // New links only — avoid duplicates by checking sourceMbid+targetMbid
    const existingLinkKeys = new Set(
      existingLinks.map((l: ForceLink) => `${l.sourceMbid}-${l.targetMbid}`)
    );
    const newLinks = result.edges
      .map(toForceLink)
      .filter((l: ForceLink) => !existingLinkKeys.has(`${l.sourceMbid}-${l.targetMbid}`)
                 && !existingLinkKeys.has(`${l.targetMbid}-${l.sourceMbid}`));

    set({
      nodes: [...existing, ...newNodes],
      links: [...existingLinks, ...newLinks],
      truncated: result.truncated,
    });
  },
  clearGraph: () => set({ nodes: [], links: [], seedMbid: null, truncated: false }),
});
