import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { adminMiddleware } from '../../middleware/admin.middleware';

describe('admin.middleware', () => {
  it('calls next() when admin key is correct', () => {
    const req = {
      headers: { 'x-admin-key': 'test-admin-key' },
    } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    adminMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when admin key is wrong', () => {
    const req = {
      headers: { 'x-admin-key': 'wrong-key' },
    } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    adminMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when admin key is missing', () => {
    const req = { headers: {} } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    adminMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
