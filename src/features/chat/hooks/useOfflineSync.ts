import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { draftQueueService } from '../services/draftQueueService';
import { useSendMessage } from './useSendMessage';
import { useChatContext } from '../ChatProvider';
import { useE2EE } from './useE2EE';

export function useOfflineSync() {
    const { keysReady } = useE2EE();
    const { sendMessage } = useSendMessage();
    const { allMessages } = useChatContext();
    const [pendingCount, setPendingCount] = useState(0);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const isSyncing = useRef(false);

    const allMessagesRef = useRef(allMessages);
    
    useEffect(() => {
        allMessagesRef.current = allMessages;
    }, [allMessages]);

    // Track network status
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const processQueue = async () => {
        if (isOffline || isSyncing.current || !keysReady) return;
        
        isSyncing.current = true;
        try {
            const queue = await draftQueueService.getPendingQueue();
            setPendingCount(queue.length);
            
            if (queue.length === 0) {
                isSyncing.current = false;
                return;
            }

            for (const msg of queue) {
                // Idempotency: Check if tempId is already in allMessages
                const userMsgs = allMessagesRef.current[msg.targetRecipientId] || [];
                const alreadySentLocal = userMsgs.some(m => m.tempId === msg.tempId && m.status !== 'pending');
                
                let alreadySentRemote = false;
                if (!alreadySentLocal) {
                    try {
                        const { data } = await supabase
                            .from('messages')
                            .select('id')
                            .contains('metadata', { tempId: msg.tempId })
                            .maybeSingle();
                        if (data) alreadySentRemote = true;
                    } catch (e) {
                        // Ignore lookup errors and proceed
                    }
                }

                if (alreadySentLocal || alreadySentRemote) {
                    await draftQueueService.removeFromQueue(msg.tempId);
                    continue;
                }

                if (msg.retryCount >= 3) {
                    await draftQueueService.moveToFailedQueue(msg);
                    continue;
                }

                await draftQueueService.removeFromQueue(msg.tempId);
                await sendMessage(msg.payload, msg.replyId, msg.targetRecipientId, msg.tempId, msg.mediaFile);
            }
            
            const updatedQueue = await draftQueueService.getPendingQueue();
            setPendingCount(updatedQueue.length);
        } catch (err) {
            console.error("Offline sync error:", err);
        } finally {
            isSyncing.current = false;
        }
    };

    useEffect(() => {
        if (isOffline) {
            draftQueueService.getPendingQueue().then(q => setPendingCount(q.length));
            return;
        }

        processQueue();
        const interval = setInterval(processQueue, 15000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOffline, keysReady]); 

    return { isOffline, pendingCount, processQueue };
}
