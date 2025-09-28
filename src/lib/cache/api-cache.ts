/**
 * API Response Caching
 * Caches expensive API responses to reduce costs and improve performance
 */

import { getRedisClient } from '../redis/client';
import crypto from 'crypto';

export class APICache {
  private redis = getRedisClient();

  /**
   * Generate a cache key from the input parameters
   */
  private generateKey(prefix: string, data: any): string {
    const serialized = JSON.stringify(data);
    const hash = crypto.createHash('sha256').update(serialized).digest('hex').slice(0, 16);
    return `${prefix}:${hash}`;
  }

  /**
   * Store data in cache with TTL (time to live in seconds)
   */
  async set(key: string, data: any, ttlSeconds: number): Promise<void> {
    try {
      const serialized = JSON.stringify({
        data,
        timestamp: Date.now(),
        ttl: ttlSeconds,
      });

      await this.redis.setex(key, ttlSeconds, serialized);
      console.log(`💾 Cached data with key: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Retrieve data from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);

      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached);
      console.log(`📖 Cache hit for key: ${key}`);
      return parsed.data as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      console.log(`🗑️ Deleted cache key: ${key}`);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Cache Serper search results
   */
  async cacheSearchResults(query: string, results: any): Promise<void> {
    const key = this.generateKey('search', { query });
    await this.set(key, results, 3600); // 1 hour TTL
  }

  /**
   * Get cached Serper search results
   */
  async getCachedSearchResults(query: string): Promise<any | null> {
    const key = this.generateKey('search', { query });
    return await this.get(key);
  }

  /**
   * Cache Firecrawl scraping results
   */
  async cacheScrapingResults(url: string, content: any): Promise<void> {
    const key = this.generateKey('scrape', { url });
    await this.set(key, content, 3600); // 1 hour TTL
  }

  /**
   * Get cached Firecrawl scraping results
   */
  async getCachedScrapingResults(url: string): Promise<any | null> {
    const key = this.generateKey('scrape', { url });
    return await this.get(key);
  }

  /**
   * Cache Claude API responses
   */
  async cacheClaudeResponse(prompt: string, response: any, model: string): Promise<void> {
    const key = this.generateKey('claude', { prompt, model });
    await this.set(key, response, 1800); // 30 minutes TTL
  }

  /**
   * Get cached Claude API responses
   */
  async getCachedClaudeResponse(prompt: string, model: string): Promise<any | null> {
    const key = this.generateKey('claude', { prompt, model });
    return await this.get(key);
  }

  /**
   * Cache full analysis results
   */
  async cacheAnalysisResult(competitors: string[], businessContext: string, result: any): Promise<void> {
    const key = this.generateKey('analysis', { competitors, businessContext });
    await this.set(key, result, 7200); // 2 hours TTL
  }

  /**
   * Get cached analysis results
   */
  async getCachedAnalysisResult(competitors: string[], businessContext: string): Promise<any | null> {
    const key = this.generateKey('analysis', { competitors, businessContext });
    return await this.get(key);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    try {
      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();

      // Extract memory usage from info
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'Unknown';

      return {
        totalKeys: keyCount,
        memoryUsage,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'Error',
      };
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
      console.log('🧹 Cache cleared');
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}

// Export singleton instance
export const cacheClient = new APICache();