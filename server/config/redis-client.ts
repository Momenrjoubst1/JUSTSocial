/**
 * ════════════════════════════════════════════════════════════════════════════════
 * Redis Client — Shared connection for room state persistence
 * ════════════════════════════════════════════════════════════════════════════════
 */

import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  // Keep process alive if Redis is down; requests may still degrade,
  // but the API should not crash due to retry exhaustion exceptions.
  maxRetriesPerRequest: null,
  retryStrategy(times: number) {
    if (times > 5) return null; // stop retrying after 5 attempts
    return Math.min(times * 200, 2000); // exponential backoff
  },
  lazyConnect: false,
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err: Error) => console.error('❌ Redis error:', err.message));

export default redis;
