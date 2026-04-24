import express from 'express';
import { ProfileService } from '../services/profile.service.js';
import { createLogger } from '../utils/logger.js';
import redis from '../config/redis-client.js';

const router = express.Router();
const logger = createLogger('profile-routes');

router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const cacheKey = `profile:${userId}`;
    
    // Read strategy: Look in Redis Cache first
    const cachedProfile = await redis.get(cacheKey).catch(() => null);
    if (cachedProfile) {
        res.json(JSON.parse(cachedProfile));
        return;
    }

    const profile = await ProfileService.getProfile(userId);

    // Cache the result to prevent high DB load
    await redis.set(cacheKey, JSON.stringify(profile), 'EX', 600).catch(() => {});

    res.json(profile);
  } catch (error: any) {
    logger.error('Failed to get profile', { error: error.message, targetId: req.params.id });
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

router.put('/me', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const updatedProfile = await ProfileService.updateProfile(userId, req.body);
    
    // Invalidating cache so fresh data is served next time
    await redis.del(`profile:${userId}`).catch(() => {});
    
    res.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    logger.error('Failed to update profile', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
