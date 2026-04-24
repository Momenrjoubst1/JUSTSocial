import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAnimation } from 'framer-motion';
import { useAuthContext } from '@/context/AuthContext';
import { useChatContext } from '@/features/chat/ChatProvider';
import { supabase } from '@/lib/supabaseClient';
import { Message } from '@/features/chat/types/chat.types';
import { useE2EE } from '@/features/chat/hooks/useE2EE';
import { encryptHybridMessage } from '@/features/chat/services/crypto';

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes — must match the Edge Function

export function useMessageLogic(msg: Message, isLatestInChat: boolean = false) {
    const { user } = useAuthContext();
    const { setAllMessages, activeChat, setContacts } = useChatContext();
    const { publicKey, getRecipientPublicKey } = useE2EE();
    
    const isExpired = false;
    const timeLeftStr = null;
    const isDisappearing = false;
    const [isRevealed, setIsRevealed] = useState(true);
    const [showHeartPop, setShowHeartPop] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    
    const lastTapRef = useRef<number>(0);
    const bubbleControls = useAnimation();

    // ════════════════════════════════════════════════════════════════
    // CAN EDIT?  (within 15-min window + sender owns the message)
    // ════════════════════════════════════════════════════════════════
    const isMe = msg.senderId === user?.id || msg.senderId === 'me';
    const isUnsent = msg.metadata?.is_deleted === true;

    const canEdit = (() => {
        if (!isMe || isUnsent) return false;
        if (msg.encryptedContent?.startsWith('[IMAGE]') || msg.encryptedContent?.startsWith('[AUDIO]')) return false;
        const createdAt = msg.createdAt ? new Date(msg.createdAt).getTime() : 0;
        if (!createdAt) return false;
        return (Date.now() - createdAt) < EDIT_WINDOW_MS;
    })();

    const canUnsend = isMe && !isUnsent;

    // ════════════════════════════════════════════════════════════════
    // EDIT MESSAGE
    // ════════════════════════════════════════════════════════════════
    const handleEditMessage = useCallback(async (newText: string) => {
        if (!activeChat || !user || !canEdit || !newText.trim()) return false;

        try {
            // 1. Re-encrypt the new text with both public keys
            const recipientPubKey = await getRecipientPublicKey(activeChat.id);
            const newEncrypted = await encryptHybridMessage(recipientPubKey, publicKey as string, newText.trim());
            
            if (!newEncrypted || newEncrypted === newText.trim()) {
                console.error('[Edit] Re-encryption failed, aborting edit');
                return false;
            }

            // 2. Optimistic UI update
            setAllMessages(prev => {
                const messages = prev[activeChat.id] || [];
                return {
                    ...prev,
                    [activeChat.id]: messages.map(m =>
                        m.id === msg.id
                        ? { 
                            ...m, 
                            encryptedContent: newText.trim(), // Show decrypted text locally
                            metadata: { ...m.metadata, is_edited: true, edit_count: (m.metadata?.edit_count || 0) + 1 } 
                          }
                        : m
                    )
                };
            });

            // 3. Call Edge Function for server-side validation & update
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-message-action`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messageId: msg.id,
                        action: 'edit',
                        newEncryptedContent: newEncrypted,
                    }),
                }
            );

            const result = await res.json();

            if (!res.ok || !result.allowed) {
                // Rollback optimistic update
                console.error('[Edit] Server rejected:', result.error);
                setAllMessages(prev => {
                    const messages = prev[activeChat.id] || [];
                    return {
                        ...prev,
                        [activeChat.id]: messages.map(m =>
                            m.id === msg.id ? { ...m, encryptedContent: msg.encryptedContent, metadata: msg.metadata } : m
                        )
                    };
                });
                return false;
            }

            // Update sidebar if it was the latest message
            if (isLatestInChat) {
                setContacts(prev => prev.map(c => 
                    c.id === activeChat.id 
                    ? { ...c, lastMessage: newText.trim() }
                    : c
                ));
            }

            return true;
        } catch (err) {
            console.error('[Edit] Unexpected error:', err);
            return false;
        }
    }, [activeChat, user, canEdit, msg, publicKey, getRecipientPublicKey, setAllMessages, setContacts, isLatestInChat]);

    // ════════════════════════════════════════════════════════════════
    // UNSEND MESSAGE (Delete for everyone)
    // ════════════════════════════════════════════════════════════════
    const handleUnsendMessage = useCallback(async () => {
        if (!activeChat || !user || !canUnsend) return false;

        try {
            // 1. Optimistic UI
            setAllMessages(prev => {
                const messages = prev[activeChat.id] || [];
                return {
                    ...prev,
                    [activeChat.id]: messages.map(m =>
                        m.id === msg.id
                        ? { 
                            ...m, 
                            encryptedContent: '[UNSENT]',
                            metadata: { ...m.metadata, is_deleted: true, reactions: undefined } 
                          }
                        : m
                    )
                };
            });

            // Update sidebar immediately
            if (isLatestInChat) {
                setContacts(prev => prev.map(c => 
                    c.id === activeChat.id 
                    ? { ...c, lastMessage: '🗑️ Message deleted' }
                    : c
                ));
            }

            // 2. Call Edge Function
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-message-action`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messageId: msg.id,
                        action: 'unsend',
                    }),
                }
            );

            const result = await res.json();

            if (!res.ok || !result.allowed) {
                console.error('[Unsend] Server rejected:', result.error);
                // Rollback
                setAllMessages(prev => {
                    const messages = prev[activeChat.id] || [];
                    return {
                        ...prev,
                        [activeChat.id]: messages.map(m =>
                            m.id === msg.id ? { ...m, encryptedContent: msg.encryptedContent, metadata: msg.metadata } : m
                        )
                    };
                });
                return false;
            }

            return true;
        } catch (err) {
            console.error('[Unsend] Unexpected error:', err);
            return false;
        }
    }, [activeChat, user, canUnsend, msg, setAllMessages, setContacts, isLatestInChat]);

    // ════════════════════════════════════════════════════════════════
    // REACTIONS (unchanged logic)
    // ════════════════════════════════════════════════════════════════
    const handleReaction = async (emoji: string | null) => {
        try {

                const oldReactions = msg.metadata?.reactions || {};
                const activeReactions = { ...oldReactions };

                if (msg.metadata?.reaction && msg.metadata?.reaction_by && !activeReactions[msg.metadata.reaction_by]) {
                    activeReactions[msg.metadata.reaction_by] = msg.metadata.reaction;
                }

                const isCurrent = user?.id ? activeReactions[user.id] === emoji : false;
                if (emoji === '❤️' && !isCurrent) {
                    setShowHeartPop(true);
                    setTimeout(() => setShowHeartPop(false), 600);
                    if (navigator.vibrate) navigator.vibrate(50);
                }

                if (user?.id) {
                    if (isCurrent) {
                        delete activeReactions[user.id];
                    } else if (emoji) {
                        activeReactions[user.id] = emoji;
                    }
                }

                if (activeChat) {
                    setAllMessages(prev => {
                        const messages = prev[activeChat.id] || [];
                        return {
                            ...prev,
                            [activeChat.id]: messages.map(m => 
                                m.id === msg.id 
                                ? { ...m, metadata: { ...m.metadata, reactions: activeReactions, reaction: undefined, reaction_by: undefined } } 
                                : m
                            )
                        };
                    });
                    
                    if (isLatestInChat) {
                        setContacts((prevContacts) => 
                            prevContacts.map(c => {
                                if (c.id === activeChat.id) {
                                    return { 
                                        ...c, 
                                        lastMessageMetadata: { ...msg.metadata, reactions: activeReactions, reaction: undefined, reaction_by: undefined } 
                                    };
                                }
                                return c;
                            })
                        );
                    }

                    const chatChannel = supabase.getChannels().find(c => c.topic === 'realtime:chat_main');
                    if (chatChannel) {
                        chatChannel.send({
                            type: 'broadcast',
                            event: 'reaction_sync',
                            payload: { 
                                msgId: msg.id, 
                                targetId: activeChat.id,
                                senderId: user?.id,
                                reactions: activeReactions
                            }
                        });
                    }
                }

                const newMetadata = { 
                    ...msg.metadata, 
                    reactions: activeReactions,
                    reaction: undefined,
                    reaction_by: undefined
                };
                
                const { error } = await supabase.from('messages')
                    .update({ metadata: newMetadata })
                    .eq('id', msg.id);
                
                if (error) console.error('Failed to sync reaction:', error);
            
        } catch (error) {
          console.error('[useMessageLogic.ts] [handleReaction]:', error);
        }
    };

    // Double Tap Logic
    const handleDoubleTap = async () => {
        try {

                const now = Date.now();
                const DOUBLE_TAP_DELAY = 300;
                if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
                    bubbleControls.start({
                        scale: [1, 0.92, 1],
                        transition: { duration: 0.2, times: [0, 0.5, 1], ease: "easeInOut" }
                    });
                    handleReaction('❤️');
                }
                lastTapRef.current = now;
            
        } catch (error) {
          console.error('[useMessageLogic.ts] [handleDoubleTap]:', error);
        }
    };


    return {
        isExpired,
        timeLeftStr,
        isRevealed,
        setIsRevealed,
        showHeartPop,
        setShowHeartPop,
        showImageModal,
        setShowImageModal,
        bubbleControls,
        handleDoubleTap,
        handleReaction,
        isDisappearing,
        // New Edit/Unsend API
        canEdit,
        canUnsend,
        handleEditMessage,
        handleUnsendMessage,
    };
}
