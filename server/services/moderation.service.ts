import redis from '../config/redis-client.js';
import { logger } from '../utils/logger.js';

export enum FallbackStrategy {
  QUEUE = 'queue',
  STRICT = 'strict',
  PERMISSIVE = 'permissive',
}

const FALLBACK_STRATEGY: FallbackStrategy = FallbackStrategy.QUEUE;

export interface QueuedItem {
  id: string;
  screenshot: string;
  roomName: string;
  participantId: string;
  queuedAt: number;
  reason: string;
}

const QUEUE_KEY = 'moderation:queue';
const MAX_QUEUE_SIZE = 500;
const QUEUE_ITEM_TTL = 60 * 60 * 24;

export async function addToModerationQueue(item: Omit<QueuedItem, 'id' | 'queuedAt'>): Promise<void> {
  try {
    const queueSize = await redis.llen(QUEUE_KEY);
    if (queueSize >= MAX_QUEUE_SIZE) {
      logger.warn('Moderation queue full — dropping oldest item');
      await redis.lpop(QUEUE_KEY);
    }

    const queueItem: QueuedItem = {
      ...item,
      id: `mq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      queuedAt: Date.now(),
    };

    await redis.rpush(QUEUE_KEY, JSON.stringify(queueItem));
    if (queueSize === 0) {
      await redis.expire(QUEUE_KEY, QUEUE_ITEM_TTL);
    }
    logger.info(`Item queued for manual review: ${queueItem.id}`);
  } catch (err) {
    logger.error('Failed to add to moderation queue:', err);
  }
}

const FAILURE_COUNT_KEY = 'sightengine:failures';
const FAILURE_WINDOW_SEC = 300;

export async function trackSightengineFailure(): Promise<void> {
  try {
    const count = await redis.incr(FAILURE_COUNT_KEY);
    if (count === 1) {
      await redis.expire(FAILURE_COUNT_KEY, FAILURE_WINDOW_SEC);
    }
    if (count >= 10) {
      logger.error(`ALERT: Sightengine failed ${count} times in 5 minutes!`);
    }
  } catch {
    //
  }
}

export interface ModerationCheckResult {
  safe: boolean;
  queued?: boolean;
  blocked?: boolean;
  reason?: string;
  raw?: any;
}

const SIGHTENGINE_TIMEOUT_MS = 5000;
const MAX_RETRIES = 2;

export async function checkWithSightengine(
  screenshotBase64: string,
  roomName: string,
  participantId: string,
): Promise<ModerationCheckResult> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SIGHTENGINE_TIMEOUT_MS);

      const byteCharacters = atob(screenshotBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('models', 'nudity-2.1,offensive,wad');
      formData.append('api_user', process.env.SIGHTENGINE_API_USER || process.env.VITE_SIGHTENGINE_API_USER || '');
      formData.append('api_secret', process.env.SIGHTENGINE_API_SECRET || process.env.VITE_SIGHTENGINE_API_SECRET || '');
      formData.append('media', blob, 'capture.jpg');

      const response = await fetch('https://api.sightengine.com/1.0/check.json', {
        method: 'POST',
        signal: controller.signal,
        body: formData,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Sightengine HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'success') {
        throw new Error(`Sightengine error status: ${data.status}`);
      }

      const nudityScore = Math.max(
        data.nudity?.sexual_activity || 0,
        data.nudity?.sexual_display || 0,
        data.nudity?.erotica || 0,
        data.nudity?.raw || 0
      );
      const weaponScore = data.weapon?.classes?.firearm || data.wad?.weapon || 0;
      const offensiveScore = data.offensive?.prob || data.wad?.middle_finger || data.offensive?.middle_finger || 0;

      const isSafe = nudityScore < 0.5 && weaponScore < 0.5 && offensiveScore < 0.7;

      return { safe: isSafe, raw: data };

    } catch (err) {
      lastError = err;
      logger.warn(`Sightengine attempt ${attempt}/${MAX_RETRIES} failed:`, err);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, attempt * 500));
      }
    }
  }

  logger.error('Sightengine failed after all retries:', lastError);
  await trackSightengineFailure();

  switch (FALLBACK_STRATEGY) {
    case FallbackStrategy.STRICT:
      logger.warn('STRICT fallback: blocking content due to API failure');
      return { safe: false, blocked: true, reason: 'api-unavailable' };
    case FallbackStrategy.QUEUE:
      await addToModerationQueue({
        screenshot: screenshotBase64,
        roomName,
        participantId,
        reason: String(lastError),
      });
      return { safe: true, queued: true };
    case FallbackStrategy.PERMISSIVE:
    default:
      logger.warn('PERMISSIVE fallback: allowing content (not recommended for production)');
      return { safe: true };
  }
}
