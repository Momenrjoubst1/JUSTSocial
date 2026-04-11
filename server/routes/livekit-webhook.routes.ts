import { WebhookReceiver } from 'livekit-server-sdk';
import { Router, raw } from 'express';
import crypto from 'crypto';
import redis from '../config/redis-client.js';
import { livekitConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

const receiver = new WebhookReceiver(
  livekitConfig.apiKey,
  livekitConfig.apiSecret,
);

/**
 * POST /api/livekit-webhook
 *
 * Receives events from LiveKit servers (no user JWT — called server-to-server).
 * Must be registered BEFORE any authMiddleware.
 *
 * IMPORTANT — Raw body required for HMAC signature verification:
 *   `receiver.receive()` computes an HMAC-SHA256 over the raw request body and
 *   compares it against the Authorization header sent by LiveKit.
 *   If express.json() runs first and parses req.body into an object, the bytes
 *   will never match and every webhook will be rejected (or worse — accepted
 *   without a real signature check if the SDK falls back silently).
 *   We apply express.raw() inline on this specific route so the global
 *   express.json() middleware is bypassed here.
 *
 * On participant_left: cleans up the Redis token tracking keys so the
 * participant can immediately re-join without hitting the 409 guard.
 */
router.post(
  '/livekit-webhook',
  // Capture the raw bytes before any JSON parsing
  raw({ type: '*/*' }),
  async (req, res) => {
    const authHeader = req.get('Authorization');

    // Guard: reject immediately if there is no valid Authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('LiveKit webhook: missing or invalid Authorization header');
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    // IP Audit (Optional security monitoring)
    const allowedIps = process.env.LIVEKIT_WEBHOOK_IPS?.split(',') || [];
    const clientIp = req.ip || req.connection?.remoteAddress;
    if (allowedIps.length > 0 && clientIp && !allowedIps.includes(clientIp)) {
      logger.warn('Webhook received from unauthorized IP (Logged for audit)', { ip: clientIp });
    }

    try {
      // receiver.receive() does two things in one call:
      //   1. Verifies the HMAC-SHA256 signature against livekitConfig.apiSecret
      //   2. Decodes and returns the WebhookEvent proto
      // It throws if the body is empty, the signature is wrong, or the
      // payload cannot be decoded — all caught below and returned as 400/401.
      const body = req.body instanceof Buffer ? req.body.toString('utf-8') : String(req.body);
      const event = await receiver.receive(body, authHeader);

      if (event.event === 'participant_left') {
        const identity = event.participant?.identity;
        const room = event.room?.name;

        if (identity && room) {
          await redis.del(`livekit:active_token:${identity}`);
          await redis.del(`livekit:token:${identity}:${room}`);
          logger.info('LiveKit webhook: cleaned up token keys', { identity, room });
        }
      }

      const requestId = crypto.randomUUID();
      res.set('X-Request-ID', requestId);
      res.status(200).json({ received: true, requestId });
    } catch (err) {
      // Signature mismatch, malformed payload, or decode failure
      logger.warn('LiveKit webhook: rejected — invalid signature or payload', { err });
      res.status(400).json({ error: 'Invalid webhook' });
    }
  },
);

export default router;
