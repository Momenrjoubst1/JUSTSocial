import express from 'express';
import { FollowService } from '../services/follow.service.js';
import { createLogger } from '../utils/logger.js';

const router = express.Router();
const logger = createLogger('follow-routes');

router.post('/:userId', async (req, res) => {
  try {
    const followerId = req.user?.id;
    const followingId = req.params.userId;
    
    if (!followerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await FollowService.followUser(followerId, followingId);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to follow user', { error: error.message, followerId: req.user?.id });
    res.status(500).json({ error: error.message || 'Failed to follow user' });
  }
});

router.delete('/:userId', async (req, res) => {
  try {
    const followerId = req.user?.id;
    const followingId = req.params.userId;
    
    if (!followerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await FollowService.unfollowUser(followerId, followingId);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to unfollow user', { error: error.message, followerId: req.user?.id });
    res.status(500).json({ error: error.message || 'Failed to unfollow user' });
  }
});

export default router;
