/**
 * ════════════════════════════════════════════════════════════════════════════════
 * Mock Redis Client — In-memory fallback for development without Redis
 * ════════════════════════════════════════════════════════════════════════════════
 */

class MockRedis {
  private data = new Map<string, string>();
  private sets = new Map<string, Set<string>>();
  private zsets = new Map<string, Map<string, number>>();
  private expiries = new Map<string, number>();

  constructor() {
    console.log('⚠️  Using Mock Redis (In-Memory). Install Redis for production use.');
  }

  private checkExpiry(key: string) {
    const expiry = this.expiries.get(key);
    if (expiry && Date.now() > expiry) {
      this.data.delete(key);
      this.sets.delete(key);
      this.zsets.delete(key);
      this.expiries.delete(key);
      return true;
    }
    return false;
  }

  // ─── String Operations ─────────────────────────────────────────────────────

  async get(key: string): Promise<string | null> {
    if (this.checkExpiry(key)) return null;
    return this.data.get(key) ?? null;
  }

  async set(key: string, value: string, ...args: any[]): Promise<'OK' | null> {
    const upperArgs = args.map((a: any) => (typeof a === 'string' ? a.toUpperCase() : a));

    // NX: only set if key does NOT exist
    if (upperArgs.includes('NX') && this.data.has(key) && !this.checkExpiry(key)) {
      return null;
    }

    this.data.set(key, value);

    // EX <seconds>
    const exIdx = upperArgs.indexOf('EX');
    if (exIdx !== -1) {
      const ttl = Number(args[exIdx + 1]);
      this.expiries.set(key, Date.now() + ttl * 1000);
    }

    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.data.set(key, value);
    this.expiries.set(key, Date.now() + seconds * 1000);
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.data.delete(key) || this.sets.delete(key) || this.zsets.delete(key)) count++;
      this.expiries.delete(key);
    }
    return count;
  }

  async exists(key: string): Promise<number> {
    if (this.checkExpiry(key)) return 0;
    return (this.data.has(key) || this.sets.has(key) || this.zsets.has(key)) ? 1 : 0;
  }

  // ─── Set Operations ────────────────────────────────────────────────────────

  async sadd(key: string, ...values: string[]): Promise<number> {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    const set = this.sets.get(key)!;
    let added = 0;
    for (const v of values) {
      if (!set.has(v)) { set.add(v); added++; }
    }
    return added;
  }

  async smembers(key: string): Promise<string[]> {
    if (this.checkExpiry(key)) return [];
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async srem(key: string, ...values: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    let removed = 0;
    for (const v of values) {
      if (set.delete(v)) removed++;
    }
    return removed;
  }

  // ─── Sorted Set Operations (for rate limiter) ──────────────────────────────

  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.zsets.has(key)) this.zsets.set(key, new Map());
    const zset = this.zsets.get(key)!;
    const isNew = !zset.has(member);
    zset.set(member, score);
    return isNew ? 1 : 0;
  }

  async zcard(key: string): Promise<number> {
    return this.zsets.get(key)?.size ?? 0;
  }

  async zremrangebyscore(key: string, min: string | number, max: string | number): Promise<number> {
    const zset = this.zsets.get(key);
    if (!zset) return 0;
    const minVal = min === '-inf' ? -Infinity : Number(min);
    const maxVal = max === '+inf' ? Infinity : Number(max);
    let removed = 0;
    for (const [member, score] of zset) {
      if (score >= minVal && score <= maxVal) {
        zset.delete(member);
        removed++;
      }
    }
    return removed;
  }

  async zrange(key: string, start: number, stop: number, ...args: any[]): Promise<any[]> {
    const zset = this.zsets.get(key);
    if (!zset || zset.size === 0) return [];
    const sorted = Array.from(zset.entries()).sort((a, b) => a[1] - b[1]);
    const realStop = stop < 0 ? sorted.length + stop + 1 : stop + 1;
    const sliced = sorted.slice(start, realStop);
    const withScores = args.map((a: any) => String(a).toUpperCase()).includes('WITHSCORES');
    if (withScores) {
      const result: any[] = [];
      for (const [member, score] of sliced) {
        result.push(member, String(score));
      }
      return result;
    }
    return sliced.map(([member]) => member);
  }

  async pexpire(key: string, ms: number): Promise<number> {
    if (this.data.has(key) || this.sets.has(key) || this.zsets.has(key) || this.lists.has(key)) {
      this.expiries.set(key, Date.now() + ms);
      return 1;
    }
    return 0;
  }

  // ─── List Operations (for moderation queue) ────────────────────────────────

  private lists = new Map<string, string[]>();

  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.lists.has(key)) this.lists.set(key, []);
    const list = this.lists.get(key)!;
    list.unshift(...values);
    return list.length;
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    if (!this.lists.has(key)) this.lists.set(key, []);
    const list = this.lists.get(key)!;
    list.push(...values);
    return list.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.lists.get(key);
    if (!list) return [];
    const realStop = stop < 0 ? list.length + stop + 1 : stop + 1;
    return list.slice(start, realStop);
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    const list = this.lists.get(key);
    if (!list) return 0;
    let removed = 0;
    const absCount = Math.abs(count) || list.length;
    for (let i = list.length - 1; i >= 0 && removed < absCount; i--) {
      if (list[i] === value) {
        list.splice(i, 1);
        removed++;
      }
    }
    return removed;
  }

  // ─── Lua Script Execution ──────────────────────────────────────────────────

  async eval(script: string, numKeys: number, ...args: any[]): Promise<any> {
    const keys = args.slice(0, numKeys);
    const scriptArgs = args.slice(numKeys);

    // addParticipantScript
    if (script.includes('#room.participants >= 2') || script.includes('room.participants >= 2')) {
      const key = keys[0];
      const identity = scriptArgs[0];
      const ttl = Number(scriptArgs[1]);

      const raw = await this.get(key);
      if (!raw) return 0;

      const room = JSON.parse(raw);
      if (room.participants.length >= 2) return 0;
      if (room.participants.includes(identity)) return 1;

      room.participants.push(identity);
      await this.setex(key, ttl, JSON.stringify(room));
      return 1;
    }

    // removeParticipantScript
    if (script.includes('p ~= identity')) {
      const key = keys[0];
      const roomName = scriptArgs[0];
      const identity = scriptArgs[1];
      const country = scriptArgs[2];

      const raw = await this.get(key);
      if (!raw) return 0;

      const room = JSON.parse(raw);
      room.participants = room.participants.filter((p: string) => p !== identity);

      if (room.participants.length === 0) {
        await this.del(key);
        await this.srem('rooms:active', roomName);
        await this.srem(`country:${country}`, roomName);
        return 0;
      } else {
        await this.setex(key, 4 * 60 * 60, JSON.stringify(room));
        return room.participants.length;
      }
    }

    // slidingWindowRateLimit (from rate-limiters.ts)
    if (script.includes('ZREMRANGEBYSCORE') && script.includes('ZADD') && script.includes('ZCARD')) {
      const key = keys[0];
      const now = Number(scriptArgs[0]);
      const window = Number(scriptArgs[1]);
      const member = scriptArgs[2];

      await this.zremrangebyscore(key, '-inf', now - window);
      await this.zadd(key, now, member);
      await this.pexpire(key, window);

      const currentHits = await this.zcard(key);
      const oldest = await this.zrange(key, 0, 0, 'WITHSCORES');
      const oldestScore = oldest.length >= 2 ? Number(oldest[1]) : now;

      return [currentHits, oldestScore + window];
    }

    console.warn('MockRedis: Unsupported Lua script');
    return null;
  }

  // defineCommand — used by SlidingWindowRedisStore
  defineCommand(name: string, opts: { numberOfKeys: number; lua: string }) {
    const numKeys = opts.numberOfKeys;
    const lua = opts.lua;
    (this as any)[name] = async (...args: any[]) => {
      return this.eval(lua, numKeys, ...args);
    };
  }

  // ─── Event emitter (no-op for mock) ────────────────────────────────────────
  on(event: string, callback: () => void) {
    // Emit connect immediately for compatibility
    if (event === 'connect') {
      setTimeout(() => callback(), 0);
    }
    return this;
  }
}

export default MockRedis;
