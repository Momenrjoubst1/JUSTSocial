import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthContext } from '@/context/AuthContext';
import { useChatContext } from '@/features/chat/ChatProvider';
import { useE2EE } from '@/features/chat/hooks/useE2EE';
import { decryptHybridMessage } from '@/features/chat/services/crypto';
import { DbMessage, Message } from '@/features/chat/types/chat.types';

/**
 * usePresence Hook (Master Realtime Manager)
 * Consolidates all Supabase Realtime features into a SINGLE main channel
 * to ensure perfect sync for Presence, Messages, and Reactions, eliminating race conditions.
 */
export function usePresence() {
    const { user } = useAuthContext();
    const { setContacts, setAllMessages } = useChatContext();
    const { privateKey, keysReady } = useE2EE();
    
    // Optimizations to avoid re-renders and stuttering
    const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
    const contactsDebounceRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        let isMounted = true;
        if (!user || !keysReady || !privateKey) return;

        // Unified Master Channel for application-wide sync
        const channelId = `chat_main_global`;
        const channel = supabase.channel(channelId);

        channel
            // 🟢 PRESENCE SYNC
            .on('presence', { event: 'sync' }, () => {
                if (!isMounted) return;
                const state = channel.presenceState();
                const onlineIds = new Set<string>();
                const lastSeenMap: Record<string, string> = {};

                Object.values(state).flat().forEach((p: any) => {
                    if (p.user_id) {
                        onlineIds.add(p.user_id);
                        if (p.last_seen) lastSeenMap[p.user_id] = p.last_seen;
                    }
                });

                setContacts(prev => prev.map(c => {
                    const isOnline = onlineIds.has(c.id);
                    const lastSeen = lastSeenMap[c.id];
                    if (c.online === isOnline && (lastSeen === undefined || c.lastSeen === lastSeen)) return c;
                    return { ...c, online: isOnline, lastSeen: lastSeen || c.lastSeen };
                }));
            })
            // ⌨️ BROADCAST: TYPING
            .on('broadcast', { event: 'typing' }, ({ payload }) => {
                if (!isMounted) return;
                if (payload.userId === user.id) return; // Ignore own events

                const targetUser = payload.targetId;
                if (targetUser === user.id) {
                    const senderId = payload.userId;
                    const isTyping = payload.isTyping;

                    if (typingTimeouts.current[senderId]) {
                        clearTimeout(typingTimeouts.current[senderId]);
                    }

                    setContacts(prev => prev.map(c => c.id === senderId ? { ...c, typing: isTyping } : c));

                    if (isTyping) {
                        typingTimeouts.current[senderId] = setTimeout(() => {
                            setContacts(prev => prev.map(c => c.id === senderId ? { ...c, typing: false } : c));
                        }, 3000);
                    }
                }
            })
            // ❤️ BROADCAST: REACTION SYNC
            .on('broadcast', { event: 'reaction_sync' }, ({ payload }) => {
                if (!isMounted) return;
                const { msgId, targetId, senderId, reactions } = payload;
                if (targetId !== user.id && senderId !== user.id) return;

                const validChatKey = senderId === user.id ? targetId : senderId;

                setAllMessages(prev => {
                    const msgs = prev[validChatKey] || [];
                    return { 
                        ...prev, 
                        [validChatKey]: msgs.map(msg => 
                            msg.id === msgId 
                            ? { ...msg, metadata: { ...msg.metadata, reactions, reaction: undefined, reaction_by: undefined } } 
                            : msg
                        ) 
                    };
                });

                setContacts(prev => prev.map(c => {
                    if (c.id === validChatKey) {
                        return { ...c, lastMessageMetadata: { ...c.lastMessageMetadata, reactions, reaction: undefined, reaction_by: undefined } };
                    }
                    return c;
                }));
            })
            // 📩 MESSAGE SYNC (POSTGRES CHANGES)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (payload) => {
                if (!isMounted) return;
                
                let m = payload.new as DbMessage;
                const oldM = payload.old as DbMessage;

                if (payload.eventType === 'DELETE') {
                    setAllMessages(prev => {
                        const updated = { ...prev };
                        Object.keys(updated).forEach(key => { 
                            const messages = updated[key] || [];
                            const messageMap = new Map(messages.map(msg => [msg.id, msg]));
                            messageMap.delete(oldM.id);
                            updated[key] = Array.from(messageMap.values());
                        });
                        return updated;
                    });
                    return;
                }

                if (!m || !m.id) return;

                if (payload.eventType === 'INSERT' && (!m.encrypted_content) && m.sender_id) {
                    const { data: fullMsg } = await supabase.from('messages').select('*').eq('id', m.id).single();
                    if (fullMsg) m = fullMsg;
                }

                if (!m.sender_id || !m.conversation_id) return;

                const { data: participantData } = await supabase
                    .from('conversation_participants')
                    .select('user_id')
                    .eq('conversation_id', m.conversation_id)
                    .neq('user_id', user.id)
                    .maybeSingle();

                if (!participantData) return;
                
                const otherId = participantData.user_id;
                const timeStr = new Date(m.created_at || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                if (payload.eventType === 'INSERT') {
                    let decryptedText = await decryptHybridMessage(privateKey, user.id, m.sender_id, m.encrypted_content);
                    
                    if (decryptedText === "🔒 [فشل فك التشفير - Decryption Failed]" || decryptedText === "🔒 [بيانات تالفة - Data Corrupted]") {
                        // لا تحاول فك التشفير مراراً وتكراراً للرسائل التالفة القديمة
                        decryptedText = decryptedText;
                    } else if (decryptedText.includes("فشل") || decryptedText.includes("Corrupted")) {
                        const { data: keyData } = await supabase.from('user_public_keys').select('public_key').eq('user_id', m.sender_id).maybeSingle();
                        if (keyData) decryptedText = await decryptHybridMessage(privateKey, user.id, m.sender_id, m.encrypted_content);
                    }

                    const newMsg: Message = { 
                        id: m.id, 
                        conversationId: m.conversation_id,
                        senderId: m.sender_id === user.id ? 'me' : m.sender_id, 
                        encryptedContent: decryptedText || m.encrypted_content,
                        timestamp: timeStr, 
                        status: m.status, 
                        replyToId: m.reply_to_id, 
                        expiresAt: m.expires_at || null, 
                        metadata: m.metadata || undefined 
                    };

                    setAllMessages(prev => {
                        const current = prev[otherId] || [];
                        const messageMap = new Map(current.map(msg => [msg.id, msg]));

                        const optimisticToReplace = current.find(x => 
                            x.isOptimistic && (
                                (x.tempId && newMsg.metadata?.tempId === x.tempId) ||
                                (x.encryptedContent === newMsg.encryptedContent)
                            )
                        );

                        if (optimisticToReplace) {
                            messageMap.delete(optimisticToReplace.id);
                        }

                        messageMap.set(newMsg.id, newMsg);
                        
                        return { 
                            ...prev, 
                            [otherId]: Array.from(messageMap.values()).sort((a, b) => {
                                const timeA = new Date(a.timestamp).getTime() || 0;
                                const timeB = new Date(b.timestamp).getTime() || 0;
                                return timeA - timeB;
                            })
                        };
                    });

                    // ⚡ Debounce UI contacts update to prevent stuttering in high frequency
                    if (contactsDebounceRef.current) clearTimeout(contactsDebounceRef.current);
                    contactsDebounceRef.current = setTimeout(() => {
                        setContacts(prev => prev.map(c => {
                            if (c.id === otherId) {
                                const isMe = m.sender_id === user.id;
                                const snippet = decryptedText.startsWith('[IMAGE]') 
                                    ? (isMe ? 'You: Photo' : 'Photo') 
                                    : decryptedText.startsWith('[AUDIO]') 
                                    ? (isMe ? 'You: Voice message' : 'Voice message') 
                                    : decryptedText;
                                return { ...c, lastMessage: snippet, time: timeStr, unread: (m.sender_id !== user.id && m.status !== 'read') ? c.unread + 1 : c.unread };
                            }
                            return c;
                        }));
                    }, 50);

                } else if (payload.eventType === 'UPDATE') {
                    const isUnsent = m.encrypted_content === '[UNSENT]' || m.metadata?.is_deleted;
                    const isEdited = m.metadata?.is_edited && !isUnsent;

                    // If the content itself changed (edit or unsend), we need to update it
                    let newDecryptedContent: string | null = null;
                    if (isUnsent) {
                        newDecryptedContent = '[UNSENT]';
                    } else if (isEdited && m.encrypted_content) {
                        try {
                            newDecryptedContent = await decryptHybridMessage(privateKey, user.id, m.sender_id, m.encrypted_content);
                        } catch {
                            newDecryptedContent = null; // Keep existing content on decrypt failure
                        }
                    }

                    setAllMessages(prev => {
                        const msgs = prev[otherId] || [];
                        const messageMap = new Map(msgs.map(msg => [msg.id, msg]));
                        const existing = messageMap.get(m.id);
                        if (existing) {
                            const updated = { 
                                ...existing, 
                                status: m.status, 
                                metadata: m.metadata || undefined,
                                ...(newDecryptedContent !== null ? { encryptedContent: newDecryptedContent } : {})
                            };
                            messageMap.set(m.id, updated);
                        }
                        return { ...prev, [otherId]: Array.from(messageMap.values()) };
                    });

                    // Update sidebar for status changes
                    if (m.status === 'read' && m.sender_id !== user.id) {
                        setContacts(prev => prev.map(c => c.id === otherId ? { ...c, unread: 0 } : c));
                    }

                    // Update sidebar snippet for edit/unsend
                    if (newDecryptedContent !== null) {
                        setContacts(prev => prev.map(c => {
                            if (c.id === otherId) {
                                const snippet = isUnsent 
                                    ? '🗑️ Message deleted' 
                                    : newDecryptedContent!.startsWith('[IMAGE]') ? 'Photo' 
                                    : newDecryptedContent!.startsWith('[AUDIO]') ? 'Voice message' 
                                    : newDecryptedContent!;
                                return { ...c, lastMessage: snippet };
                            }
                            return c;
                        }));
                    }
                }
            })
            // 🚀 INITIALIZE
            .subscribe(async (status) => {
                try {

                                if (status === 'SUBSCRIBED' && isMounted) {
                                    await channel.track({ user_id: user.id, is_active: true, last_seen: new Date().toISOString() });
                                }
                            
                } catch (error) {
                  console.error('[usePresence.ts] [anonymous_function]:', error);
                }
            });

        return () => {
            isMounted = false;
            channel.unsubscribe();
            Object.values(typingTimeouts.current).forEach(t => clearTimeout(t));
            if (contactsDebounceRef.current) clearTimeout(contactsDebounceRef.current);
        };
    }, [user, keysReady, privateKey, setContacts, setAllMessages]);

    return null;
}
