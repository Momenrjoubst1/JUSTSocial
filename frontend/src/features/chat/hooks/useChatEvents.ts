import { useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useChatContext } from '../ChatProvider';

interface UseChatEventsProps {
    conversationId?: string | null;
    currentUserId: string | null;
    recipientId?: string | null;
    onNewMessage?: (msg: any) => void;
}

/**
 * useChatEvents Hook
 * Now purely a lightweight wrapper for broadcasting user actions like typing.
 * State management (incoming typing, messages, presence) is handled strictly
 * by the Master Channel in `src/features/chat/hooks/usePresence.ts`.
 */
export function useChatEvents({ currentUserId, recipientId }: UseChatEventsProps) {
    const { contacts } = useChatContext();

    // Derived states from the shared Zustand/Context store managed by usePresence
    const targetContact = contacts.find(c => c.id === recipientId);
    const isTyping = Boolean(targetContact?.typing);
    
    // For general participants online globally, derived purely from store
    const participantsOnline = contacts.filter(c => c.online).map(c => c.id);

    const broadcastTyping = useCallback(async (typing: boolean) => {
        try {

                if (!currentUserId || !recipientId) return;
                
                // Broadcast on the Master Channel matching `usePresence.ts`
                const channel = supabase.channel(`chat_main_global`);
                await channel.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: { userId: currentUserId, targetId: recipientId, isTyping: typing },
                });
            
        } catch (error) {
          console.error('[useChatEvents.ts] [anonymous_function]:', error);
        }
    }, [currentUserId, recipientId]);

    return {
        isTyping,
        participantsOnline,
        broadcastTyping
    };
}
