import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

vi.mock('../../middleware/auth.middleware.js', () => ({
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
import app from '../../index';
import * as textModerator from '../../utils/text-moderator';
import * as moderationService from '../../services/moderation.service';

vi.mock('../../services/moderation.service', () => ({
  checkWithSightengine: vi.fn()
}));

describe('POST /api/moderation/moderate-text', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns allowed:true for clean text', async () => {
    vi.spyOn(textModerator, 'analyzeText').mockResolvedValueOnce({
      allowed: true,
      reason: 'clean',
    });

    const res = await request(app)
      .post('/api/moderation/moderate-text')
      .send({ text: 'مرحبا' });

    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(true);
  });

  it('returns 400 when text field is missing', async () => {
    const res = await request(app)
      .post('/api/moderation/moderate-text')
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when text exceeds 2000 characters', async () => {
    const res = await request(app)
      .post('/api/moderation/moderate-text')
      .send({ text: 'a'.repeat(2001) });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/moderation/admin/moderation-queue', () => {
  it('returns 403 without admin key', async () => {
    const res = await request(app).get('/api/moderation/admin/moderation-queue');
    expect(res.status).toBe(403);
  });

  it('returns queue with valid admin key', async () => {
    const res = await request(app)
      .get('/api/moderation/admin/moderation-queue')
      .set('x-admin-key', 'test-admin-key');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
    expect(res.body).toHaveProperty('items');
  });

  describe('GET /api/moderation/admin/moderation-queue — Edge Cases', () => {
    it('returns empty queue when no items queued', async () => {
      // Mocking redis was done in setup automatically, returning []
      const res = await request(app)
        .get('/api/moderation/admin/moderation-queue')
        .set('x-admin-key', 'test-admin-key');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
      expect(res.body.items).toHaveLength(0);
    });
  });
});

  describe('POST /api/moderation/check-text — Edge Cases', () => {
    it('returns 400 when text is null', async () => {
      const res = await request(app)
        .post('/api/moderation/moderate-text')
        .send({ text: null });
      expect(res.status).toBe(400);
    });

    it('returns 400 when text is a number', async () => {
      const res = await request(app)
        .post('/api/moderation/moderate-text')
        .send({ text: 12345 });
      expect(res.status).toBe(400);
    });

    it('handles exactly 2000 character text', async () => {
      vi.spyOn(textModerator, 'analyzeText').mockResolvedValueOnce({
        allowed: true,
        reason: 'clean',
      });

      const res = await request(app)
        .post('/api/moderation/moderate-text')
        .send({ text: 'a'.repeat(2000) });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/moderation/check-text — Error Cases', () => {
    it('returns 500 when analyzeText throws unexpectedly', async () => {
      vi.spyOn(textModerator, 'analyzeText').mockRejectedValueOnce(
        new Error('Unexpected crash')
      );

      const res = await request(app)
        .post('/api/moderation/moderate-text')
        .send({ text: 'مرحبا' });

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/moderation/check-ban', () => {
    it('returns banned status', async () => {
      const res = await request(app)
        .get('/api/moderation/check-ban')
        .query({ fingerprint: 'fp-123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('banned');
    });
  });

  describe('POST /api/moderation/report', () => {
    it('returns 400 when reporterId is missing', async () => {
      const res = await request(app)
        .post('/api/moderation/report')
        .send({ reportedUserId: 'user-1' });
      expect(res.status).toBe(400);
    });

    it('submits report with valid data', async () => {
      const res = await request(app)
        .post('/api/moderation/report')
        .send({ reporterId: 'reporter-1', reportedUserId: 'user-2', reason: 'bad' });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('analyzes imageBase64 if provided', async () => {
      // Very basic fetch mock
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ status: 'success', offensive: { prob: 0.9, offensive_gesture: 0.9 } })
      });
      const res = await request(app)
        .post('/api/moderation/report')
        .send({ reporterId: 'rep-1', imageBase64: 'aGVsbG8=' });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/moderation/moderate', () => {
    it('returns 400 when imageBase64 is missing', async () => {
      const res = await request(app)
        .post('/api/moderation/moderate')
        .send({ identity: 'user-1' });
      expect(res.status).toBe(400);
    });

    it('returns action none on success when low risk', async () => {
      vi.spyOn(moderationService, 'checkWithSightengine').mockResolvedValueOnce({
        safe: true,
        raw: { status: 'success', nudity: { safe: 0.99 }, offensive: { prob: 0.01 } }
      });
      const res = await request(app)
        .post('/api/moderation/moderate')
        .send({ imageBase64: 'aGVsbG8=', roomName: 'room-1', identity: 'user-1' });
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('none');
    });

    it('returns banned when high risk (fail-closed)', async () => {
      vi.spyOn(moderationService, 'checkWithSightengine').mockResolvedValueOnce({
        safe: false,
        raw: { status: 'success', nudity: { safe: 0.1, sexual_activity: 0.9 } }
      });
      const res = await request(app)
        .post('/api/moderation/moderate')
        .send({ imageBase64: 'aGVsbG8=', roomName: 'room-1', identity: 'user-1' });
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('banned');
    });
  });

  describe('GET /api/moderation/admin/*', () => {
    it('GET /admin/flagged returns list', async () => {
      const res = await request(app)
        .get('/api/moderation/admin/flagged')
        .set('x-admin-key', 'test-admin-key');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.logs)).toBe(true);
    });

    it('GET /admin/bans returns list', async () => {
      const res = await request(app)
        .get('/api/moderation/admin/bans')
        .set('x-admin-key', 'test-admin-key');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.bans)).toBe(true);
    });

    it('POST /admin/unban returns ok', async () => {
      const res = await request(app)
        .post('/api/moderation/admin/unban')
        .set('x-admin-key', 'test-admin-key')
        .send({ banId: 'ban-123' });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('POST /admin/ban returns ok', async () => {
      const res = await request(app)
        .post('/api/moderation/admin/ban')
        .set('x-admin-key', 'test-admin-key')
        .send({ userId: 'user-1', reason: 'manual' });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('GET /admin/reports returns list', async () => {
      const res = await request(app)
        .get('/api/moderation/admin/reports')
        .set('x-admin-key', 'test-admin-key');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.reports)).toBe(true);
    });

    it('GET /admin/stats returns counts', async () => {
      const res = await request(app)
        .get('/api/moderation/admin/stats')
        .set('x-admin-key', 'test-admin-key');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('activeBans');
    });
  });
