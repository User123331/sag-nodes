import type { ForceNode } from '../types/graph.js';

export interface ExternalLink {
  readonly name: string;
  readonly url: string;
}

export function buildExternalLinks(node: ForceNode): ExternalLink[] {
  const links: ExternalLink[] = [];

  // MusicBrainz — always available (every node has mbid)
  links.push({
    name: 'MusicBrainz',
    url: `https://musicbrainz.org/artist/${node.mbid}`,
  });

  if (node.metadata?.spotifyId) {
    links.push({
      name: 'Spotify',
      url: `https://open.spotify.com/artist/${node.metadata.spotifyId}`,
    });
  }

  if (node.metadata?.deezerId) {
    links.push({
      name: 'Deezer',
      url: `https://www.deezer.com/artist/${node.metadata.deezerId}`,
    });
  }

  // Last.fm — constructed from artist name (URL-encoded)
  links.push({
    name: 'Last.fm',
    url: `https://www.last.fm/music/${encodeURIComponent(node.name)}`,
  });

  return links;
}
