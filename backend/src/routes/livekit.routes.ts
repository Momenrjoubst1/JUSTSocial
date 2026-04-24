import { Router } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { asyncHandler } from '../utils/async-handler.js';
import { perUserTokenLimiter } from '../middleware/rate-limiters.js';
import { checkIsBanned } from '../services/ban.service.js';
import { findOrCreateRoom, removeParticipant } from '../services/room.service.js';
import redis from '../config/redis-client.js';

import { livekitConfig } from '../config/index.js';
import { validate } from '../middleware/validate.middleware.js';
import { livekitLeaveSchema } from '../validators/schemas.js';

const router = Router();

router.get('/livekit-token', perUserTokenLimiter, asyncHandler(async (req, res) => {
  const country = req.query.country as string | undefined;
  const fingerprint = req.query.fingerprint as string | undefined;

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ipStr = typeof ip === 'string' ? ip.split(',')[0].trim() : String(ip);

  if (fingerprint || ipStr) {
    const isBanned = await checkIsBanned(fingerprint || '', ipStr);
    if (isBanned?.banned) {
      res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Access Denied: User is banned',
        banned: true
      });
      return;
    }
  }

  // Enforce identity matches authenticated user
  const identity = req.user?.id;
  if (!identity) {
    res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'User identity missing'
    });
    return;
  }

  const lockKey = `livekit:lock:${identity}`;
  const lock = await redis.set(lockKey, "1", "EX", 2, "NX");

  if (!lock) {
    res.status(429).json({
      success: false,
      code: 'TOKEN_IN_PROGRESS',
      message: 'Token generation already in progress'
    });
    return;
  }

  const activeKey = `livekit:active_token:${identity}`;
  let roomName = await redis.get(activeKey);

  // Reuse assigned room when possible to prevent token abuse across rooms.
  if (roomName) {
    const roomExists = await redis.exists(`room:${roomName}`);
    if (!roomExists) {
      await redis.del(activeKey);
      roomName = null;
    }
  }

  if (!roomName) {
    roomName = await findOrCreateRoom(country, identity);
  }

  // ── Step 0: Check for existing active token (token reuse) ─────────────
  const existingTokenKey = `livekit:token:${identity}:${roomName}`;
  const existingJwt = await redis.get(existingTokenKey);
  if (existingJwt) {
    res.json({ token: existingJwt, roomName, url: livekitConfig.url, reused: true });
    return;
  }

  // ── Step 1: Token TTL reduced to 2 hours ──────────────────────────────
  const TOKEN_TTL = 7200; // 2 hours (was 86400)

  const token = new AccessToken(livekitConfig.apiKey, livekitConfig.apiSecret, {
    identity,
    metadata: JSON.stringify({ country: country || 'unknown' }),
    ttl: TOKEN_TTL,
  });

  // ── Step 2: Scope grant to this room only, no admin rights ────────────
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: false,
    roomCreate: false,
  });

  const jwt = await token.toJwt();

  // ── Step 3: Record the issued token in Redis ───────────────────────────
  const tokenKey = `livekit:token:${identity}:${roomName}`;
  await redis.set(tokenKey, jwt, 'EX', TOKEN_TTL);
  await redis.set(activeKey, roomName, 'EX', TOKEN_TTL);

  res.json({ token: jwt, roomName, url: livekitConfig.url });
}));

router.post('/leave', validate(livekitLeaveSchema), asyncHandler(async (req, res) => {
  const identity = req.user?.id;
  if (!identity) {
    res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'User identity missing'
    });
    return;
  }

  const { roomName } = req.body;

  const activeKey = `livekit:active_token:${identity}`;
  const assignedRoom = await redis.get(activeKey);
  if (assignedRoom && assignedRoom !== roomName) {
    res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'Invalid room assignment'
    });
    return;
  }

  const data = await redis.get(`room:${roomName}`);
  const room = data ? JSON.parse(data) : null;

  if (room) {
    const remaining = await removeParticipant(roomName, identity, room.country);
    if (assignedRoom === roomName || remaining <= 0) {
      await redis.del(activeKey);
      await redis.del(`livekit:token:${identity}:${roomName}`);
    }
    res.json({ ok: true, roomName, participants: remaining });
  } else {
    if (assignedRoom === roomName) {
      await redis.del(activeKey);
      await redis.del(`livekit:token:${identity}:${roomName}`);
    }
    res.json({ ok: true, roomName, participants: 0 });
  }
}));

router.get('/room-status', asyncHandler(async (req, res) => {
  const roomNames = await redis.smembers('rooms:active');
  const rooms: Array<{ name: string; participants: number; country: string; createdAt: string }> = [];

  for (const name of roomNames) {
    const data = await redis.get(`room:${name}`);
    if (data) {
      const room = JSON.parse(data);
      rooms.push({
        name: room.roomName,
        participants: room.participants.length,
        country: room.country,
        createdAt: new Date(room.createdAt).toISOString(),
      });
    } else {
      await redis.srem('rooms:active', name);
    }
  }
  res.json({ totalRooms: rooms.length, rooms });
}));

export default router;
