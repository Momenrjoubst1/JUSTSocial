/**
 * Global Vitest setup for server-side tests: in-memory Redis + Supabase doubles
 * so importing `server/index` or services does not require Docker or real keys.
 */
import { beforeEach, vi } from 'vitest';
import { supabaseBanQueryState } from './supabase-test-state.js';

/* ── Redis (ioredis) ─────────────────────────────────────────────────── */
const redisMock: Record<string, unknown> = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  setex: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  sadd: vi.fn().mockResolvedValue(1),
  srem: vi.fn().mockResolvedValue(1),
  smembers: vi.fn().mockResolvedValue([]),
  exists: vi.fn().mockResolvedValue(0),
  eval: vi.fn().mockResolvedValue(0),
  lrange: vi.fn().mockResolvedValue([]),
  rpush: vi.fn().mockResolvedValue(1),
  lrem: vi.fn().mockResolvedValue(1),
  on: vi.fn(),
  defineCommand: vi.fn((name: string) => {
    if (name === 'slidingWindowRateLimit') {
      redisMock.slidingWindowRateLimit = vi
        .fn()
        .mockResolvedValue([1, Date.now() + 120_000]);
    }
  }),
};

vi.mock('../src/config/redis-client.js', () => ({
  default: redisMock,
}));

vi.mock('rate-limit-redis', () => ({
  RedisStore: class {
    increment = vi.fn().mockResolvedValue({ totalHits: 1, resetTime: new Date() });
    decrement = vi.fn();
    resetKey = vi.fn();
  },
}));

/* ── Supabase service module ─────────────────────────────────────────── */
function createSupabaseFromChain() {
  const chain = {} as Record<string, unknown> & {
    then?: (onFulfilled: (v: unknown) => unknown) => unknown;
  };

  const banRowsResult = () => {
    if (supabaseBanQueryState.rejectError) {
      return Promise.reject(supabaseBanQueryState.rejectError);
    }
    return Promise.resolve({ data: supabaseBanQueryState.rows, error: null });
  };

  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.gt = vi.fn(() => chain);
  chain.gte = vi.fn(() => chain);
  chain.or = vi.fn(() => ({
    then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
      return banRowsResult().then(onFulfilled, onRejected);
    },
  }));
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => ({
    then: (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled),
  }));
  chain.range = vi.fn(() => ({
    then: (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled),
  }));
  chain.not = vi.fn(() => ({
    then: (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled),
  }));
  chain.single = vi.fn(() => {
    if (supabaseBanQueryState.rejectError) {
      return Promise.reject(supabaseBanQueryState.rejectError);
    }
    return Promise.resolve({ data: null, error: null });
  });
  chain.maybeSingle = vi.fn(() => {
    if (supabaseBanQueryState.rejectError) {
      return Promise.reject(supabaseBanQueryState.rejectError);
    }
    return Promise.resolve({ data: null, error: null });
  });
  chain.insert = vi.fn(() => Promise.resolve({ data: null, error: null }));
  chain.update = vi.fn(() => ({
    in: vi.fn(() => Promise.resolve({ data: null, error: null })),
    eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
  }));

  chain.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null, count: 0 }).then(onFulfilled);

  return chain;
}

const authGetUser = vi.fn();
const getBanRecord = vi.fn();
const createBan = vi.fn(async () => undefined);
const removeBan = vi.fn(async () => undefined);
const getUserById = vi.fn();
const saveReport = vi.fn();

const fromFn = vi.fn(() => createSupabaseFromChain());

vi.mock('../src/services/supabase.service.js', () => ({
  supabase: {
    auth: { getUser: authGetUser },
    from: fromFn,
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://vitest.local/evidence.jpg' } })),
      })),
    },
  },
  getUserById,
  saveReport,
  getBanRecord,
  createBan,
  removeBan,
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

process.env.LIVEKIT_API_KEY = 'test-livekit-key';
process.env.LIVEKIT_API_SECRET = 'test-livekit-secret';
process.env.LIVEKIT_URL = 'wss://test.livekit.cloud';
process.env.ADMIN_SECRET_KEY = 'test-admin-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SIGHTENGINE_API_USER = 'test-user';
process.env.SIGHTENGINE_API_SECRET = 'test-secret';

beforeEach(() => {
  supabaseBanQueryState.reset();
});

export { redisMock, authGetUser, fromFn, getBanRecord, createBan, removeBan };


