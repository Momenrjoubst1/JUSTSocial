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

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../config/redis-client.js';

const useRedisStore = process.env.RATE_LIMIT_STORE === 'redis';

/**
 * Build a RedisStore for a given prefix.
 * Uses ioredis's `.call()` which maps to raw Redis commands.
 */
function makeStore(prefix: string): RedisStore {
  return new RedisStore({
    // rate-limit-redis v4 expects sendCommand to return Promise<T>
    sendCommand: (...args: string[]) =>
      redis.call(args[0], ...args.slice(1)) as Promise<number>,
    prefix,
  });
}

function optionalStore(prefix: string): { store?: RedisStore } {
  if (!useRedisStore) return {};
  return { store: makeStore(prefix) };
}

// ─── 1. Token endpoint — most critical ──────────────────────────────────────
// Prevent LiveKit quota exhaustion
export const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 10,                   // max 10 token requests per IP per minute
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
  max: 3,                    // max 3 agent starts per IP per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  ...optionalStore('rl:agent:'),
  passOnStoreError: true,
  message: {
    error: 'too_many_requests',
    message: 'لا يمكن تشغيل المساعد الآن، انتظر 5 دقائق',
    retryAfter: 300,
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
  windowMs: 15 * 60 * 1000,   // 15 minute window
  max: 10,                    // max 10 token requests per user per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as any).user?.id;
    if (userId) return userId;
    const ip = req.ip ?? '';
    return ip.startsWith('::ffff:') ? ip.slice(7) : ip || 'unknown';
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

