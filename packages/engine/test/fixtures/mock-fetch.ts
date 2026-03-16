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
