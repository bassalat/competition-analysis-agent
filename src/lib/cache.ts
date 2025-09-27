/**
 * Simple in-memory cache for competitive intelligence results
 * Reduces API calls and costs by caching research data and analysis results
 */

import { BusinessContext } from '@/types/api';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL = 60 * 60 * 1000; // 1 hour default TTL

  /**
   * Get cached value if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.timestamp + entry.ttl) {
      // Entry expired, remove it
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache value with optional TTL
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs || this.DEFAULT_TTL,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists in cache and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalEntries = this.cache.size;
    let expiredEntries = 0;
    const now = Date.now();

    for (const entry of this.cache.values()) {
      if (now > entry.timestamp + entry.ttl) {
        expiredEntries++;
      }
    }

    return {
      totalEntries,
      activeEntries: totalEntries - expiredEntries,
      expiredEntries,
      hitRate: 0, // Would need to track hits/misses to calculate this
    };
  }
}

// Singleton instance
const cache = new SimpleCache();

// Clean up expired entries every 10 minutes
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000);

export default cache;

/**
 * Generate cache key for competitor research
 */
export function generateResearchCacheKey(
  competitorName: string,
  businessContext: BusinessContext
): string {
  const contextHash = btoa(JSON.stringify({
    industry: businessContext.industry,
    targetMarket: businessContext.targetMarket,
    keyProducts: businessContext.keyProducts,
  })).substring(0, 16);

  return `research:${competitorName.toLowerCase().replace(/\s+/g, '-')}:${contextHash}`;
}

/**
 * Generate cache key for perspective analysis
 */
export function generateAnalysisCacheKey(
  competitorName: string,
  perspectiveName: string,
  analysisMode: string
): string {
  return `analysis:${competitorName.toLowerCase().replace(/\s+/g, '-')}:${perspectiveName.toLowerCase().replace(/\s+/g, '-')}:${analysisMode}`;
}

/**
 * Generate cache key for complete analysis
 */
export function generateCompleteAnalysisCacheKey(
  competitorNames: string[],
  analysisMode: string,
  businessContext: BusinessContext
): string {
  const sortedNames = competitorNames.sort().join(',');
  const contextHash = btoa(JSON.stringify({
    industry: businessContext.industry,
    targetMarket: businessContext.targetMarket,
  })).substring(0, 12);

  return `complete:${btoa(sortedNames).substring(0, 20)}:${analysisMode}:${contextHash}`;
}