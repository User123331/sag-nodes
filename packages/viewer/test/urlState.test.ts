import { describe, it, expect } from 'vitest';
import { encodeHash, decodeHash } from '../src/hooks/useUrlState.js';

describe('encodeHash', () => {
  it('returns string starting with #', () => {
    const hash = encodeHash('mbid-001', 3, ['musicbrainz', 'lastfm']);
    expect(hash).toMatch(/^#/);
  });

  it('includes seed in hash', () => {
    const hash = encodeHash('mbid-001', 3, ['musicbrainz']);
    expect(hash).toContain('seed=mbid-001');
  });

  it('includes depth in hash', () => {
    const hash = encodeHash('mbid-001', 3, ['musicbrainz']);
    expect(hash).toContain('depth=3');
  });

  it('includes providers as comma-separated values', () => {
    const hash = encodeHash('mbid-001', 2, ['musicbrainz', 'lastfm', 'deezer']);
    const decoded = decodeHash(hash);
    expect(decoded.providers).toEqual(['musicbrainz', 'lastfm', 'deezer']);
  });
});

describe('decodeHash', () => {
  it('parses seed back correctly', () => {
    const hash = encodeHash('mbid-42', 2, ['musicbrainz']);
    const result = decodeHash(hash);
    expect(result.seed).toBe('mbid-42');
  });

  it('parses depth as number', () => {
    const hash = encodeHash('mbid-42', 5, ['musicbrainz']);
    const result = decodeHash(hash);
    expect(result.depth).toBe(5);
  });

  it('parses providers as string array', () => {
    const hash = encodeHash('mbid-42', 2, ['musicbrainz', 'spotify']);
    const result = decodeHash(hash);
    expect(result.providers).toEqual(['musicbrainz', 'spotify']);
  });

  it('returns empty object for empty string', () => {
    const result = decodeHash('');
    expect(result).toEqual({});
  });

  it('returns empty object for bare #', () => {
    const result = decodeHash('#');
    expect(result).toEqual({});
  });

  it('round-trip: decode(encode()) preserves all values', () => {
    const seed = 'artist-mbid-123';
    const depth = 4;
    const providers = ['musicbrainz', 'listenbrainz', 'lastfm'];
    const hash = encodeHash(seed, depth, providers);
    const decoded = decodeHash(hash);
    expect(decoded.seed).toBe(seed);
    expect(decoded.depth).toBe(depth);
    expect(decoded.providers).toEqual(providers);
  });
});
