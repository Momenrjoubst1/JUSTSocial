import { apiClient } from '../client';

export const messagesApi = {
  markDelivered: (messageId: string) => apiClient.patch('/api/messages/delivered', { messageId }),
  markRead: (messageIds: string[]) => apiClient.patch('/api/messages/read', { messageIds }),
  deleteConversation: (conversationId: string) => apiClient.delete('/api/messages/conversation/' + conversationId),
  sendMessage: (payload: { conversationId?: string, targetId?: string, content: string, type: string, replyToId?: string, mediaId?: string }) => apiClient.post('/api/messages', payload)
};
