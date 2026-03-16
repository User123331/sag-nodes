import type { SimilarArtist } from '../types/artist.js';
import type { ProviderId } from '../types/errors.js';
import type { ProviderAttribution, NodeAttrs } from './types.js';
import { ArtistGraph } from './ArtistGraph.js';

const DEFAULT_MAX_NODES = 150;

export interface GraphBuilderOptions {
  readonly maxNodes?: number; // default 150, max 200
}

export class GraphBuilder {
  private readonly maxNodes: number;
  readonly artistGraph: ArtistGraph;

  constructor(options: GraphBuilderOptions = {}) {
    const requested = options.maxNodes ?? DEFAULT_MAX_NODES;
    this.maxNodes = Math.min(requested, 200); // hard cap at 200
    this.artistGraph = new ArtistGraph();
  }

  /**
   * Set the seed artist node. This is the first node in the graph.
   */
  setSeed(mbid: string, name: string, disambiguation?: string): void {
    this.artistGraph.seedMbid = mbid;
    const attrs: NodeAttrs = {
      name,
      mbid,
      sources: [],
      ...(disambiguation !== undefined ? { disambiguation } : {}),
    };
    this.artistGraph.addNode(mbid, attrs);
  }

  /**
   * Add similar artists from a specific provider to the graph.
   * Each similar artist becomes a node (or merged into existing node)
   * and gets an edge to the seed artist with provider attribution.
   *
   * Returns the number of genuinely new nodes added.
   * Stops adding new nodes when budget is hit — sets truncated flag.
   */
  addSimilarArtists(
    seedMbid: string,
    similarArtists: ReadonlyArray<SimilarArtist>,
    providerId: ProviderId,
    resolvedMbids?: ReadonlyMap<string, string>,
  ): number {
    let newNodes = 0;

    for (const artist of similarArtists) {
      // Check node budget before adding a new node
      if (this.artistGraph.order >= this.maxNodes) {
        this.artistGraph.truncated = true;
        break;
      }

      // Resolve to canonical MBID if a mapping is provided
      const canonicalMbid = resolvedMbids?.get(artist.id) ?? artist.id;

      // Add or merge the node
      const attrs: NodeAttrs = {
        name: artist.name,
        mbid: canonicalMbid,
        sources: [providerId],
      };
      const isNew = this.artistGraph.addNode(canonicalMbid, attrs);
      if (isNew) newNodes++;

      // Add or merge the edge with provider attribution
      const attribution: ProviderAttribution = {
        provider: providerId,
        rawScore: artist.score,
      };

      // Only add edge if both nodes exist and source !== target
      if (this.artistGraph.hasNode(seedMbid) && seedMbid !== canonicalMbid) {
        this.artistGraph.addEdge(seedMbid, canonicalMbid, attribution);
      }
    }

    return newNodes;
  }

  /**
   * Get the current graph data for serialization.
   */
  getGraphData() {
    return this.artistGraph.toData();
  }

  /**
   * Check if the node budget has been reached.
   */
  isBudgetReached(): boolean {
    return this.artistGraph.order >= this.maxNodes;
  }

  /**
   * Get all node MBIDs in the graph.
   */
  getNodeMbids(): string[] {
    const mbids: string[] = [];
    this.artistGraph.graph.forEachNode((mbid) => {
      mbids.push(mbid);
    });
    return mbids;
  }

  /**
   * Check if a node exists in the graph.
   */
  hasNode(mbid: string): boolean {
    return this.artistGraph.hasNode(mbid);
  }
}
