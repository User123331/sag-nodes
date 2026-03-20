import { describe, it, expect } from 'vitest';
import { ArtistGraph } from '../../src/graph/ArtistGraph.js';

describe('ArtistGraph.toData() externalUrls', () => {
  it('includes externalUrls on nodes that have them set via setNodeAttribute', () => {
    const graph = new ArtistGraph();
    graph.addNode('mbid-001', {
      name: 'Radiohead',
      mbid: 'mbid-001',
      sources: ['musicbrainz'],
    });
    graph.graph.setNodeAttribute('mbid-001', 'externalUrls', [
      { type: 'wikidata', url: 'https://www.wikidata.org/wiki/Q164813' },
      { type: 'official homepage', url: 'https://radiohead.com' },
    ]);

    const data = graph.toData();
    const node = data.nodes.find(n => n.mbid === 'mbid-001');
    expect(node).toBeDefined();
    expect(node!.externalUrls).toBeDefined();
    expect(node!.externalUrls).toHaveLength(2);
    expect(node!.externalUrls![0]).toEqual({ type: 'wikidata', url: 'https://www.wikidata.org/wiki/Q164813' });
    expect(node!.externalUrls![1]).toEqual({ type: 'official homepage', url: 'https://radiohead.com' });
  });

  it('omits externalUrls field entirely for nodes that do not have it (no undefined key)', () => {
    const graph = new ArtistGraph();
    graph.addNode('mbid-002', {
      name: 'Portishead',
      mbid: 'mbid-002',
      sources: ['lastfm'],
    });

    const data = graph.toData();
    const node = data.nodes.find(n => n.mbid === 'mbid-002');
    expect(node).toBeDefined();
    // externalUrls key must not be present at all
    expect('externalUrls' in node!).toBe(false);
  });
});
