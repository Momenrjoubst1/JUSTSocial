import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthContext } from '@/context/AuthContext';
import { useChatContext } from '@/features/chat/ChatProvider';
import { useNavigate } from 'react-router-dom';
import { Message } from '@/features/chat/types/chat.types';
import { useE2EE } from '@/features/chat/hooks/useE2EE';
import { encryptHybridMessage } from '@/features/chat/services/crypto';
import { useChatSound } from './useChatSound';
import { draftQueueService } from '@/features/chat/services/draftQueueService';

export function useSendMessage() {
    const { user } = useAuthContext();
    const { activeChat, setAllMessages, setContacts, setReplyingTo, contacts } = useChatContext();
    const navigate = useNavigate();
    const [isSending, setIsSending] = useState(false);
    const { getRecipientPublicKey, publicKey: myPubKey } = useE2EE();
    const { playPopSound } = useChatSound();

    const sendMessage = async (textPayload: string, replyId?: string, recipientId?: string, providedTempId?: string, mediaFile?: File) => {
        const targetRecipientId = recipientId || activeChat?.id;
        if ((!textPayload.trim() && !mediaFile) || !targetRecipientId || !user) return;

        try {
            const { data: banData } = await supabase
                .from('banned_users')
                .select('reason')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle();

            if (banData) {
                navigate('/banned', { replace: true, state: { reason: banData.reason } });
                return;
            }
        } catch (err) {
            console.error("Critical ban check failed", err);
        }

        let finalPayload = textPayload.trim();

        // 1. Find or Create Conversation FIRST
        let targetConversationId = targetRecipientId === activeChat?.id 
            ? activeChat?.conversationId 
            : contacts.find(c => c.id === targetRecipientId)?.conversationId;

        if (!targetConversationId) {
            // Check if there is already a direct conversation between these two users
            const { data: myParticipants } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', user.id);
            if (myParticipants && myParticipants.length > 0) {
                const myConvIds = myParticipants.map(p => p.conversation_id);
                const { data: targetParticipants } = await supabase.from('conversation_participants')
                    .select('conversation_id')
                    .in('conversation_id', myConvIds)
                    .eq('user_id', targetRecipientId);
                
                if (targetParticipants && targetParticipants.length > 0) {
                    targetConversationId = targetParticipants[0].conversation_id;
                }
            }

            // Create new conversation if not found
            if (!targetConversationId) {
                const { data: newConv, error: convError } = await supabase.from('conversations').insert({ is_group: false }).select('id').single();
                if (newConv && !convError) {
                    targetConversationId = newConv.id;
                    await supabase.from('conversation_participants').insert([
                        { conversation_id: targetConversationId, user_id: user.id },
                        { conversation_id: targetConversationId, user_id: targetRecipientId }
                    ]);
                    
                    // Update activeChat's conversationId in contacts list if needed
                    setContacts(prev => prev.map(c => c.id === targetRecipientId ? { ...c, conversationId: targetConversationId } : c));
                }
            }
        }

        const optimisticId = providedTempId || `opt-${crypto.randomUUID()}`;
        const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const isImage = finalPayload.startsWith('[IMAGE]') || (mediaFile && mediaFile.type.startsWith('image/'));
        const isAudio = finalPayload.startsWith('[AUDIO]') || (mediaFile && mediaFile.type.startsWith('audio/'));
        const isSystemAlert = finalPayload.startsWith('🚨 [تنبيه أمني]');
        const lastMsgSnippet = isSystemAlert ? 'تنبيه أمني محاولة التقاط شاشة 🚨' : isImage ? '📷 Photo attached' : isAudio ? 'Voice message 🎤' : finalPayload;

        const optimisticMsg: Message = {
            id: optimisticId,
            conversationId: targetConversationId || 'temp-conv', // Will be real after send
            senderId: 'me',
            encryptedContent: mediaFile ? `[UPLOADING_MEDIA] ${finalPayload}` : finalPayload, // Optimistic view uses plain text or uploading placeholder
            timestamp: timeStr,
            status: 'pending',
            replyToId: replyId || undefined,
            isOptimistic: true,
            tempId: optimisticId, 
            expiresAt: null
        };

        // Add optimistic UI to appropriate message array ONLY if not providedTempId (already optimistic)
        if (!providedTempId) {
            setAllMessages(prev => ({
                ...prev,
                [targetRecipientId]: [...(prev[targetRecipientId] || []), optimisticMsg]
            }));
            
            if (targetRecipientId === activeChat?.id) {
                setReplyingTo(null);
            }
        }

        setContacts(prev => prev.map(c =>
            c.id === targetRecipientId ? { ...c, lastMessage: lastMsgSnippet, time: 'Now' } : c
        ));
        
        setIsSending(true);

        let pLoad = finalPayload;
        let moderationMetadata = undefined;

        try {
            if (pLoad) {
                const { data: modResult, error: modError } = await supabase.functions.invoke('check-content-moderation', {
                    body: { text: pLoad, userId: user.id }
                });

                if (modError) throw modError;

                if (modResult && modResult.allowed === false) {
                    alert('عذراً، محتوى الرسالة يطابق كلمات محظورة بشدة أو تم حظر حسابك بحد التكرار.');
                    setAllMessages(prev => {
                        const targetMsgs = prev[targetRecipientId] || [];
                        return { ...prev, [targetRecipientId]: targetMsgs.filter(m => m.id !== optimisticId) };
                    });
                    setIsSending(false);
                    return;
                }

                if (modResult && modResult.allowed === true && modResult.severity > 0) {
                    pLoad = modResult.censoredText || pLoad;
                    moderationMetadata = { moderation_status: 'flagged', severity: modResult.severity };
                }
            }
        } catch (err) {
            console.error("Moderation check failed", err);
        }

        let mediaMetadataRow: any = null;

        if (mediaFile && targetConversationId) {
            try {
                const { uploadEncryptedMedia } = await import('../services/cryptoMedia');
                const uploadResult = await uploadEncryptedMedia(mediaFile, targetConversationId);
                // We construct the hidden E2EE media string
                // Format: E2EE_MEDIA:v1:{keyB64}:{ivB64}:{storagePath}|caption
                pLoad = `E2EE_MEDIA:v1:${uploadResult.keyB64}:${uploadResult.ivB64}:${uploadResult.storagePath}|${pLoad}`;
                
                // Prepare the media_attachments row to be inserted afterwards
                mediaMetadataRow = {
                    storage_path: uploadResult.storagePath,
                    mime_type: uploadResult.mimeType,
                    file_size: uploadResult.size
                };
            } catch (err) {
                console.error("Encrypted media upload failed", err);
                setIsSending(false);
                // Handle offline fallback for media if needed 
                // For now, simple alert or fall back to sending failure
                alert("Failed to upload media securely. Please check connection.");
                return;
            }
        }

        const recipientPubKey = await getRecipientPublicKey(targetRecipientId);
        const encryptedText = await encryptHybridMessage(recipientPubKey, myPubKey, pLoad);

        // Check if message should be active or pending (Message requests feature)
        let messageStatus = 'active';
        try {
            const { data: routeData, error: routeError } = await supabase.functions.invoke('route-incoming-message', {
                body: { receiverId: targetRecipientId }
            });
            if (!routeError && routeData?.status) {
                messageStatus = routeData.status;
            }
        } catch (err) {
            console.error("Routing check failed", err);
        }

        const baseMetadata = { tempId: optimisticId, message_status: messageStatus };
        const finalMetadata = moderationMetadata ? { ...baseMetadata, ...moderationMetadata } : baseMetadata;

        const newDbMsg: any = {
            conversation_id: targetConversationId,
            sender_id: user.id,
            encrypted_content: encryptedText,
            status: 'sent',
            reply_to_id: replyId || null,
            expires_at: null,
            metadata: finalMetadata
        };

        const { data: dbMsg, error } = await supabase.from('messages').insert([newDbMsg]).select().single();

        setIsSending(false);

        if (error) {
            console.error("Message insert error:", error);
            if (error.code === 'P0001' || error.code === '23505' || error.message.includes('banned')) {
                alert('فشل الإرسال بسبب محتوى مخالف أو أن حسابك محظور.');
                setAllMessages(prev => {
                    const targetMsgs = prev[targetRecipientId] || [];
                    return { ...prev, [targetRecipientId]: targetMsgs.filter(m => m.id !== optimisticId) };
                });
            } else {
                console.warn("Network error sending message, moving to offline queue", error);
                await draftQueueService.enqueueMessage({
                    tempId: optimisticId,
                    targetRecipientId,
                    targetConversationId: targetConversationId || undefined,
                    payload: finalPayload,
                    replyId,
                    retryCount: 0,
                    createdAt: Date.now(),
                    mediaFile
                });
            }
        } else {
            // Success Block
            
            // Insert media metadata if any
            if (mediaMetadataRow && dbMsg) {
                try {
                    await supabase.from('media_attachments').insert([{
                        message_id: dbMsg.id,
                        ...mediaMetadataRow
                    }]);
                } catch (err) {
                    console.error("Failed to insert media metadata hook", err);
                }
            }

            await draftQueueService.removeFromQueue(optimisticId);
            await draftQueueService.clearDraft(targetRecipientId);

            setAllMessages(prev => {
                const targetMsgs = prev[targetRecipientId] || [];
                const updated = targetMsgs.map(m => m.id === optimisticId ? { ...m, status: 'sent' as const, id: dbMsg.id } : m);
                return { ...prev, [targetRecipientId]: updated };
            });
            
            if (targetRecipientId === activeChat?.id && !providedTempId) {
                playPopSound('send');
            }
        }
    };

    return { sendMessage, isSending };
}
