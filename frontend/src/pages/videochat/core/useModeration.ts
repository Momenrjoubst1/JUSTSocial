/**
 * ════════════════════════════════════════════════════════════════════════════════
 * useModeration — Client-side moderation integration
 *
 * Handles:
 *  - Ban check on mount (fingerprint + IP)
 *  - Periodic screenshot capture & AI moderation (every 10s)
 *  - Report submission helper
 *  - Auto-disconnect on ban detection
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { CONFIG } from "./types";

const MODERATION_INTERVAL = 20_000; // 20 seconds

function isUsableApiUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://"))
  );
}

export interface BanInfo {
  banned: boolean;
  reason?: string;
  expiresAt?: string;
}

export interface UseModerationOptions {
  fingerprint: string | null;
  userId: string | null;
  identity: string | null;
  roomName: string | null;
  connected: boolean;
  remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  onBanned?: (info: BanInfo) => void;
}

export interface UseModerationReturn {
  banInfo: BanInfo | null;
  isBanned: boolean;
  reportUser: (opts: {
    reportedUserId?: string;
    reportedIdentity?: string;
    reportedFingerprint?: string;
    reason?: string;
    description?: string;
  }) => Promise<{ ok: boolean; autoBanned?: boolean }>;
  reportLoading: boolean;
  reportSuccess: boolean;
  moderateText: (text: string) => Promise<{ safe: boolean; reason?: string; warning?: string }>;
  moderateImage: (base64: string) => Promise<{ safe: boolean; reason?: string }>;
  onBanned?: (info: BanInfo) => void;
}

export function useModeration({
  fingerprint,
  userId,
  identity,
  roomName,
  connected,
  remoteVideoRef,
  onBanned,
}: UseModerationOptions): UseModerationReturn {
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const moderationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reportingRef = useRef(false); // idempotency guard for report submissions
  const onBannedRef = useRef(onBanned);
  onBannedRef.current = onBanned;

  /* ── Check ban status on mount ──────────────────────────────────────── */
  useEffect(() => {
    if (!fingerprint) return;

    const checkBan = async () => {
      try {
        const res = await fetch(`${CONFIG.MODERATION_API_URL}/check-ban?fingerprint=${encodeURIComponent(fingerprint)}`);
        if (!res.ok) return;
        const data: BanInfo = await res.json();
        if (data.banned) {
          setBanInfo(data);
          onBannedRef.current?.(data);
        }
      } catch {
        // fail silently
      }
    };

    checkBan();
  }, [fingerprint]);

  /* ── Periodic screenshot moderation ─────────────────────────────────── */
  useEffect(() => {
    if (!connected || !fingerprint) {
      if (moderationTimerRef.current) {
        clearInterval(moderationTimerRef.current);
        moderationTimerRef.current = null;
      }
      return;
    }

    const captureAndModerate = async () => {
      // Skip when tab is hidden — no point capturing invisible video
      if (document.visibilityState === 'hidden') return;

      const video = remoteVideoRef.current;
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

      try {
        // Capture frame from remote video
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth, 240); // downscale for speed
        canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.4).split(',')[1];

        // Send to moderation API
        const res = await fetch(`${CONFIG.MODERATION_API_URL}/moderate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            identity,
            fingerprint,
            userId,
            roomName,
          }),
        });

        if (!res.ok) return;
        const data = await res.json();

        if (data.action === 'banned') {
          const bi: BanInfo = { banned: true, reason: `AI detected: ${data.category}` };
          setBanInfo(bi);
          onBannedRef.current?.(bi);
        }
      } catch {
        // fail silently — don't interrupt the call
      }
    };

    // Start moderation interval
    moderationTimerRef.current = setInterval(captureAndModerate, MODERATION_INTERVAL);

    // Also run once immediately after 3s delay (let video stabilize)
    const initialTimeout = setTimeout(captureAndModerate, 3000);

    return () => {
      if (moderationTimerRef.current) clearInterval(moderationTimerRef.current);
      clearTimeout(initialTimeout);
    };
  }, [connected, fingerprint, identity, userId, roomName]);

  /* ── Report user ────────────────────────────────────────────────────── */
  const reportUser = useCallback(async (opts: {
    reportedUserId?: string;
    reportedIdentity?: string;
    reportedFingerprint?: string;
    reason?: string;
    description?: string;
  }) => {
    if (!userId) return { ok: false };
    // Idempotency guard — prevent multiple simultaneous submissions
    if (reportingRef.current) return { ok: false };
    reportingRef.current = true;

    let base64 = undefined;
    const video = remoteVideoRef.current;
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
        }
      } catch (e) {
        console.error("Frame capture error:", e);
      }
    }

    setReportLoading(true);
    setReportSuccess(false);
    try {
      const moderationApiUrl = CONFIG.MODERATION_API_URL;
      if (!isUsableApiUrl(moderationApiUrl)) {
        console.error('Moderation API URL is misconfigured:', moderationApiUrl);
        return { ok: false };
      }

      const res = await fetch(`${moderationApiUrl}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: userId,
          reportedUserId: opts.reportedUserId,
          reportedIdentity: opts.reportedIdentity,
          reportedFingerprint: opts.reportedFingerprint,
          reason: opts.reason || 'inappropriate_content',
          description: opts.description,
          roomName,
          imageBase64: base64,
        }),
      });

      if (!res.ok) return { ok: false };
      const data = await res.json();
      setReportSuccess(true);
      setTimeout(() => setReportSuccess(false), 3000);
      return { ok: true, autoBanned: data.autoBanned };
    } catch {
      return { ok: false };
    } finally {
      setReportLoading(false);
      reportingRef.current = false;
    }
  }, [userId, roomName]);

  /* ── Moderate Text ──────────────────────────────────────────────────── */
  const moderateText = useCallback(async (text: string): Promise<{ safe: boolean; reason?: string; warning?: string }> => {
    try {
      const moderationApiUrl = CONFIG.MODERATION_API_URL;
      if (!isUsableApiUrl(moderationApiUrl)) {
        console.error('Moderation API URL is misconfigured:', moderationApiUrl);
        return { safe: true }; // fail open
      }

      const res = await fetch(`${moderationApiUrl}/moderate-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, userId, fingerprint }),
      });
      if (!res.ok) return { safe: true };

      const data = await res.json();

      // New multi-layer response format: { allowed, reason, cleaned, score }
      if (data.allowed === false) {
        const warningMessages: Record<string, string> = {
          profanity: '⚠️ رسالتك تحتوي على ألفاظ غير لائقة',
          pii: '🔒 لا يمكن مشاركة معلومات شخصية (أرقام، إيميلات، روابط)',
          spam: '🚫 الرسالة تبدو كـ spam',
          toxicity: '⚠️ رسالتك تحتوي على محتوى مسيء',
          text_too_long: '⚠️ الرسالة طويلة جداً',
        };
        return {
          safe: false,
          reason: data.reason,
          warning: warningMessages[data.reason] ?? '⚠️ الرسالة غير مقبولة',
        };
      }

      return { safe: true };
    } catch {
      // Fail open — don't block message if API is down
      return { safe: true };
    }
  }, [userId, fingerprint]);

  /* ── Moderate Image (e.g. for Avatars) ──────────────────────────────── */
  const moderateImage = useCallback(async (base64: string) => {
    try {
      const moderationApiUrl = CONFIG.MODERATION_API_URL;
      if (!isUsableApiUrl(moderationApiUrl)) {
        console.error('Moderation API URL is misconfigured:', moderationApiUrl);
        return { safe: true }; // fail open
      }

      const res = await fetch(`${moderationApiUrl}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, userId, fingerprint }),
      });
      if (!res.ok) return { safe: true };
      const data = await res.json();
      return { safe: data.action !== 'banned', reason: data.category };
    } catch {
      return { safe: true };
    }
  }, [userId, fingerprint]);

  return {
    banInfo,
    isBanned: banInfo?.banned ?? false,
    reportUser,
    reportLoading,
    reportSuccess,
    moderateText,
    moderateImage,
    onBanned,
  };
}
