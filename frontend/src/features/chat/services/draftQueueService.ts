import { get, set } from 'idb-keyval';

export interface DraftData {
    text: string;
    replyToId?: string;
    attachments?: string[];
}

export interface PendingPayload {
    tempId: string;
    targetRecipientId: string;
    targetConversationId?: string;
    payload: string;
    replyId?: string;
    retryCount: number;
    createdAt: number;
    mediaFile?: File;
}

const DRAFT_PREFIX = 'chat_draft_';
const QUEUE_KEY = 'chat_pending_queue';
const FAILED_QUEUE_KEY = 'chat_failed_queue';

export const draftQueueService = {
    // ---- Drafts Management ----
    async saveDraft(chatId: string, data: DraftData): Promise<void> {
        try {
            await set(`${DRAFT_PREFIX}${chatId}`, data);
        } catch (err) {
            console.warn('Failed to save draft', err);
        }
    },

    async getDraft(chatId: string): Promise<DraftData | undefined> {
        try {
            return await get<DraftData>(`${DRAFT_PREFIX}${chatId}`);
        } catch (err) {
            console.warn('Failed to get draft', err);
            return undefined;
        }
    },

    async clearDraft(chatId: string): Promise<void> {
        try {
            // idb-keyval `del` can be used, but `set` to undefined also works
            import('idb-keyval').then(({ del }) => del(`${DRAFT_PREFIX}${chatId}`));
        } catch (err) {
            console.warn('Failed to clear draft', err);
        }
    },

    // ---- Pending Queue Management ----
    async getPendingQueue(): Promise<PendingPayload[]> {
        try {
            return (await get<PendingPayload[]>(QUEUE_KEY)) || [];
        } catch (err) {
            console.warn('Failed to get pending queue', err);
            return [];
        }
    },

    async enqueueMessage(msg: PendingPayload): Promise<void> {
        try {
            const queue = await this.getPendingQueue();
            const existingIndex = queue.findIndex(q => q.tempId === msg.tempId);
            
            if (existingIndex >= 0) {
                // If it already exists, just update the retry count
                queue[existingIndex].retryCount = (queue[existingIndex].retryCount || 0) + 1;
            } else {
                queue.push(msg);
            }
            
            // Sort by createdAt just in case
            queue.sort((a, b) => a.createdAt - b.createdAt);
            await set(QUEUE_KEY, queue);
        } catch (err) {
            console.warn('Failed to enqueue message', err);
        }
    },

    async removeFromQueue(tempId: string): Promise<void> {
        try {
            const queue = await this.getPendingQueue();
            const filtered = queue.filter(q => q.tempId !== tempId);
            await set(QUEUE_KEY, filtered);
        } catch (err) {
            console.warn('Failed to remove from queue', err);
        }
    },

    // ---- Failed Queue Management ----
    async moveToFailedQueue(msg: PendingPayload): Promise<void> {
        try {
            await this.removeFromQueue(msg.tempId);
            const failed = (await get<PendingPayload[]>(FAILED_QUEUE_KEY)) || [];
            if (!failed.some(f => f.tempId === msg.tempId)) {
                failed.push(msg);
                await set(FAILED_QUEUE_KEY, failed);
            }
        } catch (err) {
            console.warn('Failed to move to failed queue', err);
        }
    }
};
