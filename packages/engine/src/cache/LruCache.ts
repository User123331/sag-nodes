import type { CacheStore } from './CacheStore.js';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

export class LruCache implements CacheStore {
  private readonly map = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly getNow: () => number;

  constructor(maxSize: number = 500, getNow: () => number = Date.now) {
    this.maxSize = maxSize;
    this.getNow = getNow;
  }

  get(key: string): string | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (this.getNow() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    // Move to end (most recently used): delete and re-insert
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: string, ttlMs: number): void {
    // Delete first if exists to refresh position
    this.map.delete(key);
    if (this.map.size >= this.maxSize) {
      // Evict least recently used (first entry in Map iteration order)
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) {
        this.map.delete(firstKey);
      }
    }
    this.map.set(key, { value, expiresAt: this.getNow() + ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
