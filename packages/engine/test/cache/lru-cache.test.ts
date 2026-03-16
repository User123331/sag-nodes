import { describe, it, expect, beforeEach } from 'vitest';
import { LruCache } from '../../src/cache/LruCache.js';

describe('LruCache', () => {
  let now: number;
  let cache: LruCache;

  beforeEach(() => {
    now = 1000;
    cache = new LruCache(3, () => now);
  });

  it('returns undefined for missing keys', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('stores and retrieves values within TTL', () => {
    cache.set('key1', 'value1', 5000);
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns undefined for expired entries', () => {
    cache.set('key1', 'value1', 5000);
    now = 7000; // advance past TTL
    expect(cache.get('key1')).toBeUndefined();
  });

  it('evicts least recently used when at capacity', () => {
    cache.set('a', '1', 10000);
    cache.set('b', '2', 10000);
    cache.set('c', '3', 10000);
    // Cache is full (maxSize=3). Adding d should evict 'a' (oldest)
    cache.set('d', '4', 10000);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('2');
    expect(cache.get('d')).toBe('4');
  });

  it('accessing a key promotes it (LRU behavior)', () => {
    cache.set('a', '1', 10000);
    cache.set('b', '2', 10000);
    cache.set('c', '3', 10000);
    // Access 'a' to promote it
    cache.get('a');
    // Adding 'd' should now evict 'b' (oldest after 'a' was promoted)
    cache.set('d', '4', 10000);
    expect(cache.get('a')).toBe('1');
    expect(cache.get('b')).toBeUndefined();
  });

  it('has() returns true for live entries and false for expired', () => {
    cache.set('key1', 'value1', 5000);
    expect(cache.has('key1')).toBe(true);
    now = 7000;
    expect(cache.has('key1')).toBe(false);
  });

  it('delete() removes an entry', () => {
    cache.set('key1', 'value1', 5000);
    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeUndefined();
  });

  it('clear() removes all entries', () => {
    cache.set('a', '1', 10000);
    cache.set('b', '2', 10000);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });

  it('size reflects current entry count', () => {
    expect(cache.size).toBe(0);
    cache.set('a', '1', 10000);
    expect(cache.size).toBe(1);
    cache.set('b', '2', 10000);
    expect(cache.size).toBe(2);
  });
});
