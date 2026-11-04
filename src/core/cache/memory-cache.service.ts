import type { CacheSetOptions, ICacheService } from './cache.interface';

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null; // epoch ms
  tags: string[];
}

/**
 * High-performance, zero-external-dependency In-Memory Cache Service
 * with TTL support and Tag-based invalidation.
 * Suitable for Edge Workers isolates and local development/testing.
 */
export class MemoryCacheService implements ICacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly tagIndex = new Map<string, Set<string>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      await this.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    // If cache size exceeds limit, purge oldest entry (FIFO / eviction)
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) {
        await this.delete(firstKey);
      }
    }

    // Clean existing tags for this key if it was previously set
    if (this.store.has(key)) {
      this.removeKeyFromTagIndex(key);
    }

    const expiresAt = options?.ttlSeconds
      ? Date.now() + options.ttlSeconds * 1000
      : null;

    const tags = options?.tags ?? [];
    this.store.set(key, { value, expiresAt, tags });

    // Register into tag index
    for (const tag of tags) {
      let set = this.tagIndex.get(tag);
      if (!set) {
        set = new Set<string>();
        this.tagIndex.set(tag, set);
      }
      set.add(key);
    }
  }

  async delete(key: string): Promise<void> {
    this.removeKeyFromTagIndex(key);
    this.store.delete(key);
  }

  async invalidateTag(tag: string): Promise<void> {
    const keys = this.tagIndex.get(tag);
    if (!keys) return;

    for (const key of keys) {
      this.store.delete(key);
    }
    this.tagIndex.delete(tag);
  }

  async invalidateTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.invalidateTag(tag);
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.tagIndex.clear();
  }

  async remember<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
    tags?: string[],
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    await this.set(key, fresh, { ttlSeconds, tags });
    return fresh;
  }

  private removeKeyFromTagIndex(key: string): void {
    const entry = this.store.get(key);
    if (!entry) return;

    for (const tag of entry.tags) {
      const set = this.tagIndex.get(tag);
      if (set) {
        set.delete(key);
        if (set.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }
}

/**
 * Singleton instance of MemoryCacheService for the isolate.
 */
export const defaultCacheService = new MemoryCacheService();
