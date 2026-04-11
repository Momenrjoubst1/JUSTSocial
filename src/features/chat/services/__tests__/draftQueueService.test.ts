/**
 * DraftQueueService — Unit Tests
 *
 * Covers:
 *  1. Draft CRUD (save, get, clear)
 *  2. Pending queue (enqueue, dequeue, ordering)
 *  3. Duplicate tempId resilience (idempotent re-enqueue)
 *  4. Failed queue (move from pending → failed, dedup)
 *  5. Graceful error handling when IDB fails
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval at module level
const store = new Map<string, any>();

vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(store.get(key))),
  set: vi.fn((key: string, val: any) => {
    store.set(key, val);
    return Promise.resolve();
  }),
  del: vi.fn((key: string) => {
    store.delete(key);
    return Promise.resolve();
  }),
}));

import { draftQueueService, type DraftData, type PendingPayload } from '../draftQueueService';

function makePending(overrides: Partial<PendingPayload> = {}): PendingPayload {
  return {
    tempId: `temp-${Math.random().toString(36).slice(2, 8)}`,
    targetRecipientId: 'user-abc',
    targetConversationId: 'conv-1',
    payload: 'E2EE:v2:encrypted-content',
    retryCount: 0,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('draftQueueService', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  // ── 1. Draft Management ───────────────────────────────────
  describe('drafts', () => {
    it('saves and retrieves a draft', async () => {
      const draft: DraftData = { text: 'Hello draft', replyToId: 'msg-1' };
      await draftQueueService.saveDraft('chat-123', draft);
      const retrieved = await draftQueueService.getDraft('chat-123');
      expect(retrieved).toEqual(draft);
    });

    it('returns undefined for non-existent draft', async () => {
      const result = await draftQueueService.getDraft('nonexistent');
      expect(result).toBeUndefined();
    });

    it('clears a draft', async () => {
      await draftQueueService.saveDraft('chat-1', { text: 'temp' });
      await draftQueueService.clearDraft('chat-1');
      // Note: clearDraft uses dynamic import internally, so we check idb-keyval del was called
      const { del } = await import('idb-keyval');
      expect(del).toHaveBeenCalledWith('chat_draft_chat-1');
    });

    it('overwrites existing draft', async () => {
      await draftQueueService.saveDraft('chat-1', { text: 'first' });
      await draftQueueService.saveDraft('chat-1', { text: 'second' });
      const result = await draftQueueService.getDraft('chat-1');
      expect(result?.text).toBe('second');
    });

    it('handles drafts with attachments', async () => {
      const draft: DraftData = {
        text: 'with media',
        attachments: ['blob://img1', 'blob://img2'],
      };
      await draftQueueService.saveDraft('chat-media', draft);
      const result = await draftQueueService.getDraft('chat-media');
      expect(result?.attachments).toHaveLength(2);
    });
  });

  // ── 2. Pending Queue ──────────────────────────────────────
  describe('pendingQueue', () => {
    it('starts empty', async () => {
      const queue = await draftQueueService.getPendingQueue();
      expect(queue).toEqual([]);
    });

    it('enqueues a message', async () => {
      const msg = makePending();
      await draftQueueService.enqueueMessage(msg);
      const queue = await draftQueueService.getPendingQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].tempId).toBe(msg.tempId);
    });

    it('enqueues multiple messages and sorts by createdAt', async () => {
      const m1 = makePending({ tempId: 'a', createdAt: 300 });
      const m2 = makePending({ tempId: 'b', createdAt: 100 });
      const m3 = makePending({ tempId: 'c', createdAt: 200 });

      await draftQueueService.enqueueMessage(m1);
      await draftQueueService.enqueueMessage(m2);
      await draftQueueService.enqueueMessage(m3);

      const queue = await draftQueueService.getPendingQueue();
      expect(queue.map(q => q.tempId)).toEqual(['b', 'c', 'a']);
    });

    it('removes a message from the queue', async () => {
      const m1 = makePending({ tempId: 'keep' });
      const m2 = makePending({ tempId: 'remove' });

      await draftQueueService.enqueueMessage(m1);
      await draftQueueService.enqueueMessage(m2);
      await draftQueueService.removeFromQueue('remove');

      const queue = await draftQueueService.getPendingQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].tempId).toBe('keep');
    });

    it('removeFromQueue is a no-op for non-existent tempId', async () => {
      const msg = makePending({ tempId: 'exists' });
      await draftQueueService.enqueueMessage(msg);
      await draftQueueService.removeFromQueue('does-not-exist');

      const queue = await draftQueueService.getPendingQueue();
      expect(queue).toHaveLength(1);
    });
  });

  // ── 3. Idempotent Re-Enqueue ──────────────────────────────
  describe('duplicate tempId handling', () => {
    it('re-enqueue with same tempId increments retryCount instead of duplicating', async () => {
      const msg = makePending({ tempId: 'dup-1', retryCount: 0 });
      await draftQueueService.enqueueMessage(msg);
      await draftQueueService.enqueueMessage(msg);

      const queue = await draftQueueService.getPendingQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].retryCount).toBe(1);
    });

    it('third re-enqueue increments retryCount to 2', async () => {
      const msg = makePending({ tempId: 'dup-2', retryCount: 0 });
      await draftQueueService.enqueueMessage(msg);
      await draftQueueService.enqueueMessage(msg);
      await draftQueueService.enqueueMessage(msg);

      const queue = await draftQueueService.getPendingQueue();
      expect(queue[0].retryCount).toBe(2);
    });
  });

  // ── 4. Failed Queue ───────────────────────────────────────
  describe('failedQueue', () => {
    it('moves a message from pending to failed queue', async () => {
      const msg = makePending({ tempId: 'fail-me' });
      await draftQueueService.enqueueMessage(msg);

      await draftQueueService.moveToFailedQueue(msg);

      // Should be removed from pending
      const pending = await draftQueueService.getPendingQueue();
      expect(pending.find(p => p.tempId === 'fail-me')).toBeUndefined();

      // Should be in failed queue
      const failed = store.get('chat_failed_queue') || [];
      expect(failed.find((f: PendingPayload) => f.tempId === 'fail-me')).toBeDefined();
    });

    it('does not duplicate in failed queue on repeated move', async () => {
      const msg = makePending({ tempId: 'fail-dedup' });
      await draftQueueService.enqueueMessage(msg);

      await draftQueueService.moveToFailedQueue(msg);
      await draftQueueService.moveToFailedQueue(msg);

      const failed = store.get('chat_failed_queue') || [];
      const matches = failed.filter((f: PendingPayload) => f.tempId === 'fail-dedup');
      expect(matches).toHaveLength(1);
    });
  });

  // ── 5. Error Resilience ───────────────────────────────────
  describe('error handling', () => {
    it('getDraft returns undefined when IDB throws', async () => {
      const { get: idbGet } = await import('idb-keyval');
      vi.mocked(idbGet).mockRejectedValueOnce(new Error('IDB crash'));

      const result = await draftQueueService.getDraft('any-chat');
      expect(result).toBeUndefined();
    });

    it('getPendingQueue returns empty array when IDB throws', async () => {
      const { get: idbGet } = await import('idb-keyval');
      vi.mocked(idbGet).mockRejectedValueOnce(new Error('IDB crash'));

      const result = await draftQueueService.getPendingQueue();
      expect(result).toEqual([]);
    });

    it('enqueueMessage does not throw when IDB fails', async () => {
      const { set: idbSet } = await import('idb-keyval');
      vi.mocked(idbSet).mockRejectedValueOnce(new Error('Write failed'));

      // Should not throw — just warn
      await expect(
        draftQueueService.enqueueMessage(makePending()),
      ).resolves.not.toThrow();
    });
  });
});
