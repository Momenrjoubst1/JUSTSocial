import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkIsBanned, banUser, unbanUser, banFingerprintAndAllUsers } from '../../services/ban.service';
import * as supabaseService from '../../services/supabase.service';
import { supabaseBanQueryState } from '../supabase-test-state';
import { makeBan } from '../factories';

describe('ban.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseBanQueryState.reset();
  });

  describe('checkIsBanned', () => {
    it('returns true when ban record exists', async () => {
      const ban = makeBan();
      supabaseBanQueryState.rows = [
        {
          id: 'ban-1',
          reason: ban.reason,
          banned_at: ban.bannedAt,
          expires_at: null,
        },
      ];
      const result = await checkIsBanned('fingerprint-123', '1.2.3.4');
      expect(result).toMatchObject({ banned: true });
    });

    it('returns false when no ban record exists', async () => {
      const result = await checkIsBanned('fingerprint-123', '1.2.3.4');
      expect(result?.banned).toBe(false);
    });

    it('returns null (fail open) when Supabase throws', async () => {
      supabaseBanQueryState.rejectError = new Error('DB connection failed');
      const result = await checkIsBanned('fingerprint-123', '1.2.3.4');
      expect(result).toBeNull();
    });

    it('returns false when fingerprint is empty string', async () => {
      const result = await checkIsBanned('', '1.2.3.4');
      expect(result?.banned).toBe(false);
    });

    it('checks both fingerprint AND ip (either match = banned)', async () => {
      supabaseBanQueryState.rows = [
        {
          id: 'ban-1',
          reason: 'test',
          banned_at: new Date().toISOString(),
          expires_at: null,
        },
      ];
      const result = await checkIsBanned('my-fingerprint', '1.2.3.4');
      expect(result).toMatchObject({ banned: true });
    });

    it('returns null (fail open) when Supabase times out', async () => {
      supabaseBanQueryState.rejectError = new Error('connection timeout');
      const result = await checkIsBanned('fp-123', '1.2.3.4');
      expect(result).toBeNull();
    });

    it('returns false when no active ban rows', async () => {
      supabaseBanQueryState.rows = [];
      const result = await checkIsBanned('fp-123', '1.2.3.4');
      expect(result?.banned).toBe(false);
    });
  });

  describe('banUser', () => {
    it('calls createBan with correct data', async () => {
      vi.mocked(supabaseService.createBan).mockResolvedValueOnce(undefined);
      const ban = makeBan();
      await banUser(ban);
      expect(supabaseService.createBan).toHaveBeenCalledWith({
        fingerprint: ban.fingerprint,
        ip_address: ban.ip,
        reason: ban.reason,
        banned_by: ban.bannedBy,
      });
    });

    it('throws when Supabase createBan fails', async () => {
      vi.mocked(supabaseService.createBan).mockRejectedValueOnce(
        new Error('unique constraint violation'),
      );
      const ban = makeBan();
      await expect(banUser(ban)).rejects.toThrow();
    });
  });

  describe('unbanUser', () => {
    it('calls removeBan with fingerprint', async () => {
      vi.mocked(supabaseService.removeBan).mockResolvedValueOnce(undefined);
      await unbanUser('fingerprint-123');
      expect(supabaseService.removeBan).toHaveBeenCalledWith('fingerprint-123');
    });

    it('does not throw when fingerprint does not exist', async () => {
      vi.mocked(supabaseService.removeBan).mockResolvedValueOnce(undefined);
      await expect(unbanUser('nonexistent-fp')).resolves.not.toThrow();
    });

    it('throws when Supabase removeBan fails', async () => {
      vi.mocked(supabaseService.removeBan).mockRejectedValueOnce(new Error('DB error'));
      await expect(unbanUser('fp-123')).rejects.toThrow();
    });
  });

  describe('banFingerprintAndAllUsers', () => {
    it('bans fingerprint and associated users', async () => {
      const fingerprint = 'fp-test';
      const primaryUserId = 'user-1';

      await banFingerprintAndAllUsers({
        fingerprint,
        primaryUserId,
        reason: 'toxicity',
        metadata: {},
      });

      expect(supabaseService.supabase.from).toHaveBeenCalledWith('banned_users');
    });
  });
});
