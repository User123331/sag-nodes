export interface CacheStore {
  get(key: string): string | undefined;
  set(key: string, value: string, ttlMs: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  readonly size: number;
}
