import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import * as supabaseService from '../../services/supabase.service.js';

function makeReqRes(headers: Record<string, string> = {}) {
  const req = { headers } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json:   vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('auth.middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls next() when token is valid', async () => {
    vi.mocked(supabaseService.supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: 'user-123', email: 'test@test.com' } },
      error: null,
    } as never);

    const { req, res, next } = makeReqRes({
      authorization: 'Bearer valid-token',
    });

    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req as Request & { userId: string }).userId).toBe('user-123');
  });

  it('returns 401 when no authorization header', async () => {
    const { req, res, next } = makeReqRes();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', async () => {
    vi.mocked(supabaseService.supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Invalid token'),
    } as never);

    const { req, res, next } = makeReqRes({
      authorization: 'Bearer invalid-token',
    });

    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  describe('auth.middleware — Edge Cases', () => {
    it('returns 401 when Bearer token is empty string', async () => {
      const { req, res, next } = makeReqRes({
        authorization: 'Bearer ',
      });
      await authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 401 when authorization uses wrong scheme (Basic)', async () => {
      const { req, res, next } = makeReqRes({
        authorization: 'Basic dXNlcjpwYXNz',
      });
      await authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('auth.middleware — Error Cases', () => {
    it('returns 401 when Supabase throws unexpectedly', async () => {
      vi.mocked(supabaseService.supabase.auth.getUser).mockRejectedValueOnce(
        new Error('Supabase internal error')
      );

      const { req, res, next } = makeReqRes({
        authorization: 'Bearer some-token',
      });

      await authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when token is expired', async () => {
      vi.mocked(supabaseService.supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: new Error('JWT expired'),
      } as never);

      const { req, res, next } = makeReqRes({
        authorization: 'Bearer expired-token',
      });

      await authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
