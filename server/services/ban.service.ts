import { getBanRecord, createBan, removeBan, supabase } from './supabase.service.js';
import { logger } from '../utils/logger.js';
import { BanRecord } from '../types/index.js';

export async function checkIsBanned(
  fingerprint?: string,
  ip?: string,
): Promise<{ banned: boolean; reason?: string; expiresAt?: string } | null> {
  if (!supabase) return null;

  try {
    const { data: bans, error } = await supabase
      .from('banned_users')
      .select('id, reason, banned_at, expires_at')
      .eq('is_active', true)
      .or([
        fingerprint ? `fingerprint.eq.${fingerprint}` : '',
        ip ? `ip_address.eq.${ip}` : ''
      ].filter(Boolean).join(","));

    if (error) throw error;

    const now = new Date();
    const activeBans = (bans || []).filter(b => {
      if (!b.expires_at) return true; // permanent
      return new Date(b.expires_at) > now;
    });

    const expiredIds = (bans || [])
      .filter(b => b.expires_at && new Date(b.expires_at) <= now)
      .map(b => b.id);

    if (expiredIds.length > 0) {
      await supabase.from('banned_users').update({ is_active: false }).in('id', expiredIds);
    }

    if (activeBans.length > 0) {
      const ban = activeBans[0];
      return { banned: true, reason: ban.reason, expiresAt: ban.expires_at };
    }
    return { banned: false };
  } catch (err) {
    logger.error('Ban check error:', err);
    return null;
  }
}

export async function banFingerprintAndAllUsers({
  fingerprint,
  primaryUserId,
  reason,
  metadata,
  ip = null
}: {
  fingerprint?: string,
  primaryUserId?: string | null,
  reason: string,
  metadata: any,
  ip?: string | null
}) {
  if (!supabase) return;

  const { data: existingBan } = await supabase
    .from('banned_users')
    .select('id')
    .eq('fingerprint', fingerprint)
    .eq('is_active', true)
    .single();

  if (!existingBan) {
    await supabase.from('banned_users').insert({
      user_id: primaryUserId || null,
      fingerprint: fingerprint || null,
      ip_address: ip,
      reason: reason,
      banned_by: 'system',
      is_active: true,
      metadata: metadata,
    });
  }

  if (fingerprint) {
    const { data: associatedLogs } = await supabase
      .from('moderation_logs')
      .select('user_id')
      .eq('fingerprint', fingerprint)
      .not('user_id', 'is', null);

    const uniqueUserIds = [...new Set((associatedLogs || []).map(log => log.user_id))];

    for (const uid of uniqueUserIds) {
      if (uid === primaryUserId) continue;

      const { data: userBan } = await supabase
        .from('banned_users')
        .select('id')
        .eq('user_id', uid)
        .eq('is_active', true)
        .limit(1);

      if (!userBan || userBan.length === 0) {
        await supabase.from('banned_users').insert({
          user_id: uid,
          fingerprint: fingerprint,
          ip_address: ip,
          reason: `${reason} (Associated Account)`,
          banned_by: 'system',
          is_active: true,
          metadata: { ...metadata, note: 'Banned due to associated device fingerprint' },
        });
      }
    }
  }
}

export async function banUser(ban: Omit<BanRecord, 'bannedAt'>): Promise<void> {
  await createBan({
    fingerprint: ban.fingerprint,
    ip_address: ban.ip,
    reason: ban.reason,
    banned_by: ban.bannedBy,
  });
  logger.info('User banned', { fingerprint: ban.fingerprint });
}

export async function unbanUser(fingerprint: string): Promise<void> {
  await removeBan(fingerprint);
  logger.info('User unbanned', { fingerprint });
}
