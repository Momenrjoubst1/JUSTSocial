import React, { ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthContext } from '@/context/AuthContext';
import { usePresence } from '@/features/chat/hooks/usePresence';
import { useChatStore, ChatStore } from './store/chatStore';
import { Contact } from '@/features/chat/types/chat.types';

export type ChatContextType = ChatStore;

import { useOfflineSync } from '@/features/chat/hooks/useOfflineSync';
import {
    useRealtimeSubscription,
    type RealtimeSubscriptionFilter,
} from '@/features/chat/hooks/useRealtimeSubscription';

function PresenceManager() {
    usePresence();
    useOfflineSync();
    return null;
}

export function ChatProvider({ children }: { children: ReactNode }) {
    const { user } = useAuthContext();
    const setContacts = useChatStore(s => s.setContacts);
    const setAllMessages = useChatStore(s => s.setAllMessages);
    const setLatestMessage = useChatStore(s => s.setLatestMessage);
    const activeChat = useChatStore(s => s.activeChat);
    const activeChatSync = useChatStore(s => s.activeChatSync);
    const contacts = useChatStore(s => s.contacts);
    const resetChatState = useChatStore(s => s.resetChatState);
    const latestMessageTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync activeChat with relevant data from contacts list
    React.useEffect(() => {
        if (!activeChat) return;
        const contact = contacts.find(c => c.id === activeChat.id);
        if (contact) {
            if (
                contact.name !== activeChat.name ||
                contact.avatar !== activeChat.avatar ||
                contact.online !== activeChat.online ||
                contact.typing !== activeChat.typing ||
                contact.conversationId !== activeChat.conversationId
            ) {
                activeChatSync({ ...activeChat, ...contact });
            }
        }
    }, [contacts, activeChat, activeChatSync]);

    React.useEffect(() => {
        if (!user?.id) return;

        const fetchInbox = async () => {
            const { data, error } = await supabase
                .from('user_inbox')
                .select('*')
                .order('last_message_time', { ascending: false });

            if (data && !error) {
                const mapped: Contact[] = data.map((row: any) => ({
                    id: row.other_user_id,
                    conversationId: row.conversation_id,
                    name: row.other_user_name || 'User',
                    avatar: (row.other_user_avatar && row.other_user_avatar.startsWith('http'))
                        ? row.other_user_avatar
                        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.other_user_id}`,
                    avatarFrame: row.other_user_avatar_frame,
                    lastMessage: row.last_message || '',
                    lastMessageSenderId: row.last_message_sender_id,
                    time: row.last_message_time ? new Date(row.last_message_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
                    lastMessageTime: row.last_message_time,
                    lastMessageMetadata: row.last_message_metadata,
                    unread: row.unread_count || 0,
                    online: false,
                    typing: false,
                }));

                setContacts(prev => {
                    const contactMap = new Map(prev.map(c => [c.id, c]));
                    mapped.forEach(c => contactMap.set(c.id, c));
                    return Array.from(contactMap.values()).sort((a, b) => {
                        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
                        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
                        return timeB - timeA;
                    });
                });
            }
        };

        fetchInbox();
    }, [user?.id, setContacts]);

    // 2. Real-time Message Listener (Global)
    const handleIncomingMessage = React.useCallback(async (payload: any) => {
        if (payload.eventType === 'DELETE') return;
        
        const newMsg = payload.new;
        const isInsert = payload.eventType === 'INSERT';

        if (isInsert && newMsg.sender_id === user?.id) return;
        
        // Mark global incoming message as 'delivered' seamlessly
        if (isInsert && newMsg.status === 'sent') {
            supabase.from('messages').update({ status: 'delivered' }).eq('id', newMsg.id).then();
        }

        let senderNameForToast = "Someone";
        const currentActiveChat = useChatStore.getState().activeChat;
        let showToast = false;

        setContacts(prev => {
            const contactMap = new Map(prev.map(c => [c.id, c]));
            const contact = contactMap.get(newMsg.sender_id) || prev.find(c => c.conversationId === newMsg.conversation_id);

            if (contact) {
                senderNameForToast = contact.name;
                const isViewingThis = currentActiveChat?.conversationId === newMsg.conversation_id 
                                   || currentActiveChat?.id === newMsg.sender_id;

                const msgTime = new Date(newMsg.created_at).getTime();
                const contactTime = contact.lastMessageTime ? new Date(contact.lastMessageTime).getTime() : 0;

                // Update contact if it's a new message or updating the current latest message
                if (isInsert || msgTime >= contactTime) {
                    const updatedContact = {
                        ...contact,
                        lastMessage: newMsg.encrypted_content,
                        lastMessageSenderId: newMsg.sender_id,
                        time: new Date(newMsg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                        lastMessageTime: newMsg.created_at,
                        lastMessageMetadata: newMsg.metadata,
                        unread: (isInsert && !isViewingThis) ? ((contact.unread || 0) + 1) : contact.unread,
                    };
                    contactMap.set(contact.id, updatedContact);
                    if (isInsert) showToast = true;
                }
                
                return Array.from(contactMap.values()).sort((a, b) => {
                    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
                    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
                    return timeB - timeA;
                });
            }
            return prev;
        });

        if (showToast && (!currentActiveChat || (currentActiveChat.conversationId !== newMsg.conversation_id && currentActiveChat.id !== newMsg.sender_id))) {
            setLatestMessage({
                senderName: senderNameForToast,
                text: "New message"
            });
            if (latestMessageTimerRef.current) {
                clearTimeout(latestMessageTimerRef.current);
            }
            latestMessageTimerRef.current = setTimeout(() => setLatestMessage(null), 5000);
        }
    }, [user?.id, setContacts, setLatestMessage]);

    const globalFilter = React.useMemo<RealtimeSubscriptionFilter>(
        () => ({ event: '*', schema: 'public', table: 'messages' }),
        [],
    );

    const { status, retryCount, maxRetries, reconnect } = useRealtimeSubscription(
        user ? 'global-chat-updates' : 'inactive-channel',
        globalFilter,
        handleIncomingMessage,
        Boolean(user?.id),
    );

    React.useEffect(() => {
        return () => {
            if (latestMessageTimerRef.current) {
                clearTimeout(latestMessageTimerRef.current);
            }
            resetChatState();
        };
    }, [resetChatState]);

    // 3. Offline Pending Sync Mechanism (WhatsApp Offline Mode) is now handled via useOfflineSync in PresenceManager


    return (
        <>
            <PresenceManager />
            {user && status === 'reconnecting' && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#FEF3C7', padding: '8px', textAlign: 'center', fontSize: '13px', color: '#92400E' }}>
                    جارٍ إعادة الاتصال... ({retryCount}/{maxRetries})
                </div>
            )}
            {user && status === 'disconnected' && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#FEE2E2', padding: '8px', textAlign: 'center', fontSize: '13px', color: '#991B1B' }}>
                    انقطع الاتصال بسيرفر الدردشة.
                    <button
                        type="button"
                        onClick={reconnect}
                        style={{ marginInlineStart: 8, padding: '2px 8px', borderRadius: 6, border: '1px solid #DC2626', background: '#fff', color: '#991B1B', cursor: 'pointer' }}
                    >
                        إعادة المحاولة
                    </button>
                </div>
            )}
            {children}
        </>
    );
}

// Emulate useChatContext to prevent immediately breaking consumers
export function useChatContext() {
    return useChatStore();
}