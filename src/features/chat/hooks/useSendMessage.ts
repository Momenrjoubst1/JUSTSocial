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

        // Target resolving directly via API
        let targetConversationId = targetRecipientId === activeChat?.id 
            ? activeChat?.conversationId 
            : contacts.find(c => c.id === targetRecipientId)?.conversationId;

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

        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                conversationId: targetConversationId,
                targetId: targetRecipientId,
                content: encryptedText,
                type: mediaMetadataRow?.mime_type?.startsWith('image') ? 'image' : 'text',
                replyToId: replyId,
                mediaId: null // Support for actual attachments API via backend
            })
        });

        const resData = res.ok ? await res.json() : null;
        const dbMsg = resData?.message;
        const error = !res.ok ? (resData || { message: 'Network or API error' }) : null;

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
            
            // Insert media metadata is now handled securely via messaging API layer in future updates (Phase 2 core api modification)

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



