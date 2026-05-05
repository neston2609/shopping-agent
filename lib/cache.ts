import type { Product } from "@/types/product";

interface CacheEntry {
  data: Product[];
  expiresAt: number;
}

// In-memory cache — survives hot reloads in dev via global
declare global {
  // eslint-disable-next-line no-var
  var _searchCache: Map<string, CacheEntry> | undefined;
}

const TTL_MS = 15 * 60 * 1000; // 15 minutes

function getCache(): Map<string, CacheEntry> {
  if (!global._searchCache) {
    global._searchCache = new Map();
  }
  return global._searchCache;
}

export function getCached(query: string): Product[] | null {
  const key = query.toLowerCase().trim();
  const entry = getCache().get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    getCache().delete(key);
    return null;
  }
  return entry.data;
}

export function setCached(query: string, data: Product[]): void {
  const key = query.toLowerCase().trim();
  getCache().set(key, {
    data,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function clearCache(): void {
  getCache().clear();
}

export function getCacheStats(): { size: number; keys: string[] } {
  const cache = getCache();
  // Prune expired entries first
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) cache.delete(key);
  }
  return { size: cache.size, keys: Array.from(cache.keys()) };
}
