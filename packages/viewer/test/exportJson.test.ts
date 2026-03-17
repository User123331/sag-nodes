import { describe, it, expect } from 'vitest';
import { buildJsonExport } from '../src/utils/exportJson.js';
import type { ForceNode, ForceLink } from '../src/types/graph.js';

function makeNode(mbid: string): ForceNode {
  return {
    mbid,
    name: `Artist ${mbid}`,
    sources: ['musicbrainz', 'lastfm'],
    depthFromSeed: 0,
    metadata: { nb_fan: 1000 },
  };
}

function makeLink(sourceMbid: string, targetMbid: string): ForceLink {
  return {
    source: sourceMbid,
    target: targetMbid,
    sourceMbid,
    targetMbid,
    fusedScore: 0.75,
    attribution: [
      { provider: 'musicbrainz', rawScore: 0.8 },
      { provider: 'lastfm', rawScore: 0.7 },
    ],
  };
}

describe('buildJsonExport', () => {
  const nodes = [makeNode('seed-001'), makeNode('node-002')];
  const links = [makeLink('seed-001', 'node-002')];

  it('returns version 1.0', () => {
    const result = buildJsonExport(nodes, links, 'seed-001', 'Artist seed-001', 3, ['musicbrainz']);
    expect(result.version).toBe('1.0');
  });

  it('returns exportedAt as ISO string', () => {
    const result = buildJsonExport(nodes, links, 'seed-001', 'Artist seed-001', 3, ['musicbrainz']);
    expect(() => new Date(result.exportedAt)).not.toThrow();
    expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns correct metadata fields', () => {
    const result = buildJsonExport(nodes, links, 'seed-001', 'Artist seed-001', 3, ['musicbrainz', 'lastfm']);
    expect(result.metadata.seedMbid).toBe('seed-001');
    expect(result.metadata.seedName).toBe('Artist seed-001');
    expect(result.metadata.depth).toBe(3);
    expect(result.metadata.enabledProviders).toEqual(['musicbrainz', 'lastfm']);
  });

  it('returns nodes array with correct length', () => {
    const result = buildJsonExport(nodes, links, 'seed-001', 'Artist seed-001', 3, []);
    expect(result.nodes).toHaveLength(2);
  });

  it('nodes contain mbid and name', () => {
    const result = buildJsonExport(nodes, links, 'seed-001', 'Artist seed-001', 3, []);
    expect(result.nodes[0]?.mbid).toBe('seed-001');
    expect(result.nodes[0]?.name).toBe('Artist seed-001');
  });

  it('nodes contain sources array', () => {
    const result = buildJsonExport(nodes, links, 'seed-001', 'Artist seed-001', 3, []);
    expect(result.nodes[0]?.sources).toEqual(['musicbrainz', 'lastfm']);
  });

  it('returns edges array with correct length', () => {
    const result = buildJsonExport(nodes, links, 'seed-001', 'Artist seed-001', 3, []);
    expect(result.edges).toHaveLength(1);
  });

  it('edges contain sourceMbid, targetMbid, fusedScore', () => {
    const result = buildJsonExport(nodes, links, 'seed-001', 'Artist seed-001', 3, []);
    const edge = result.edges[0];
    expect(edge?.sourceMbid).toBe('seed-001');
    expect(edge?.targetMbid).toBe('node-002');
    expect(edge?.fusedScore).toBe(0.75);
  });

  it('edges contain attribution array', () => {
    const result = buildJsonExport(nodes, links, 'seed-001', 'Artist seed-001', 3, []);
    expect(result.edges[0]?.attribution).toHaveLength(2);
  });
});
