import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { agentLimiter } from '../middleware/rate-limiters.js';
import { isValidRoomName, spawnAgent, stopAgent, getAgentStatus } from '../services/agent.service.js';
import { validate } from '../middleware/validate.middleware.js';
import { agentSchema } from '../validators/schemas.js';

const router = Router();

router.post('/agent/start', agentLimiter, validate(agentSchema), asyncHandler(async (req, res) => {
  const { roomName, identity } = req.body;

  if (!isValidRoomName(roomName)) {
    res.status(400).json({
      success: false,
      code: 'BAD_REQUEST',
      message: 'Invalid room name format'
    });
    return;
  }

  const success = spawnAgent(roomName, identity);
  if (!success) {
    res.status(429).json({
      error: "Server is busy or agent already running for this user. Please try again in a moment."        
    });
    return;
  }

  res.json({ success: true, message: `✅ Agent started for room: ${roomName} (identity: ${identity || 'all'})`, roomName });
}));

router.post('/agent/stop', agentLimiter, validate(agentSchema), asyncHandler(async (req, res) => {
  const { roomName, identity } = req.body;

  if (!isValidRoomName(roomName)) {
    res.status(400).json({
      success: false,
      code: 'BAD_REQUEST',
      message: 'Invalid room name format'
    });
    return;
  }

  const killed = stopAgent(roomName, identity);
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
  const roomName = req.query.roomName as string | undefined;
  const identity = req.query.identity as string | undefined;
  const status = getAgentStatus(roomName, identity);
  res.json(status);
}));

export default router;
