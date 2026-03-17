import { describe, it, expect } from 'vitest';
import { buildGexf, escapeXml } from '../src/utils/exportGexf.js';
import type { ForceNode, ForceLink } from '../src/types/graph.js';

function makeNode(mbid: string, name: string): ForceNode {
  return {
    mbid,
    name,
    sources: ['musicbrainz'],
    depthFromSeed: 0,
  };
}

function makeLink(sourceMbid: string, targetMbid: string, fusedScore = 0.8): ForceLink {
  return {
    source: sourceMbid,
    target: targetMbid,
    sourceMbid,
    targetMbid,
    fusedScore,
    attribution: [{ provider: 'musicbrainz', rawScore: fusedScore }],
  };
}

describe('escapeXml', () => {
  it('converts & to &amp;', () => {
    expect(escapeXml('AC/DC & Friends')).toBe('AC/DC &amp; Friends');
  });

  it('converts < to &lt;', () => {
    expect(escapeXml('a < b')).toBe('a &lt; b');
  });

  it('converts > to &gt;', () => {
    expect(escapeXml('a > b')).toBe('a &gt; b');
  });

  it('converts " to &quot;', () => {
    expect(escapeXml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('handles & before < (& is replaced first)', () => {
    expect(escapeXml('&<>')).toBe('&amp;&lt;&gt;');
  });
});

describe('buildGexf', () => {
  const nodes = [makeNode('seed', 'Radiohead'), makeNode('n1', 'Portishead')];
  const links = [makeLink('seed', 'n1', 0.9)];

  it('starts with XML declaration', () => {
    const xml = buildGexf(nodes, links, 'Radiohead');
    expect(xml).toMatch(/^<\?xml version="1\.0"/);
  });

  it('contains GEXF 1.3 namespace', () => {
    const xml = buildGexf(nodes, links, 'Radiohead');
    expect(xml).toContain('xmlns="http://gexf.net/1.3"');
  });

  it('contains node elements for each node', () => {
    const xml = buildGexf(nodes, links, 'Radiohead');
    expect(xml).toContain('<node id="seed"');
    expect(xml).toContain('<node id="n1"');
  });

  it('contains edge elements for each link', () => {
    const xml = buildGexf(nodes, links, 'Radiohead');
    expect(xml).toContain('<edge id="0"');
  });

  it('escapes special characters in artist name', () => {
    const specialNodes = [makeNode('ac', 'AC/DC & Friends'), makeNode('n2', 'Other')];
    const xml = buildGexf(specialNodes, [], 'AC/DC & Friends');
    expect(xml).toContain('AC/DC &amp; Friends');
    expect(xml).not.toContain('AC/DC & Friends"');
  });

  it('includes edge source and target attributes', () => {
    const xml = buildGexf(nodes, links, 'Radiohead');
    expect(xml).toContain('source="seed"');
    expect(xml).toContain('target="n1"');
  });
});
