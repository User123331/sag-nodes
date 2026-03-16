import { describe, it, expect } from 'vitest';
import { buildExternalLinks } from '../src/utils/externalLinks.js';
import type { ForceNode } from '../src/types/graph.js';

function makeNode(overrides: Partial<ForceNode> = {}): ForceNode {
  return {
    mbid: 'abc-123',
    name: 'Test Artist',
    sources: [],
    ...overrides,
  };
}

describe('buildExternalLinks', () => {
  it('returns MusicBrainz and Last.fm links for node with only mbid and name', () => {
    const node = makeNode();
    const links = buildExternalLinks(node);
    const names = links.map(l => l.name);

    expect(names).toContain('MusicBrainz');
    expect(names).toContain('Last.fm');
    expect(links.find(l => l.name === 'MusicBrainz')?.url).toBe(
      'https://musicbrainz.org/artist/abc-123'
    );
  });

  it('returns Spotify link when spotifyId present in metadata', () => {
    const node = makeNode({ metadata: { spotifyId: 'spotify123' } });
    const links = buildExternalLinks(node);
    const spotify = links.find(l => l.name === 'Spotify');

    expect(spotify).toBeDefined();
    expect(spotify?.url).toBe('https://open.spotify.com/artist/spotify123');
  });

  it('returns Deezer link when deezerId present in metadata', () => {
    const node = makeNode({ metadata: { deezerId: 'deezer456' } });
    const links = buildExternalLinks(node);
    const deezer = links.find(l => l.name === 'Deezer');

    expect(deezer).toBeDefined();
    expect(deezer?.url).toBe('https://www.deezer.com/artist/deezer456');
  });

  it("Last.fm URL encodes artist name correctly for Guns N' Roses", () => {
    const node = makeNode({ name: "Guns N' Roses" });
    const links = buildExternalLinks(node);
    const lastfm = links.find(l => l.name === 'Last.fm');

    expect(lastfm?.url).toBe(
      `https://www.last.fm/music/${encodeURIComponent("Guns N' Roses")}`
    );
  });
});
