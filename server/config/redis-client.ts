/**
 * ════════════════════════════════════════════════════════════════════════════════
 * Redis Client — Shared connection for room state persistence
 *
 * Uses MockRedis (in-memory) when real Redis is unavailable.
 * To use real Redis, set USE_REAL_REDIS=true in .env.local and ensure
 * Redis is running on localhost:6379.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import Redis from 'ioredis';
import MockRedis from './mock-redis.js';

const useRealRedis = process.env.USE_REAL_REDIS === 'true';

let redis: any;

if (useRealRedis) {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    enableOfflineQueue: true,
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: false,
  });

  redis.on('connect', () => console.log('✅ Redis connected'));
  redis.on('error', (err: Error) => console.error('❌ Redis error:', err.message));
} else {
  // Default: use in-memory mock for development without Redis
  redis = new MockRedis();
}

export default redis;
