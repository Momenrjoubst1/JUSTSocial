import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import { reportLimiter, textCheckLimiter } from '../middleware/rate-limiters.js';
import { asyncHandler } from '../utils/async-handler.js';
import { supabase } from '../services/supabase.service.js';
import { checkIsBanned, banFingerprintAndAllUsers } from '../services/ban.service.js';
import { logger } from '../utils/logger.js';
import { checkWithSightengine } from '../services/moderation.service.js';
import { analyzeText } from '../utils/text-moderator.js';
import redis from '../config/redis-client.js';
import { RoomServiceClient } from 'livekit-server-sdk';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { reportSchema, moderateSchema } from '../validators/schemas.js';

const router = Router();
const QUEUE_KEY = 'moderation:queue';

function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

let roomService: RoomServiceClient | null = null;
if (LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET) {
  roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

// 1. BAN CHECK
router.get('/check-ban', asyncHandler(async (req: Request, res: Response) => {
  const fingerprint = req.query.fingerprint as string;
  const ip = getClientIP(req);

  const banResult = await checkIsBanned(fingerprint, ip);
  if (banResult && banResult.banned) {
    res.json(banResult);
  } else {
    res.json({ banned: false });
  }
}));

// 2. REPORT USER
router.post('/report', reportLimiter, validate(reportSchema), asyncHandler(async (req: Request, res: Response) => {
  if (!supabase) { res.status(503).json({
    success: false,
    code: 'SERVICE_UNAVAILABLE',
    message: 'Moderation unavailable'
  }); return; }

  const {
    reporterId, reportedUserId, reportedIdentity, reportedFingerprint, reason, description, roomName, livekitRoom, livekitIdentity, imageBase64
  } = req.body;
  const ip = getClientIP(req);

  if (!reporterId) {
    return res.status(400).json({
      success: false,
      code: 'BAD_REQUEST',
      message: 'reporterId is required'
    });
  }

  let riskScore = 0;
  let riskCategory = 'safe';
  let screenshotUrl = null;

  if (imageBase64 && process.env.SIGHTENGINE_API_USER) {
    try {
      const byteCharacters = atob(imageBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('models', 'offensive,wad');
      formData.append('api_user', process.env.SIGHTENGINE_API_USER);
      formData.append('api_secret', process.env.SIGHTENGINE_API_SECRET || '');
      formData.append('media', blob, 'capture.jpg');

      const sightRes = await fetch('https://api.sightengine.com/1.0/check.json', { method: 'POST', body: formData });

      if (sightRes.ok) {
        const result = await sightRes.json();
        if (result.status !== 'failure') {
          const gestureMiddleFinger = result.offensive?.middle_finger || result.wad?.middle_finger || 0;
          const gestureOffensive = result.offensive?.offensive_gesture || result.wad?.offensive_gesture || 0;
          riskScore = Math.max(gestureMiddleFinger, gestureOffensive);
        }
      }

      if (riskScore > 0.80) {
        riskCategory = 'offensive_gesture';
        const fileName = `screenshot_evidence_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jpg`;
        const buffer = Buffer.from(imageBase64, 'base64');
        const { error: uploadErr } = await supabase.storage.from('moderation-evidence').upload(fileName, buffer, { contentType: 'image/jpeg', upsert: false });
        if (!uploadErr) {
          const { data: publicUrlData } = supabase.storage.from('moderation-evidence').getPublicUrl(fileName);
          screenshotUrl = publicUrlData?.publicUrl || null;
        }
      }
    } catch (err) {
      logger.error('Failed to upload moderation evidence:', err);
    }
  }

  await supabase.from('reports').insert({
    reporter_id: reporterId,
    reported_user_id: reportedUserId || null,
    reported_identity: reportedIdentity || null,
    reported_fingerprint: reportedFingerprint || null,
    reason: riskScore > 0.80 ? 'ai_detected_offensive_gesture' : (reason || 'inappropriate_content'),
    description: riskScore > 0.80 ? `AI auto-detected offensive gesture. ${description || ''}` : (description || null),
    room_name: roomName || null,
  });

  if (riskScore > 0.80) {
    await banFingerprintAndAllUsers({
      fingerprint: reportedFingerprint,
      primaryUserId: reportedUserId,
      reason: 'ai_moderation_one_strike_gesture',
      metadata: { risk_score: riskScore, risk_category: riskCategory, report_count: 1, evidence_url: screenshotUrl },
      ip: null
    });

    const targetRoom = roomName || livekitRoom;
    const targetIdentity = reportedIdentity || livekitIdentity;
    if (roomService && targetRoom && targetIdentity) {
       await roomService.removeParticipant(targetRoom, targetIdentity).catch(() => {});
    }
    return res.json({ ok: true, autoBanned: true, reportCount: 1 });
  }

  res.json({ ok: true, autoBanned: false, reportCount: 1 });
}));

// 3. MODERATE SCREENSHOT
router.post('/moderate', textCheckLimiter, validate(moderateSchema), asyncHandler(async (req: Request, res: Response) => {
  if (!supabase || !process.env.SIGHTENGINE_API_USER) {
    return res.json({ action: 'none', score: 0 });
  }

  const { imageBase64, identity, fingerprint, userId, roomName } = req.body;
  const ip = getClientIP(req);

  if (!imageBase64) return res.status(400).json({
    success: false,
    code: 'BAD_REQUEST',
    message: 'imageBase64 is required'
  });

  let screenshotUrl = null;
  let uploadedScreenshot = false;

  const modResult = await checkWithSightengine(imageBase64, roomName || 'unknown', identity || 'unknown');

  if (modResult.queued) return res.json({ action: 'none', score: 0, queued: true });
  if (modResult.blocked) return res.json({ action: 'banned', score: 1, category: 'api_unavailable', blocked: true });

  const { raw: result, safe } = modResult;
  let riskScore = 0;
  let riskCategory = 'safe';

  if (result) {
    const nudityScore = Math.max(result.nudity?.sexual_activity || 0, result.nudity?.sexual_display || 0, result.nudity?.erotica || 0);
    const offensiveScore = result.offensive?.prob || result.wad?.middle_finger || result.offensive?.middle_finger || 0;
    riskScore = Math.max(nudityScore, offensiveScore);

    if (nudityScore > offensiveScore && nudityScore > 0.5) riskCategory = 'nudity';
    else if (offensiveScore > 0.5) riskCategory = 'offensive';
  } else {
    riskScore = safe ? 0 : 1;
    riskCategory = safe ? 'safe' : 'unsafe';
  }

  let actionTaken = 'none';
  if (riskScore >= 0.85 || !safe) actionTaken = 'banned';
  else if (riskScore >= 0.7) actionTaken = 'warned';

  if (actionTaken === 'warned' || actionTaken === 'banned') {
    const fileName = `screenshot_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jpg`;
    const buffer = Buffer.from(imageBase64, 'base64');
    const { error: uploadErr } = await supabase.storage.from('moderation-screenshots').upload(fileName, buffer, { contentType: 'image/jpeg', upsert: false });
    if (!uploadErr) {
      screenshotUrl = supabase.storage.from('moderation-screenshots').getPublicUrl(fileName).data.publicUrl;
      uploadedScreenshot = true;
    }
  }

  if (result || actionTaken !== 'none') {
    await supabase.from('moderation_logs').insert({
      user_id: userId || null, identity: identity || null, fingerprint: fingerprint || null,
      ip_address: ip, room_name: roomName || null, risk_score: riskScore,
      risk_category: riskCategory, action_taken: actionTaken, screenshot_url: screenshotUrl,
      metadata: { nudity: result?.nudity, offensive: result?.offensive, uploadedScreenshot },
    });
  }

  if (actionTaken === 'banned') {
    await banFingerprintAndAllUsers({
      fingerprint, primaryUserId: userId,
      reason: `ai_moderation_one_strike_${riskCategory} (score: ${(riskScore * 100).toFixed(1)}%)`,
      metadata: { risk_score: riskScore, risk_category: riskCategory }, ip
    });
    if (roomService && roomName && identity) {
      await roomService.removeParticipant(roomName, identity).catch(() => {});
    }
  }

  res.json({ action: actionTaken, score: riskScore, category: riskCategory, screenshotUrl });
}));

// 4. MODERATE TEXT
router.post('/moderate-text', textCheckLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { text, userId, fingerprint } = req.body;
  if (!text || typeof text !== 'string') return res.status(400).json({ allowed: false, reason: 'text_missing' });
  if (text.length > 2000) return res.status(400).json({ allowed: false, reason: 'text_too_long' });

  const result = await analyzeText(text);

  if (!result.allowed && supabase) {
    await supabase.from('moderation_logs').insert({
      user_id: userId || null, fingerprint: fingerprint || null,
      ip_address: getClientIP(req), risk_score: result.score ?? 0.9,
      risk_category: result.reason, action_taken: 'warned',
      metadata: { text, cleaned: result.cleaned },
    });
  }
  res.json(result);
}));

// 5. MODERATE AVATAR (Profile Image) — Immediate permanent ban on violation
router.post('/moderate-avatar', textCheckLimiter, asyncHandler(async (req: Request, res: Response) => {
  if (!process.env.SIGHTENGINE_API_USER) {
    return res.json({ safe: true });
  }

  const { imageBase64, userId, fingerprint } = req.body;
  const ip = getClientIP(req);
  if (!imageBase64) return res.status(400).json({ safe: false, reason: 'image_missing' });

  // Strip potential data URL prefix
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  const modResult = await checkWithSightengine(base64Data, 'avatar-upload', userId || 'unknown');

  if (modResult.queued) {
    return res.json({ safe: true, queued: true });
  }

  if (modResult.blocked) {
    return res.json({ safe: false, reason: 'moderation_unavailable' });
  }

  const { raw: result, safe } = modResult;

  let reason = '';
  let riskScore = 0;
  if (result) {
    const nudityScore = Math.max(
      result.nudity?.sexual_activity || 0,
      result.nudity?.sexual_display || 0,
      result.nudity?.erotica || 0,
      result.nudity?.raw || 0
    );
    const weaponScore = result.weapon?.classes?.firearm || result.wad?.weapon || 0;
    const offensiveScore = result.offensive?.prob || result.wad?.middle_finger || result.offensive?.middle_finger || 0;
    riskScore = Math.max(nudityScore, weaponScore, offensiveScore);

    if (nudityScore >= 0.5) reason = 'nudity';
    else if (weaponScore >= 0.5) reason = 'weapon';
    else if (offensiveScore >= 0.7) reason = 'offensive';
  }

  // ── VIOLATION DETECTED → PERMANENT BAN ──
  if (!safe && supabase) {
    // 1. Upload evidence screenshot
    let evidenceUrl: string | null = null;
    try {
      const fileName = `avatar_violation_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jpg`;
      const buffer = Buffer.from(base64Data, 'base64');
      const { error: uploadErr } = await supabase.storage
        .from('moderation-evidence')
        .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: false });
      if (!uploadErr) {
        const { data: publicUrlData } = supabase.storage.from('moderation-evidence').getPublicUrl(fileName);
        evidenceUrl = publicUrlData?.publicUrl || null;
      }
    } catch { /* evidence upload is best-effort */ }

    // 2. Log the violation
    await supabase.from('moderation_logs').insert({
      user_id: userId || null,
      ip_address: ip,
      risk_score: riskScore,
      risk_category: reason || 'avatar_violation',
      action_taken: 'banned',
      screenshot_url: evidenceUrl,
      metadata: { context: 'avatar_upload', reason, nudity: result?.nudity, offensive: result?.offensive },
    });

    // 3. Permanent ban (no expires_at = permanent)
    await banFingerprintAndAllUsers({
      fingerprint: fingerprint || undefined,
      primaryUserId: userId,
      reason: `avatar_violation_permanent_ban_${reason} (score: ${(riskScore * 100).toFixed(1)}%)`,
      metadata: {
        risk_score: riskScore,
        risk_category: reason,
        context: 'avatar_upload',
        evidence_url: evidenceUrl,
      },
      ip,
    });

    return res.json({ safe: false, reason, banned: true });
  }

  res.json({ safe: true });
}));

// 6. ADMIN ENDPOINTS
router.use('/admin/*', adminMiddleware);

router.get('/admin/flagged', asyncHandler(async (req: Request, res: Response) => {
  if (!supabase) return res.json({ logs: [] });
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;

  const { data } = await supabase.from('moderation_logs').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  res.json({ logs: data || [] });
}));

router.get('/admin/bans', asyncHandler(async (req: Request, res: Response) => {
  if (!supabase) return res.json({ bans: [] });
  const { data } = await supabase.from('banned_users').select('*').eq('is_active', true).order('banned_at', { ascending: false });
  res.json({ bans: data || [] });
}));

router.post('/admin/unban', asyncHandler(async (req: Request, res: Response) => {
  if (!supabase) return res.status(503).json({ error: 'Unavailable' });
  const { banId } = req.body;
  if (!banId) return res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'banId required'  });

  await supabase.from('banned_users').update({ is_active: false }).eq('id', banId);
  res.json({ ok: true });
}));

router.post('/admin/ban', asyncHandler(async (req: Request, res: Response) => {
  if (!supabase) return res.status(503).json({ error: 'Unavailable' });
  const { userId, fingerprint, ipAddress, reason, permanent } = req.body;
  const expiresAt = permanent ? null : new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  await supabase.from('banned_users').insert({
    user_id: userId || null, fingerprint: fingerprint || null, ip_address: ipAddress || null,
    reason: reason || 'admin_manual_ban', expires_at: expiresAt, banned_by: 'admin',
  });
  res.json({ ok: true });
}));

router.get('/admin/reports', asyncHandler(async (req: Request, res: Response) => {
  if (!supabase) return res.json({ reports: [] });
  const status = req.query.status as string || 'pending';
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

  const { data } = await supabase.from('reports').select('*').eq('status', status).order('created_at', { ascending: false }).limit(limit);
  res.json({ reports: data || [] });
}));

router.get('/admin/stats', asyncHandler(async (req: Request, res: Response) => {
  if (!supabase) return res.json({});
  const [bansRes, reportsRes, logsRes] = await Promise.all([
    supabase.from('banned_users').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('moderation_logs').select('*', { count: 'exact', head: true }).gte('risk_score', 0.85),
  ]);
  res.json({ activeBans: bansRes.count || 0, pendingReports: reportsRes.count || 0, highRiskDetections: logsRes.count || 0 });
}));

router.get('/admin/moderation-queue', asyncHandler(async (req: Request, res: Response) => {
  const items = await redis.lrange(QUEUE_KEY, 0, -1);
  const parsed = items.map(i => JSON.parse(i));
  res.status(200).json({ count: parsed.length, items: parsed });
}));

router.delete('/admin/moderation-queue/:id', asyncHandler(async (req: Request, res: Response) => {
  const items = await redis.lrange(QUEUE_KEY, 0, -1);
  const toRemove = items.find(i => JSON.parse(i).id === req.params.id);
  if (!toRemove) return res.status(404).json({ error: 'Item not found' });
  await redis.lrem(QUEUE_KEY, 1, toRemove);
  res.status(200).json({ success: true });
}));

export default router;
