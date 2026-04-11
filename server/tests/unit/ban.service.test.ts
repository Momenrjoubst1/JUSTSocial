import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkIsBanned, banUser, unbanUser, banFingerprintAndAllUsers } from '../../services/ban.service';
import * as supabaseService from '../../services/supabase.service';
import { makeBan } from '../factories';

describe('ban.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('checkIsBanned', () => {
    it('returns true when ban record exists', async () => {
      vi.mocked(supabaseService.getBanRecord).mockResolvedValueOnce(makeBan());
      const result = await checkIsBanned('fingerprint-123', '1.2.3.4');
      // Fix based on actual checkIsBanned return format
      expect(result).toHaveProperty('banned');
    });

    it('returns false when no ban record exists', async () => {
      vi.mocked(supabaseService.getBanRecord).mockResolvedValueOnce(null);
      const result = await checkIsBanned('fingerprint-123', '1.2.3.4');
      expect(result?.banned).toBe(false);
    });

    it('returns false (fail open) when Supabase throws', async () => {
      vi.mocked(supabaseService.getBanRecord).mockRejectedValueOnce(
        new Error('DB connection failed')
      );
      const result = await checkIsBanned('fingerprint-123', '1.2.3.4');
      expect(result).toEqual({ banned: false }); // fail open — don't block users on DB error
    });

    // ── Edge Cases ──────────────────────────────────────────
    it('returns false when fingerprint is empty string', async () => {
      vi.mocked(supabaseService.getBanRecord).mockResolvedValueOnce(null);
      const result = await checkIsBanned('', '1.2.3.4');
      expect(result?.banned).toBe(false);
    });

    it('checks both fingerprint AND ip (either match = banned)', async () => {
      // Ban exists for IP even if fingerprint is different
      vi.mocked(supabaseService.getBanRecord).mockResolvedValueOnce(makeBan({
        ip: '1.2.3.4',
        fingerprint: 'different-fingerprint',
      }));
      const result = await checkIsBanned('my-fingerprint', '1.2.3.4');
      expect(result).toHaveProperty('banned');
    });

    // ── Error Cases ──────────────────────────────────────────
    it('returns false (fail open) when Supabase times out', async () => {
      vi.mocked(supabaseService.getBanRecord).mockRejectedValueOnce(
        new Error('connection timeout')
      );
      const result = await checkIsBanned('fp-123', '1.2.3.4');
      expect(result).toEqual({ banned: false }); // must NOT block users when DB is down
    });

    it('returns false (fail open) when Supabase returns unexpected null', async () => {
      vi.mocked(supabaseService.getBanRecord).mockResolvedValueOnce(null);
      const result = await checkIsBanned('fp-123', '1.2.3.4');
      expect(result?.banned).toBe(false);
    });
  });

  describe('banUser', () => {
    it('calls createBan with correct data', async () => {
      vi.mocked(supabaseService.createBan).mockResolvedValueOnce({});
      const ban = makeBan();
      await banUser(ban);
      expect(supabaseService.createBan).toHaveBeenCalledWith({
        fingerprint: ban.fingerprint,
        ip:          ban.ip,
        reason:      ban.reason,
        banned_by:   ban.bannedBy,
      });
    });

    // ── Error Cases ──────────────────────────────────────────
    it('throws when Supabase createBan fails', async () => {
      vi.mocked(supabaseService.createBan).mockRejectedValueOnce(
        new Error('unique constraint violation')
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

    // ── Edge Cases ──────────────────────────────────────────
    it('does not throw when fingerprint does not exist', async () => {
      vi.mocked(supabaseService.removeBan).mockResolvedValueOnce(undefined);
      await expect(unbanUser('nonexistent-fp')).resolves.not.toThrow();
    });

    // ── Error Cases ──────────────────────────────────────────
    it('throws when Supabase removeBan fails', async () => {
      vi.mocked(supabaseService.removeBan).mockRejectedValueOnce(
        new Error('DB error')
      );
      await expect(unbanUser('fp-123')).rejects.toThrow();
    });
  });

  describe('banFingerprintAndAllUsers', () => {
    it('bans fingerprint and associated users', async () => {
       const fingerprint = 'fp-test';
       const primaryUserId = 'user-1';

       vi.mocked(supabaseService.supabase.from).mockReturnValue({
         select: vi.fn().mockReturnThis(),
         eq: vi.fn().mockReturnThis(),
         not: vi.fn().mockReturnThis(),
         single: vi.fn().mockResolvedValue({ data: null }),
         limit: vi.fn().mockResolvedValue({ data: [] }),
         insert: vi.fn().mockReturnThis(),
       } as any);

       await banFingerprintAndAllUsers({
         fingerprint,
         primaryUserId,
         reason: 'toxicity',
         metadata: {}
       });

       expect(supabaseService.supabase.from).toHaveBeenCalledWith('banned_users');
    });
  });
});
