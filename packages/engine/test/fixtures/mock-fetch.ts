import { vi } from 'vitest';

export interface MockResponse {
  status: number;
  statusText?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export function createMockFetch(responses: MockResponse[]): typeof fetch {
  let callIndex = 0;
  const mockFn = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    const response = responses[callIndex] ?? responses[responses.length - 1]!;
    callIndex++;
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText ?? 'OK',
      json: async () => response.body,
      text: async () => JSON.stringify(response.body),
      headers: new Headers(response.headers ?? {}),
    } as Response;
  });
  return mockFn as unknown as typeof fetch;
}

export const MOCK_MB_SEARCH_RESPONSE = {
  created: '2026-03-16T00:00:00.000Z',
  count: 1,
  offset: 0,
  artists: [
    {
      id: 'a74b1b7f-71a5-4011-9441-d0b5e4122711',
      name: 'Radiohead',
      disambiguation: 'English rock band',
      country: 'GB',
      score: 100,
      'life-span': {
        begin: '1991',
        ended: false,
      },
      tags: [
        { name: 'alternative rock', count: 15 },
        { name: 'electronic', count: 8 },
      ],
    },
  ],
};

// ListenBrainz lb-radio response — dict keyed by similar artist MBIDs
export const MOCK_LB_SIMILAR_RESPONSE = {
  'cb67438a-7f50-4f2b-a6f1-2bb2729fd538': [
    {
      recording_mbid: 'rec-001',
      similar_artist_mbid: 'cb67438a-7f50-4f2b-a6f1-2bb2729fd538',
      similar_artist_name: 'Beck',
      total_listen_count: 29,
    },
  ],
  '8bfac288-ccc5-448d-9573-c33ea2aa5c30': [
    {
      recording_mbid: 'rec-002',
      similar_artist_mbid: '8bfac288-ccc5-448d-9573-c33ea2aa5c30',
      similar_artist_name: 'Björk',
      total_listen_count: 900,
    },
  ],
  'b7ffd2af-418f-4be2-bdd1-22f8b48613da': [
    {
      recording_mbid: 'rec-003',
      similar_artist_mbid: 'b7ffd2af-418f-4be2-bdd1-22f8b48613da',
      similar_artist_name: 'Thom Yorke',
      total_listen_count: 1,
    },
  ],
};

// Last.fm artist.getSimilar response
export const MOCK_LASTFM_SIMILAR_RESPONSE = {
  similarartists: {
    artist: [
      {
        name: 'Thom Yorke',
        mbid: 'b7ffd2af-418f-4be2-bdd1-22f8b48613da',
        match: '0.989',
        url: 'https://www.last.fm/music/Thom+Yorke',
        image: [],
      },
      {
        name: 'Portishead',
        mbid: '8f6bd1e4-fbe1-4f50-aa9b-94c450ec0f11',
        match: '0.756',
        url: 'https://www.last.fm/music/Portishead',
        image: [],
      },
      {
        name: 'Obscure Artist',
        mbid: '',
        match: '0.45',
        url: 'https://www.last.fm/music/Obscure+Artist',
        image: [],
      },
    ],
    '@attr': { artist: 'Radiohead' },
  },
};

// Deezer search artist response
export const MOCK_DEEZER_SEARCH_RESPONSE = {
  data: [
    {
      id: 399,
      name: 'Radiohead',
      link: 'https://www.deezer.com/artist/399',
      picture_medium: 'https://cdn-images.dzcdn.net/images/artist/399.jpg',
      nb_album: 42,
      nb_fan: 3500000,
      type: 'artist',
    },
  ],
  total: 1,
};

// Deezer related artists response
export const MOCK_DEEZER_RELATED_RESPONSE = {
  data: [
    {
      id: 6404,
      name: 'Muse',
      link: 'https://www.deezer.com/artist/6404',
      picture_medium: 'https://cdn-images.dzcdn.net/images/artist/6404.jpg',
      nb_album: 25,
      nb_fan: 790414,
      radio: true,
      type: 'artist',
    },
    {
      id: 1188,
      name: 'Coldplay',
      link: 'https://www.deezer.com/artist/1188',
      picture_medium: 'https://cdn-images.dzcdn.net/images/artist/1188.jpg',
      nb_album: 30,
      nb_fan: 12000000,
      radio: true,
      type: 'artist',
    },
  ],
  total: 2,
};

// TasteDive similar response
export const MOCK_TASTEDIVE_RESPONSE = {
  Similar: {
    Info: [{ Name: 'Radiohead', Type: 'music' }],
    Results: [
      { Name: 'Portishead', Type: 'music' },
      { Name: 'Thom Yorke', Type: 'music' },
      { Name: 'Massive Attack', Type: 'music' },
    ],
  },
};

// Spotify client credentials token response
export const MOCK_SPOTIFY_TOKEN_RESPONSE = {
  access_token: 'mock-spotify-access-token-xyz',
  token_type: 'Bearer',
  expires_in: 3600,
};

// Spotify search artist response
export const MOCK_SPOTIFY_SEARCH_RESPONSE = {
  artists: {
    items: [
      {
        id: '4Z8W4fKeB5YxbusRsdQVPb',
        name: 'Radiohead',
        images: [{ url: 'https://i.scdn.co/radiohead.jpg', height: 640, width: 640 }],
        external_urls: { spotify: 'https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb' },
        genres: [],
        popularity: 0,
        type: 'artist',
      },
    ],
  },
};

// Spotify related artists response
export const MOCK_SPOTIFY_RELATED_RESPONSE = {
  artists: [
    {
      id: '3YQKmKGau1PzlVlkL1iodx',
      name: 'Twenty One Pilots',
      images: [{ url: 'https://i.scdn.co/top.jpg', height: 640, width: 640 }],
      external_urls: { spotify: 'https://open.spotify.com/artist/3YQKmKGau1PzlVlkL1iodx' },
      genres: [],
      popularity: 0,
      type: 'artist',
    },
    {
      id: '4CvTDPKA6W06nbECnkEJuY',
      name: 'Muse',
      images: [{ url: 'https://i.scdn.co/muse.jpg', height: 640, width: 640 }],
      external_urls: { spotify: 'https://open.spotify.com/artist/4CvTDPKA6W06nbECnkEJuY' },
      genres: [],
      popularity: 0,
      type: 'artist',
    },
  ],
};

// MusicBrainz URL lookup response (for Spotify ID -> MBID resolution)
export const MOCK_MB_URL_LOOKUP_RESPONSE = {
  url: {
    id: 'url-id-1',
    resource: 'https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb',
  },
  relations: [
    {
      type: 'free streaming',
      direction: 'backward',
      artist: {
        id: 'a74b1b7f-71a5-4011-9441-d0b5e4122711',
        name: 'Radiohead',
      },
    },
  ],
};

// MusicBrainz artist lookup with url-rels (for MBID -> platform IDs)
export const MOCK_MB_ARTIST_URL_RELS_RESPONSE = {
  id: 'a74b1b7f-71a5-4011-9441-d0b5e4122711',
  name: 'Radiohead',
  relations: [
    {
      type: 'free streaming',
      url: { resource: 'https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb' },
    },
    {
      type: 'free streaming',
      url: { resource: 'https://www.deezer.com/artist/399' },
    },
  ],
};

// MusicBrainz search for ambiguous artist "John Williams"
export const MOCK_MB_AMBIGUOUS_SEARCH_RESPONSE = {
  created: '2026-03-16T00:00:00.000Z',
  count: 3,
  offset: 0,
  artists: [
    {
      id: 'mbid-john-williams-film',
      name: 'John Williams',
      disambiguation: 'film composer',
      score: 100,
    },
    {
      id: 'mbid-john-williams-guitar',
      name: 'John Williams',
      disambiguation: 'classical guitarist',
      score: 95,
    },
    {
      id: 'mbid-john-williams-low',
      name: 'John Williams',
      disambiguation: 'country singer',
      score: 50,
    },
  ],
};

export const MOCK_MB_ARTIST_DETAILS_RESPONSE = {
  id: 'a74b1b7f-71a5-4011-9441-d0b5e4122711',
  name: 'Radiohead',
  disambiguation: 'English rock band',
  country: 'GB',
  'life-span': {
    begin: '1991',
    ended: false,
  },
  tags: [
    { name: 'alternative rock', count: 15 },
    { name: 'electronic', count: 8 },
  ],
  relations: [
    {
      type: 'official homepage',
      url: { resource: 'https://radiohead.com' },
    },
  ],
};
