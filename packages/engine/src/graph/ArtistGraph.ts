import { UndirectedGraph } from 'graphology';
import type { NodeAttrs, EdgeAttrs, ArtistNode, SimilarityEdge, ArtistGraphData, ProviderAttribution } from './types.js';

export class ArtistGraph {
  readonly graph: UndirectedGraph<NodeAttrs, EdgeAttrs>;
  private _truncated = false;
  private _seedMbid = '';

  constructor() {
    this.graph = new UndirectedGraph<NodeAttrs, EdgeAttrs>();
  }

  get order(): number {
    return this.graph.order;
  }

  get size(): number {
    return this.graph.size;
  }

  get truncated(): boolean {
    return this._truncated;
  }

  set truncated(value: boolean) {
    this._truncated = value;
  }

  get seedMbid(): string {
    return this._seedMbid;
  }

  set seedMbid(value: string) {
    this._seedMbid = value;
  }

  hasNode(mbid: string): boolean {
    return this.graph.hasNode(mbid);
  }

  /**
   * Add or merge a node. If node with same MBID exists, merge sources and metadata.
   * Returns true if this was a genuinely new node (not a merge).
   */
  addNode(mbid: string, attrs: NodeAttrs): boolean {
    if (this.graph.hasNode(mbid)) {
      // Merge: add new sources, merge metadata
      const existing = this.graph.getNodeAttributes(mbid);
      const mergedSources = Array.from(new Set([...existing.sources, ...attrs.sources]));
      const mergedMetadata = { ...existing.metadata, ...attrs.metadata };
      this.graph.setNodeAttribute(mbid, 'sources', mergedSources);
      if (Object.keys(mergedMetadata).length > 0) {
        this.graph.setNodeAttribute(mbid, 'metadata', mergedMetadata);
      }
      if (attrs.disambiguation && !existing.disambiguation) {
        this.graph.setNodeAttribute(mbid, 'disambiguation', attrs.disambiguation);
      }
      if (attrs.tags !== undefined && attrs.tags.length > 0 && (existing.tags === undefined || existing.tags.length === 0)) {
        this.graph.setNodeAttribute(mbid, 'tags', attrs.tags);
      }
      return false; // not a new node
    }

    this.graph.addNode(mbid, attrs);
    return true; // genuinely new node
  }

  /**
   * Add or merge an edge. If edge already exists between these two MBIDs,
   * append the new attribution and recalculate the fused score.
   */
  addEdge(sourceMbid: string, targetMbid: string, attribution: ProviderAttribution): void {
    if (sourceMbid === targetMbid) return; // no self-edges

    if (this.graph.hasEdge(sourceMbid, targetMbid)) {
      // Merge: add new attribution, recalculate fused score
      const existing = this.graph.getEdgeAttributes(sourceMbid, targetMbid);
      const updatedAttribution = [...existing.attribution, attribution];
      const fusedScore = updatedAttribution.reduce((sum, a) => sum + a.rawScore, 0) / updatedAttribution.length;
      this.graph.setEdgeAttribute(sourceMbid, targetMbid, 'attribution', updatedAttribution);
      this.graph.setEdgeAttribute(sourceMbid, targetMbid, 'fusedScore', fusedScore);
    } else {
      this.graph.addEdge(sourceMbid, targetMbid, {
        fusedScore: attribution.rawScore,
        attribution: [attribution],
      });
    }
  }

  /**
   * Export the graph to a serializable ArtistGraphData object.
   */
  toData(): ArtistGraphData {
    const nodes: ArtistNode[] = [];
    this.graph.forEachNode((mbid, attrs) => {
      nodes.push({
        mbid,
        name: attrs.name,
        ...(attrs.disambiguation !== undefined ? { disambiguation: attrs.disambiguation } : {}),
        sources: [...attrs.sources],
        ...(attrs.tags !== undefined ? { tags: attrs.tags } : {}),
        ...(attrs.metadata !== undefined ? { metadata: attrs.metadata } : {}),
      });
    });

    const edges: SimilarityEdge[] = [];
    this.graph.forEachEdge((_edge, attrs, source, target) => {
      edges.push({
        sourceMbid: source,
        targetMbid: target,
        fusedScore: attrs.fusedScore,
        attribution: [...attrs.attribution],
      });
    });

    return {
      nodes,
      edges,
      truncated: this._truncated,
      seedMbid: this._seedMbid,
      nodeCount: this.graph.order,
      edgeCount: this.graph.size,
    };
  }
}
