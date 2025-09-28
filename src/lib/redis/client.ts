/**
 * Redis Client Configuration
 * Handles connection to Railway Redis instance with connection pooling and error handling
 */

import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    let redisUrl = process.env.REDIS_URL;

    // For local development, fall back to local Redis if Railway Redis is not accessible
    if (!redisUrl || (redisUrl.includes('redis.railway.internal') && process.env.NODE_ENV !== 'production')) {
      redisUrl = 'redis://localhost:6379';
      console.log('🔧 Using local Redis for development:', redisUrl);
    }

    redis = new Redis(redisUrl, {
      // Connection pool settings
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxLoadingTimeout: 5000,

      // Connection settings for Railway
      lazyConnect: true,
      keepAlive: 30000,

      // Error handling
      retryDelayOnConnectFail: (times: number) => Math.min(times * 50, 2000),
    });

    // Connection event handlers
    redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redis.on('ready', () => {
      console.log('✅ Redis ready for operations');
    });

    redis.on('error', (err: Error) => {
      console.error('❌ Redis connection error:', err.message);
    });

    redis.on('close', () => {
      console.log('🔌 Redis connection closed');
    });

    redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  return redis;
}

export async function checkRedisConnection(): Promise<boolean> {
  try {
    const client = getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    console.warn('Redis connection check failed (normal in local development):', error);
    return false;
  }
}

export function closeRedisConnection(): void {
  if (redis) {
    redis.disconnect();
    redis = null;
  }
}

export default getRedisClient;