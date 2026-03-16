import { describe, it, expect } from 'vitest';
import { GraphBuilder } from '../../src/graph/GraphBuilder.js';
import type { SimilarArtist } from '../../src/types/artist.js';

describe('GraphBuilder', () => {
  // GRPH-01: Node construction
  it('creates nodes with correct MBID, name, and sources', () => {
    const builder = new GraphBuilder();
    builder.setSeed('seed-mbid', 'Radiohead');

    const similar: SimilarArtist[] = [
      { id: 'artist-001', name: 'Portishead', score: 0.8 },
    ];
    builder.addSimilarArtists('seed-mbid', similar, 'lastfm');

    const data = builder.getGraphData();
    const portishead = data.nodes.find(n => n.mbid === 'artist-001');
    expect(portishead).toBeDefined();
    expect(portishead!.name).toBe('Portishead');
    expect(portishead!.sources).toContain('lastfm');
  });

  // GRPH-02: Score fusion
  it('fuses scores from multiple providers via equal average', () => {
    const builder = new GraphBuilder();
    builder.setSeed('seed-mbid', 'Radiohead');

    const artist: SimilarArtist = { id: 'target-001', name: 'Portishead', score: 0.8 };
    builder.addSimilarArtists('seed-mbid', [artist], 'lastfm');
    builder.addSimilarArtists('seed-mbid', [{ ...artist, score: 0.6 }], 'listenbrainz');
    builder.addSimilarArtists('seed-mbid', [{ ...artist, score: 0.9 }], 'deezer');

    const data = builder.getGraphData();
    const edge = data.edges.find(e =>
      (e.sourceMbid === 'seed-mbid' && e.targetMbid === 'target-001') ||
      (e.sourceMbid === 'target-001' && e.targetMbid === 'seed-mbid')
    );
    expect(edge).toBeDefined();
    // fused = (0.8 + 0.6 + 0.9) / 3 = 0.7667
    expect(edge!.fusedScore).toBeCloseTo(0.767, 1);
  });

  // GRPH-03: Node deduplication
  it('deduplicates nodes by MBID — same MBID from two providers = 1 node', () => {
    const builder = new GraphBuilder();
    builder.setSeed('seed-mbid', 'Radiohead');

    const artist: SimilarArtist = { id: 'dup-mbid', name: 'Portishead', score: 0.7 };
    builder.addSimilarArtists('seed-mbid', [artist], 'lastfm');
    builder.addSimilarArtists('seed-mbid', [{ ...artist, score: 0.6 }], 'listenbrainz');

    const data = builder.getGraphData();
    // Should be 2: seed + 1 deduplicated similar
    expect(data.nodeCount).toBe(2);
    expect(builder.artistGraph.order).toBe(2);
  });

  // GRPH-03: Source merge on dedup
  it('merges sources when same MBID added from multiple providers', () => {
    const builder = new GraphBuilder();
    builder.setSeed('seed-mbid', 'Radiohead');

    const artist: SimilarArtist = { id: 'dup-mbid', name: 'Portishead', score: 0.7 };
    builder.addSimilarArtists('seed-mbid', [artist], 'lastfm');
    builder.addSimilarArtists('seed-mbid', [{ ...artist, score: 0.6 }], 'listenbrainz');

    const data = builder.getGraphData();
    const portishead = data.nodes.find(n => n.mbid === 'dup-mbid');
    expect(portishead).toBeDefined();
    expect(portishead!.sources).toContain('lastfm');
    expect(portishead!.sources).toContain('listenbrainz');
  });

  // GRPH-04: BFS expansion
  it('supports multi-depth BFS expansion', () => {
    const builder = new GraphBuilder();
    builder.setSeed('seed-mbid', 'Radiohead');

    // Depth 1 — add similar to seed
    const depth1: SimilarArtist[] = [
      { id: 'depth1-001', name: 'Portishead', score: 0.8 },
      { id: 'depth1-002', name: 'Massive Attack', score: 0.75 },
    ];
    builder.addSimilarArtists('seed-mbid', depth1, 'lastfm');

    // Depth 2 — add similar to a depth-1 node
    const depth2: SimilarArtist[] = [
      { id: 'depth2-001', name: 'Bjork', score: 0.6 },
    ];
    builder.addSimilarArtists('depth1-001', depth2, 'listenbrainz');

    const data = builder.getGraphData();
    // Should have seed + 2 depth-1 + 1 depth-2 = 4 nodes
    expect(data.nodeCount).toBe(4);
    // Should contain the depth-2 node
    expect(data.nodes.find(n => n.mbid === 'depth2-001')).toBeDefined();
  });

  // GRPH-05: Budget enforcement
  it('stops adding nodes when maxNodes budget is reached and sets truncated=true', () => {
    const builder = new GraphBuilder({ maxNodes: 5 });
    builder.setSeed('seed-mbid', 'Radiohead');

    // Try to add 10 similar artists — should stop at 4 more (total 5 with seed)
    const artists: SimilarArtist[] = Array.from({ length: 10 }, (_, i) => ({
      id: `artist-${i}`,
      name: `Artist ${i}`,
      score: 0.5,
    }));
    builder.addSimilarArtists('seed-mbid', artists, 'lastfm');

    const data = builder.getGraphData();
    expect(data.truncated).toBe(true);
    expect(data.nodeCount).toBe(5);
  });

  // GRPH-05: Budget hard cap
  it('caps maxNodes at 200 regardless of what is requested', () => {
    const builder = new GraphBuilder({ maxNodes: 300 });
    // @ts-expect-error -- accessing private for test
    expect(builder.maxNodes).toBe(200);
  });

  // GRPH-06: Edge attribution
  it('stores attribution array with provider and rawScore per edge', () => {
    const builder = new GraphBuilder();
    builder.setSeed('seed-mbid', 'Radiohead');

    const artist: SimilarArtist = { id: 'target-001', name: 'Portishead', score: 0.82 };
    builder.addSimilarArtists('seed-mbid', [artist], 'lastfm');

    const data = builder.getGraphData();
    const edge = data.edges.find(e =>
      (e.sourceMbid === 'seed-mbid' && e.targetMbid === 'target-001') ||
      (e.sourceMbid === 'target-001' && e.targetMbid === 'seed-mbid')
    );
    expect(edge).toBeDefined();
    expect(edge!.attribution.length).toBe(1);
    expect(edge!.attribution[0]!.provider).toBe('lastfm');
    expect(edge!.attribution[0]!.rawScore).toBe(0.82);
  });

  // GRPH-06: Attribution array growth
  it('grows attribution array when multiple providers contribute to same edge', () => {
    const builder = new GraphBuilder();
    builder.setSeed('seed-mbid', 'Radiohead');

    builder.addSimilarArtists('seed-mbid', [{ id: 'target-001', name: 'Portishead', score: 0.82 }], 'lastfm');
    builder.addSimilarArtists('seed-mbid', [{ id: 'target-001', name: 'Portishead', score: 0.71 }], 'listenbrainz');

    const data = builder.getGraphData();
    const edge = data.edges.find(e =>
      (e.sourceMbid === 'seed-mbid' && e.targetMbid === 'target-001') ||
      (e.sourceMbid === 'target-001' && e.targetMbid === 'seed-mbid')
    );
    expect(edge).toBeDefined();
    expect(edge!.attribution.length).toBe(2);
  });

  // Self-edge prevention
  it('does not create self-edges when seed is same as similar artist', () => {
    const builder = new GraphBuilder();
    builder.setSeed('seed-mbid', 'Radiohead');

    // Add the seed itself as a similar artist
    builder.addSimilarArtists('seed-mbid', [{ id: 'seed-mbid', name: 'Radiohead', score: 1.0 }], 'lastfm');

    const data = builder.getGraphData();
    // No self-edges
    const selfEdge = data.edges.find(e => e.sourceMbid === e.targetMbid);
    expect(selfEdge).toBeUndefined();
    // Only 1 node (the seed itself, since same MBID merged)
    expect(data.nodeCount).toBe(1);
    expect(data.edgeCount).toBe(0);
  });

  // setSeed
  it('sets seed node as the first node with correct MBID', () => {
    const builder = new GraphBuilder();
    builder.setSeed('my-seed-mbid', 'Test Artist', 'disambiguation text');

    expect(builder.getGraphData().seedMbid).toBe('my-seed-mbid');
    expect(builder.hasNode('my-seed-mbid')).toBe(true);

    const data = builder.getGraphData();
    const seedNode = data.nodes.find(n => n.mbid === 'my-seed-mbid');
    expect(seedNode).toBeDefined();
    expect(seedNode!.name).toBe('Test Artist');
    expect(seedNode!.disambiguation).toBe('disambiguation text');
  });

  // resolvedMbids mapping
  it('uses resolved MBID from map instead of provider-specific ID', () => {
    const builder = new GraphBuilder();
    builder.setSeed('seed-mbid', 'Radiohead');

    const artist: SimilarArtist = { id: 'deezer-id-123', name: 'Portishead', score: 0.7 };
    const resolvedMbids = new Map([['deezer-id-123', 'real-mbid-portishead']]);
    builder.addSimilarArtists('seed-mbid', [artist], 'deezer', resolvedMbids);

    const data = builder.getGraphData();
    expect(data.nodes.find(n => n.mbid === 'real-mbid-portishead')).toBeDefined();
    expect(data.nodes.find(n => n.mbid === 'deezer-id-123')).toBeUndefined();
  });

  // Empty similar artists
  it('returns 0 new nodes when given empty similar artists array', () => {
    const builder = new GraphBuilder();
    builder.setSeed('seed-mbid', 'Radiohead');

    const count = builder.addSimilarArtists('seed-mbid', [], 'lastfm');
    expect(count).toBe(0);
    expect(builder.getGraphData().nodeCount).toBe(1); // only seed
  });
});
