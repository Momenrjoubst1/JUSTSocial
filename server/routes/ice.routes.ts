import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { tokenLimiter } from '../middleware/rate-limiters.js';
import { getTurnCredentials } from '../config/turn-credentials.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/ice-servers', tokenLimiter, asyncHandler(async (req, res) => {
  try {
    const iceServers = await getTurnCredentials();
    res.status(200).json({ iceServers });
  } catch (err) {
    logger.warn('Failed to fetch TURN, falling back to STUN', err);
    res.status(200).json({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
  }
}));

export default router;
