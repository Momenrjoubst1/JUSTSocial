import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { agentLimiter } from '../middleware/rate-limiters.js';
import { isValidRoomName, spawnAgent, stopAgent } from '../services/agent.service.js';
import { validate } from '../middleware/validate.middleware.js';
import { agentSchema } from '../validators/schemas.js';

const router = Router();

router.post('/agent/start', agentLimiter, validate(agentSchema), asyncHandler(async (req, res) => {
  const { roomName } = req.body;

  if (!isValidRoomName(roomName)) {
    res.status(400).json({
      success: false,
      code: 'BAD_REQUEST',
      message: 'Invalid room name format'
    });
    return;
  }

  const success = spawnAgent(roomName);
  if (!success) {
    res.status(429).json({
      success: false,
      code: 'TOO_MANY_REQUESTS',
      message: 'System is at maximum capacity or agent already running.'
    });
    return;
  }

  res.json({ success: true, message: `✅ Agent started for room: ${roomName}`, roomName });
}));

router.post('/agent/stop', agentLimiter, validate(agentSchema), asyncHandler(async (req, res) => {
  const { roomName } = req.body;

  if (!isValidRoomName(roomName)) {
    res.status(400).json({
      success: false,
      code: 'BAD_REQUEST',
      message: 'Invalid room name format'
    });
    return;
  }

  const killed = stopAgent(roomName);
  if (killed) {
    res.json({ success: true, message: '✅ Agent stopped' });
  } else {
    res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: 'No agent running for this room'
    });
  }
}));

export default router;
