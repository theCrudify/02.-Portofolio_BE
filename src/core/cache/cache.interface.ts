/**
 * Cache service abstraction following SOLID (Dependency Inversion Principle).
 * Any cache implementation (in-memory LRU, Cloudflare Cache API, Redis, KV)
 * can implement this interface.
 */
export interface CacheSetOptions {
  ttlSeconds?: number;
  tags?: string[];
}

export interface ICacheService {
  /**
   * Retrieve a typed value by key.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Store a typed value by key with optional TTL and invalidation tags.
   */
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;

  /**
   * Delete a key directly.
   */
  delete(key: string): Promise<void>;

  /**
   * Invalidate all keys associated with a given tag.
   */
  invalidateTag(tag: string): Promise<void>;

  /**
   * Invalidate all keys associated with any of the given tags.
   */
  invalidateTags(tags: string[]): Promise<void>;

  /**
   * Clear the entire cache.
   */
  clear(): Promise<void>;

  /**
   * Retrieve or compute (Cache-Aside pattern).
   * If key exists, returns cached value.
   * Otherwise, calls fetcher(), stores the result, and returns it.
   */
  remember<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
    tags?: string[],
  ): Promise<T>;
}
