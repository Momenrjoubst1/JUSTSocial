import express from 'express';
import { MessageService } from '../services/message.service.js';
import { createLogger } from '../utils/logger.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = express.Router();
const logger = createLogger('messages-routes');

/**
 * Fetch messages for a conversation
 */
router.get('/:conversationId', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.conversationId;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const messages = await MessageService.getMessages(userId, conversationId, limit, offset);
  res.json({ messages });
}));

/**
 * Send a new message
 */
router.post('/', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { conversationId, targetId, content, type, replyToId, mediaId } = req.body;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!(conversationId || targetId) || !content || !type) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const result = await MessageService.sendMessage(userId, { conversationId, targetId }, content, type, replyToId, mediaId);
  res.status(201).json({ success: true, message: result.message, conversationId: result.conversation_id });
}));

/**
 * Mark message as delivered
 */
router.patch('/delivered', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { messageId } = req.body;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!messageId) {
    res.status(400).json({ error: 'messageId is required' });
    return;
  }

  await MessageService.markAsDelivered(userId, messageId);
  res.json({ success: true });
}));

/**
 * Mark messages as read
 */
router.patch('/read', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { messageIds } = req.body;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!messageIds || !Array.isArray(messageIds)) {
    res.status(400).json({ error: 'Valid messageIds array is required' });
    return;
  }

  await MessageService.markAsRead(userId, messageIds);
  res.json({ success: true });
}));

/**
 * Delete a message
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const messageId = req.params.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  await MessageService.deleteMessage(userId, messageId);
  res.json({ success: true });
}));

/**
 * Delete a conversation's messages
 */
router.delete('/conversation/:id', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  await MessageService.deleteConversationMessages(userId, conversationId);
  res.json({ success: true });
}));

export default router;
