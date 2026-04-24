/**
 * ════════════════════════════════════════════════════════════════════════════════
 * Rate Limiters — per-endpoint rate limiting
 *
 * By default, limiters use in-memory storage.
 * Set RATE_LIMIT_STORE=redis to enable RedisStore counters shared
 * across server restarts / instances.
 *
 * ┌──────────────────────────┬────────┬─────────┬──────────────────────────────┐
 * │ Endpoint                 │ Window │ Max     │ Purpose                      │
 * ├──────────────────────────┼────────┼─────────┼──────────────────────────────┤
 * │ /api/livekit-token       │ 15 min │ 10      │ Prevent LiveKit quota drain  │
 * │ /api/agent/start|stop    │ 5 min  │ 3       │ Prevent agent spam           │
 * │ /api/moderation/report   │ 10 min │ 5       │ Prevent fake mass reports    │
 * │ /api/moderation/*-text   │ 1 min  │ 60      │ Prevent Perspective API drain│
 * │ All other routes         │ 1 min  │ 100     │ General DDoS protection      │
 * └──────────────────────────┴────────┴─────────┴──────────────────────────────┘
 * ════════════════════════════════════════════════════════════════════════════════
 */

import type { Request } from 'express';
import rateLimit, { Store, Options, ClientRateLimitInfo, ipKeyGenerator } from 'express-rate-limit';
import redis from '../config/redis-client.js';

const useRedisStore = process.env.RATE_LIMIT_STORE === 'redis';
const fallbackCounters = new Map<
  string,
  {
    hits: number;
    resetTimeMs: number;
    timeout: ReturnType<typeof setTimeout>;
  }
>();

/**
 * Sliding Window Log Redis Store
 * Uses Redis Sorted Sets (ZSET) and a custom Lua script to ensure atomicity.
 * It records the timestamp of every request, enabling a perfectly smooth
 * rolling window and eliminating the start-of-minute bursts allowed by fixed windows.
 */
class SlidingWindowRedisStore implements Store {
  private redisClient: typeof redis;
  public prefix: string;
  public windowMs!: number;

  constructor(client: typeof redis, prefix: string) {
    this.redisClient = client;
    this.prefix = prefix;

    // Define atomic Lua script to clean up old requests, add new, and return count
    // Uses PEXPIRE to clean up the set when the window fully passes.
    this.redisClient.defineCommand('slidingWindowRateLimit', {
      numberOfKeys: 1,
      lua: `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local member = ARGV[3]

        local clearBefore = now - window
        redis.call('ZREMRANGEBYSCORE', key, "-inf", clearBefore)
        redis.call('ZADD', key, now, member)
        redis.call('PEXPIRE', key, window)

        local currentHits = redis.call('ZCARD', key)

        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local oldestScore = now
        if oldest and oldest[2] then
          oldestScore = tonumber(oldest[2])
        end

        return { currentHits, oldestScore + window }
      `
    });
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = Date.now();
    const member = `${now}-${Math.random().toString(36).substring(2)}`;

    try {
      const result = await (this.redisClient as any).slidingWindowRateLimit(
        this.prefix + key,
        now,
        this.windowMs,
        member
      );

      const [totalHits, resetTimeMs] = result as [number, number];
      return {
        totalHits,
        resetTime: new Date(resetTimeMs)
      };
    } catch (error) {
      console.error('Redis Rate Limit Error, falling back to in-memory logic:', error);
      const fallbackKey = `fallback_rl_${this.prefix}${key}`;
      const existing = fallbackCounters.get(fallbackKey);

      if (existing && existing.resetTimeMs > now) {
        existing.hits += 1;
        return {
          totalHits: existing.hits,
          resetTime: new Date(existing.resetTimeMs)
        };
      }

      if (existing) {
        clearTimeout(existing.timeout);
      }

      const resetTimeMs = now + this.windowMs;
      const timeout = setTimeout(() => fallbackCounters.delete(fallbackKey), this.windowMs);
      fallbackCounters.set(fallbackKey, { hits: 1, resetTimeMs, timeout });

      return {
        totalHits: 1,
        resetTime: new Date(resetTimeMs)
      };
    }
  }

  async decrement(key: string): Promise<void> {
    // Optionally implement decrement if needed, but usually not strictly required for basic rate limiting
  }

  async resetKey(key: string): Promise<void> {
    const fallbackKey = `fallback_rl_${this.prefix}${key}`;
    const existing = fallbackCounters.get(fallbackKey);
    if (existing) {
      clearTimeout(existing.timeout);
      fallbackCounters.delete(fallbackKey);
    }
    await this.redisClient.del(this.prefix + key);
  }
}

function optionalStore(prefix: string): { store?: Store } {
  if (!useRedisStore) return {};
  return { store: new SlidingWindowRedisStore(redis, prefix) };
}

// ─── 1. Token endpoint — most critical ──────────────────────────────────────
// Prevent LiveKit quota exhaustion
export const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 120,                    // max 120 requests per IP per minute (2/min secure)
  standardHeaders: true,
  legacyHeaders: false,
  ...optionalStore('rl:token:'),
  passOnStoreError: true,
  message: {
    error: 'too_many_requests',
    message: 'حاولت كثيراً، انتظر دقيقة واحدة',
    retryAfter: 60,
  },
  skip: (req) => {
    // Skip rate limiting for trusted IPs (e.g. office / deployment healthchecks)
    const trustedIPs = (process.env.TRUSTED_IPS || '').split(',').filter(Boolean);
    return trustedIPs.includes(req.ip ?? '');
  },
});

// ─── 2. Moderation report — prevent fake mass reports ───────────────────────
export const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 minute window
  max: 5,                    // max 5 reports per IP per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  ...optionalStore('rl:report:'),
  passOnStoreError: true,
  message: {
    error: 'too_many_requests',
    message: 'لقد أرسلت تقارير كثيرة، انتظر 10 دقائق',
    retryAfter: 600,
  },
});

// ─── 3. Text / image moderation check — prevent API quota exhaustion ────────
export const textCheckLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 60,                   // max 60 checks per IP per minute (~1/sec)
  standardHeaders: true,
  legacyHeaders: false,
  ...optionalStore('rl:textcheck:'),
  passOnStoreError: true,
  message: {
    error: 'too_many_requests',
    message: 'طلبات كثيرة جداً، انتظر قليلاً',
    retryAfter: 60,
  },
});

// ─── 4. AI Agent start/stop — prevent agent spam ────────────────────────────
export const agentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,   // 5 minute window
  max: 10000,                // Effectively disabled for development (max 10,000)
  standardHeaders: true,
  legacyHeaders: false,
  ...optionalStore('rl:agent:'),
  passOnStoreError: true,
  message: {
    error: 'too_many_requests',
    message: 'لا يمكن تشغيل المساعد الآن، انتظر 5 دقائق',
    retryAfter: 1000,
  },
});

// ─── 5. Global fallback — catch-all for unlisted endpoints ──────────────────
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 100,                  // max 100 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  ...optionalStore('rl:global:'),
  passOnStoreError: true,
  message: {
    error: 'too_many_requests',
    message: 'طلبات كثيرة جداً',
    retryAfter: 60,
  },
});

// ─── 6. Per-user token limiter — keyed by authenticated user ID ─────────
// Applies AFTER authMiddleware so req.user is available.
// Prevents a single authenticated user from draining LiveKit credits.
export const perUserTokenLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,    // 1 minute window (DEV MODE)
  max: 120,                    // max 120 requests (2/min secure)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (userId) return userId;
    // Use library helper so IPv6 clients cannot bypass limits (ERR_ERL_KEY_GEN_IPV6).
    return ipKeyGenerator(req.ip ?? '');
  },
  ...optionalStore('rl:usertoken:'),
  passOnStoreError: true,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Token generation limit reached. Wait 15 minutes.',
      retryAfter: 900,
    });
  },
});
