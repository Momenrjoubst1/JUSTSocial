import { vi, beforeAll } from 'vitest';

// Mock Redis client globally
vi.mock('../config/redis-client', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    sadd: vi.fn(),
    srem: vi.fn(),
    smembers: vi.fn(),
    eval: vi.fn(),
    llen: vi.fn().mockResolvedValue(0),
    lpop: vi.fn(),
    rpush: vi.fn(),
    lrange: vi.fn().mockResolvedValue([]),
    lrem: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    call: vi.fn(),
  },
}));

// Mock rate-limit-redis globally to bypass script loading errors
vi.mock('rate-limit-redis', () => ({
  RedisStore: class {
    increment = vi.fn().mockResolvedValue({ totalHits: 1, resetTime: new Date() });
    decrement = vi.fn();
    resetKey = vi.fn();
  }
}));

// Mock Supabase client globally
vi.mock('../services/supabase.service', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://test-url.com' } }),
      })),
    },
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
      range: vi.fn().mockResolvedValue({ data: [] }),
      single: vi.fn().mockResolvedValue({ data: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })),
  },
  getUserById: vi.fn(),
  saveReport: vi.fn(),
  getBanRecord: vi.fn(),
  createBan: vi.fn(),
  removeBan: vi.fn(),
}));

// Silence logger in tests (except errors)
vi.mock('../utils/logger', () => ({
  logger: {
    info:  vi.fn(),
    warn:  vi.fn(),
    error: vi.fn((...args) => console.error(...args)),
    debug: vi.fn(),
  },
  createLogger: vi.fn(() => ({
    info:  vi.fn(),
    error: vi.fn(),
    warn:  vi.fn(),
    debug: vi.fn(),
  })),
}));

// Set required environment variables for tests (immediately so modules don't crash on import)
process.env.LIVEKIT_API_KEY       = 'test-livekit-key';
process.env.LIVEKIT_API_SECRET    = 'test-livekit-secret';
process.env.LIVEKIT_URL           = 'wss://test.livekit.cloud';
process.env.ADMIN_SECRET_KEY      = 'test-admin-key';
process.env.SUPABASE_URL          = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SIGHTENGINE_API_USER  = 'test-user';
process.env.SIGHTENGINE_API_SECRET = 'test-secret';
