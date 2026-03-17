import { describe, it, expect } from 'vitest';
import {
  filterByDepth,
  filterByProviders,
  filterByNodeLimit,
} from '../src/utils/providerFilter.js';
import type { ForceNode, ForceLink } from '../src/types/graph.js';

function makeNode(mbid: string, depthFromSeed: number, sources: ForceNode['sources'] = ['musicbrainz']): ForceNode {
  return { mbid, name: mbid, sources, depthFromSeed };
}

function makeLink(sourceMbid: string, targetMbid: string, fusedScore = 0.5, attribution: ForceLink['attribution'] = []): ForceLink {
  return { source: sourceMbid, target: targetMbid, sourceMbid, targetMbid, fusedScore, attribution };
}

describe('filterByDepth', () => {
  it('keeps all nodes when maxDepth >= max depth in graph', () => {
    const seed = makeNode('seed', 0);
    const n1 = makeNode('n1', 1);
    const n2 = makeNode('n2', 1);
    const nodes = [seed, n1, n2];
    const links = [makeLink('seed', 'n1'), makeLink('seed', 'n2')];
    const result = filterByDepth(nodes, links, 1);
    expect(result.nodes).toHaveLength(3);
    expect(result.links).toHaveLength(2);
  });

  it('filters out depth-1 nodes when maxDepth=0 (seed only)', () => {
    const seed = makeNode('seed', 0);
    const n1 = makeNode('n1', 1);
    const nodes = [seed, n1];
    const links = [makeLink('seed', 'n1')];
    const result = filterByDepth(nodes, links, 0);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.mbid).toBe('seed');
    expect(result.links).toHaveLength(0);
  });

  it('filters out depth-2 node when maxDepth=1', () => {
    const seed = makeNode('seed', 0);
    const n1 = makeNode('n1', 1);
    const n2 = makeNode('n2', 2);
    const nodes = [seed, n1, n2];
    const links = [makeLink('seed', 'n1'), makeLink('n1', 'n2')];
    const result = filterByDepth(nodes, links, 1);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.map(n => n.mbid)).toContain('seed');
    expect(result.nodes.map(n => n.mbid)).toContain('n1');
    expect(result.links).toHaveLength(1);
    expect(result.links[0]?.sourceMbid).toBe('seed');
  });

  it('seed node (depthFromSeed=0) is always included at any depth', () => {
    const seed = makeNode('seed', 0);
    const n1 = makeNode('n1', 1);
    const nodes = [seed, n1];
    const links = [makeLink('seed', 'n1')];
    const result = filterByDepth(nodes, links, 0);
    expect(result.nodes.map(n => n.mbid)).toContain('seed');
  });
});

describe('filterByProviders', () => {
  it('hides node whose sources are entirely in disabled providers', () => {
    const seed = makeNode('seed', 0, ['musicbrainz']);
    const n1 = makeNode('n1', 1, ['lastfm']);
    const nodes = [seed, n1];
    const links = [makeLink('seed', 'n1')];
    const enabled = new Set<ForceNode['sources'][number]>(['musicbrainz']);
    const result = filterByProviders(nodes, links, enabled);
    expect(result.nodes.map(n => n.mbid)).not.toContain('n1');
  });

  it('keeps node if at least one source is enabled', () => {
    const seed = makeNode('seed', 0, ['musicbrainz']);
    const n1 = makeNode('n1', 1, ['lastfm', 'deezer']);
    const nodes = [seed, n1];
    const links = [makeLink('seed', 'n1')];
    const enabled = new Set<ForceNode['sources'][number]>(['musicbrainz', 'deezer']);
    const result = filterByProviders(nodes, links, enabled);
    expect(result.nodes.map(n => n.mbid)).toContain('n1');
  });

  it('recalculates fusedScore without disabled provider attribution', () => {
    const seed = makeNode('seed', 0, ['musicbrainz']);
    const n1 = makeNode('n1', 1, ['musicbrainz', 'lastfm']);
    const nodes = [seed, n1];
    const link = makeLink('seed', 'n1', 0.75, [
      { provider: 'musicbrainz', rawScore: 0.9 },
      { provider: 'lastfm', rawScore: 0.6 },
    ]);
    const enabled = new Set<ForceNode['sources'][number]>(['musicbrainz']);
    const result = filterByProviders(nodes, [link], enabled);
    expect(result.links).toHaveLength(1);
    // fusedScore = average of enabled attributions only = 0.9 / 1 = 0.9
    expect(result.links[0]?.fusedScore).toBeCloseTo(0.9);
  });

  it('excludes edge with zero remaining attribution after filtering', () => {
    const seed = makeNode('seed', 0, ['musicbrainz']);
    const n1 = makeNode('n1', 1, ['musicbrainz']);
    const nodes = [seed, n1];
    const link = makeLink('seed', 'n1', 0.5, [
      { provider: 'lastfm', rawScore: 0.5 },
    ]);
    const enabled = new Set<ForceNode['sources'][number]>(['musicbrainz']);
    const result = filterByProviders(nodes, [link], enabled);
    expect(result.links).toHaveLength(0);
  });
});

describe('filterByNodeLimit', () => {
  it('seed is always included even when limit=1', () => {
    const seed = makeNode('seed', 0);
    const n1 = makeNode('n1', 1);
    const n2 = makeNode('n2', 1);
    const n3 = makeNode('n3', 1);
    const nodes = [seed, n1, n2, n3];
    const links = [
      makeLink('seed', 'n1', 0.9),
      makeLink('seed', 'n2', 0.5),
      makeLink('seed', 'n3', 0.3),
    ];
    const result = filterByNodeLimit(nodes, links, 'seed', 1);
    expect(result.nodes.map(n => n.mbid)).toContain('seed');
    expect(result.nodes).toHaveLength(2); // seed + top 1
  });

  it('keeps top N nodes by seed edge score, drops lowest', () => {
    const seed = makeNode('seed', 0);
    const n1 = makeNode('n1', 1);
    const n2 = makeNode('n2', 1);
    const n3 = makeNode('n3', 1);
    const nodes = [seed, n1, n2, n3];
    const links = [
      makeLink('seed', 'n1', 0.9),
      makeLink('seed', 'n2', 0.5),
      makeLink('seed', 'n3', 0.3),
    ];
    const result = filterByNodeLimit(nodes, links, 'seed', 2);
    const mbids = result.nodes.map(n => n.mbid);
    expect(mbids).toContain('seed');
    expect(mbids).toContain('n1');
    expect(mbids).toContain('n2');
    expect(mbids).not.toContain('n3');
  });

  it('indirect nodes (no direct edge to seed) scored as 0 and dropped first', () => {
    const seed = makeNode('seed', 0);
    const n1 = makeNode('n1', 1);
    const n2 = makeNode('n2', 2); // no direct edge to seed
    const nodes = [seed, n1, n2];
    const links = [
      makeLink('seed', 'n1', 0.8),
      makeLink('n1', 'n2', 0.9), // high score but not to seed
    ];
    const result = filterByNodeLimit(nodes, links, 'seed', 1);
    const mbids = result.nodes.map(n => n.mbid);
    expect(mbids).toContain('seed');
    expect(mbids).toContain('n1');
    expect(mbids).not.toContain('n2');
  });

  it('links only between visible nodes after limit applied', () => {
    const seed = makeNode('seed', 0);
    const n1 = makeNode('n1', 1);
    const n2 = makeNode('n2', 1);
    const nodes = [seed, n1, n2];
    const links = [
      makeLink('seed', 'n1', 0.9),
      makeLink('seed', 'n2', 0.3),
    ];
    const result = filterByNodeLimit(nodes, links, 'seed', 1);
    // Only seed + n1 visible; link to n2 removed
    expect(result.links).toHaveLength(1);
    expect(result.links[0]?.targetMbid).toBe('n1');
  });
});
