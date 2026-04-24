import { supabase } from './supabase.service.js';

export const MessageService = {
  /**
   * Get or Create Conversation between two users
   */
  getOrCreateConversation: async (userId: string, targetId: string) => {
    // Single query: Find existing direct conv (userId <-> targetId)
    const { data: existingConv } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)
      .eq('conversation_id', supabase.rpc('get_direct_conversation', { target_user: targetId })) // Custom RPC for efficiency
      .single();

    if (existingConv) {
      return existingConv.conversation_id;
    }

    // Create new
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({ is_group: false })
      .select('id')
      .single();

    if (convError) throw convError;

    await supabase.from('conversation_participants').insert([
      { conversation_id: newConv!.id, user_id: userId },
      { conversation_id: newConv!.id, user_id: targetId }
    ]);

    return newConv.id;
  },

  /**
   * Create a new message in a conversation
   */
  sendMessage: async (senderId: string, metadata: any, content: string, type: string, replyToId?: string, mediaId?: string) => {
    const { targetId } = metadata;
    let { conversationId } = metadata;

    if (!conversationId && targetId) {
      conversationId = await MessageService.getOrCreateConversation(senderId, targetId);
    }

    if (!conversationId) {
      throw new Error('Conversation ID or Target ID is required to send a message');
    }

    // 1. Verify user is part of the conversation
    const { data: participant, error: partErr } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', senderId)
      .single();

    if (partErr || !participant) {
      throw new Error('User is not a participant in this conversation');
    }

    // 2. Insert the message
    const { data: message, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        type,
        reply_to_id: replyToId || null,
        status: 'sent',
        media_id: mediaId || null // Using correct schema attribute for media
      })
      .select()
      .single();

    if (msgErr) throw msgErr;

    // 3. Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    return { ...message, conversationId };
  },

  /**
   * Mark messages as delivered
   */
  markAsDelivered: async (userId: string, messageId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ status: 'delivered' })
      .eq('id', messageId)
      // Only the recipient can mark it as delivered
      .neq('sender_id', userId);

    if (error) throw error;
    return true;
  },

  /**
   * Mark messages as read by receiver
   */
  markAsRead: async (userId: string, messageIds: string[]) => {
    if (!messageIds || messageIds.length === 0) return true;

    // Optional: add extra security to ensure the user is part of the conversation
    // but the RLS or the filter below typically handles that they can only read what they received
    const { error } = await supabase
      .from('messages')
      .update({ status: 'read' })
      .in('id', messageIds)
      .neq('sender_id', userId); // Cannot mark own messages as read for others

    if (error) throw error;
    return true;
  },

  /**
   * Get messages for a given conversation
   */
  getMessages: async (userId: string, conversationId: string, limit = 50, offset = 0) => {
    // 1. Verify participation
    const { data: participant, error: partErr } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (partErr || !participant) {
      throw new Error('Not authorized to view this conversation');
    }

    // 2. Fetch messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, media_attachments(*)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Return ascending order for chat UI
    return messages.reverse();
  },

  /**
   * Delete a message (Only the sender can delete their messages)
   */
  deleteMessage: async (userId: string, messageId: string) => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', userId); // Strictly restrict deletion to the sender

    if (error) throw error;
    return true;
  },

  /**
   * Delete all messages in a conversation for the user
   */
  deleteConversationMessages: async (userId: string, conversationId: string) => {
    // 1. Verify participation
    const { data: participant, error: partErr } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (partErr || !participant) {
      throw new Error('Not authorized to modify this conversation');
    }

    // 2. Delete messages
    // Note: Depends on whether we actually delete for everyone, or just hide it. The original code did a hard delete.
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (error) throw error;
    return { success: true };
  }
}
