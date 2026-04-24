import express from 'express';
import { NotificationService } from '../services/notifications.service.js';
import { createLogger } from '../utils/logger.js';

const router = express.Router();
const logger = createLogger('notifications-routes');

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    if (id === 'all') {
      await NotificationService.deleteAllNotifications(userId);
    } else {
      await NotificationService.deleteNotification(id, userId);
    }
    
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to delete notification', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    // Allow user to send themselves a notification, or we can restrict it later
    await NotificationService.createNotification(req.body);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to create notification', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

export default router;
