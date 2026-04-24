import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

vi.mock('../../src/middleware/auth.middleware.js', () => ({
  authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { user?: { id: string; email: string }; userId?: string }).user = {
      id: 'vitest-user',
      email: 'vitest@example.com',
    };
    (req as Request & { userId?: string }).userId = 'vitest-user';
    next();
  },
}));

import request from 'supertest';
import app from '../../src/index';
import * as turnCredentials from '../../src/config/turn-credentials';

describe('GET /api/ice-servers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns ice servers list', async () => {
    vi.spyOn(turnCredentials, 'getTurnCredentials').mockResolvedValueOnce([
      { urls: 'stun:stun.l.google.com:19302' },
    ]);

    const res = await request(app).get('/api/ice-servers');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('iceServers');
    expect(Array.isArray(res.body.iceServers)).toBe(true);
  });

  it('returns fallback STUN when Twilio fails', async () => {
    vi.spyOn(turnCredentials, 'getTurnCredentials').mockRejectedValueOnce(
      new Error('Twilio API down')
    );

    const res = await request(app).get('/api/ice-servers');

    expect(res.status).toBe(200);
    expect(res.body.iceServers).toBeDefined();
  });

  it('returns exactly 1 ICE server when fallback is used', async () => {
    vi.spyOn(turnCredentials, 'getTurnCredentials').mockRejectedValueOnce(
      new Error('API failure')
    );
    const res = await request(app).get('/api/ice-servers');
    expect(res.body.iceServers).toHaveLength(1);
    expect(res.body.iceServers[0].urls).toContain('stun:');
  });
});


