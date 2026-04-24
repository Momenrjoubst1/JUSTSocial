import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { agentLimiter } from '../middleware/rate-limiters.js';
import { isValidRoomName, spawnAgent, stopAgent, getAgentStatus } from '../services/agent.service.js';
import { validate } from '../middleware/validate.middleware.js';
import { agentSchema } from '../validators/schemas.js';

const router = Router();

router.post('/agent/start', agentLimiter, validate(agentSchema), asyncHandler(async (req, res) => {
  const { roomName, identity } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
    return;
  }

  if (!isValidRoomName(roomName)) {
    res.status(400).json({
      success: false,
      code: 'BAD_REQUEST',
      message: 'Invalid room name format'
    });
    return;
  }

  // Enforce identity ownership: the caller can only target their own identity.
  const effectiveIdentity = identity ?? userId;
  if (effectiveIdentity !== userId) {
    res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'identity must match the authenticated user'
    });
    return;
  }

  const success = spawnAgent(roomName, effectiveIdentity);
  if (!success) {
    res.status(429).json({
      error: "Server is busy or agent already running for this user. Please try again in a moment."        
    });
    return;
  }

  res.json({ success: true, message: `Agent started for room: ${roomName} (identity: ${effectiveIdentity})`, roomName });
}));

router.post('/agent/stop', agentLimiter, validate(agentSchema), asyncHandler(async (req, res) => {
  const { roomName, identity } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
    return;
  }

  if (!isValidRoomName(roomName)) {
    res.status(400).json({
      success: false,
      code: 'BAD_REQUEST',
      message: 'Invalid room name format'
    });
    return;
  }

  const effectiveIdentity = identity ?? userId;
  if (effectiveIdentity !== userId) {
    res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'identity must match the authenticated user'
    });
    return;
  }

  const killed = stopAgent(roomName, effectiveIdentity);
  if (killed) {
    res.json({ success: true, message: '✅ Agent stopped' });
  } else {
    res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: 'No agent running for this room and user'
    });
  }
}));

router.get('/agent/status', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Authentication required' });
    return;
  }

  const roomName = req.query.roomName as string | undefined;
  const queryIdentity = req.query.identity as string | undefined;

  // Users may only query status for their own identity.
  if (queryIdentity && queryIdentity !== userId) {
    res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'identity must match the authenticated user' });
    return;
  }

  const status = getAgentStatus(roomName, userId);
  res.json(status);
}));

export default router;
