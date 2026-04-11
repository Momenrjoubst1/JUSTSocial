import { describe, it, expect, vi, beforeEach } from 'vitest';
import redis from '../../config/redis-client';
import {
  saveRoom, getRoom, deleteRoom,
  findAvailableRoom, addParticipant, removeParticipant,
  findOrCreateRoom
} from '../../services/room.service';
import { makeRoom, makeParticipantId } from '../factories';

describe('room.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('saveRoom', () => {
    it('stores room as JSON in Redis with TTL', async () => {
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');
      vi.mocked(redis.sadd).mockResolvedValueOnce(1);

      const room = makeRoom();
      await saveRoom(room);

      expect(redis.setex).toHaveBeenCalledWith(
        `room:${room.roomName}`,
        14400,
        JSON.stringify(room),
      );
    });

    // ── Edge Cases ──────────────────────────────────────────
    it('saves room with 2 participants correctly', async () => {
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');
      vi.mocked(redis.sadd).mockResolvedValueOnce(1);

      const p1 = makeParticipantId();
      const p2 = makeParticipantId();
      const room = makeRoom({ participants: [p1, p2] });

      await saveRoom(room);

      const savedJson = vi.mocked(redis.setex).mock.calls[0][2] as string;
      const saved = JSON.parse(savedJson);
      expect(saved.participants).toHaveLength(2);
    });

    // ── Error Cases ──────────────────────────────────────────
    it('throws when Redis setex fails', async () => {
      vi.mocked(redis.setex).mockRejectedValueOnce(new Error('Redis OOM'));
      const room = makeRoom();
      await expect(saveRoom(room)).rejects.toThrow('Redis OOM');
    });
  });

  describe('getRoom', () => {
    it('returns parsed room when key exists', async () => {
      const room = makeRoom();
      vi.mocked(redis.get).mockResolvedValueOnce(JSON.stringify(room));

      const result = await getRoom(room.roomName);
      expect(result).toEqual(room);
    });

    it('returns null when key does not exist', async () => {
      vi.mocked(redis.get).mockResolvedValueOnce(null);
      const result = await getRoom('nonexistent-room');
      expect(result).toBeNull();
    });

    // ── Edge Cases ──────────────────────────────────────────
    it('returns null for empty string key', async () => {
      vi.mocked(redis.get).mockResolvedValueOnce(null);
      const result = await getRoom('');
      expect(result).toBeNull();
    });

    // ── Error Cases ──────────────────────────────────────────
    it('throws when Redis get fails', async () => {
      vi.mocked(redis.get).mockRejectedValueOnce(new Error('Redis connection lost'));
      await expect(getRoom('room-123')).rejects.toThrow();
    });

    it('throws when stored JSON is corrupted', async () => {
      vi.mocked(redis.get).mockResolvedValueOnce('{{invalid json}}');
      await expect(getRoom('room-123')).rejects.toThrow();
    });
  });

  describe('findAvailableRoom', () => {
    // ── Edge Cases ──────────────────────────────────────────
    it('returns null when no rooms exist for country', async () => {
      vi.mocked(redis.smembers).mockResolvedValueOnce([]);
      const result = await findAvailableRoom('SA');
      expect(result).toBeNull();
    });

    it('skips full rooms (2 participants) and returns null', async () => {
      const p1 = makeParticipantId();
      const p2 = makeParticipantId();
      const fullRoom = makeRoom({ participants: [p1, p2] });

      vi.mocked(redis.smembers).mockResolvedValueOnce([fullRoom.roomName]);
      vi.mocked(redis.get).mockResolvedValueOnce(JSON.stringify(fullRoom));

      const result = await findAvailableRoom(fullRoom.country);
      expect(result).toBeNull(); // full room should be skipped
    });

    it('returns available room when one has less than 2 participants', async () => {
      const room = makeRoom({ participants: ['user-1'] }); // 1 participant = available

      vi.mocked(redis.smembers).mockResolvedValueOnce([room.roomName]);
      vi.mocked(redis.get).mockResolvedValueOnce(JSON.stringify(room));

      const result = await findAvailableRoom(room.country);
      expect(result).not.toBeNull();
      expect(result?.roomName).toBe(room.roomName);
    });

    // ── Error Cases ──────────────────────────────────────────
    it('throws when Redis smembers fails', async () => {
      vi.mocked(redis.smembers).mockRejectedValueOnce(new Error('Redis down'));
      await expect(findAvailableRoom('SA')).rejects.toThrow();
    });
  });

  describe('deleteRoom', () => {
    // ── Edge Cases ──────────────────────────────────────────
    it('removes room from both active set and country set', async () => {
      vi.mocked(redis.del).mockResolvedValueOnce(1);
      vi.mocked(redis.srem).mockResolvedValueOnce(1);

      const room = makeRoom();
      await deleteRoom(room.roomName, room.country);

      expect(redis.srem).toHaveBeenCalledWith('rooms:active', room.roomName);
      expect(redis.srem).toHaveBeenCalledWith(
        `country:${room.country}`,
        room.roomName
      );
    });

    // ── Error Cases ──────────────────────────────────────────
    it('throws when Redis del fails', async () => {
      vi.mocked(redis.del).mockRejectedValueOnce(new Error('Redis error'));
      const room = makeRoom();
      await expect(deleteRoom(room.roomName, room.country)).rejects.toThrow();
    });
  });

  describe('addParticipant', () => {
    it('adds participant to room and saves', async () => {
      const room = makeRoom({ participants: [] });
      const participantId = makeParticipantId();

      vi.mocked(redis.get).mockResolvedValueOnce(JSON.stringify(room));
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');
      vi.mocked(redis.sadd).mockResolvedValueOnce(1);

      await addParticipant(room.roomName, participantId);

      expect(redis.setex).toHaveBeenCalledWith(
        `room:${room.roomName}`,
        14400,
        expect.stringContaining(participantId),
      );
    });

    it('does not duplicate participant if already in room', async () => {
      const participantId = makeParticipantId();
      const room = makeRoom({ participants: [participantId] });

      vi.mocked(redis.get).mockResolvedValueOnce(JSON.stringify(room));
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');
      vi.mocked(redis.sadd).mockResolvedValueOnce(1);

      await addParticipant(room.roomName, participantId);

      const savedData = JSON.parse(
        vi.mocked(redis.setex).mock.calls[0][2] as string
      ) as typeof room;
      expect(savedData.participants.filter((p: string) => p === participantId)).toHaveLength(1);
    });
  });

  describe('removeParticipant', () => {
    it('deletes room when last participant leaves', async () => {
      const participantId = makeParticipantId();
      const room = makeRoom({ participants: [participantId] });

      vi.mocked(redis.eval).mockResolvedValueOnce(0);

      const remaining = await removeParticipant(room.roomName, participantId, room.country);

      expect(redis.eval).toHaveBeenCalled();
      expect(remaining).toBe(0);
    });

    // ── Edge Cases ──────────────────────────────────────────
    it('keeps room alive when second participant leaves but first remains', async () => {
      const p1 = makeParticipantId();
      const p2 = makeParticipantId();
      const room = makeRoom({ participants: [p1, p2] });

      vi.mocked(redis.eval).mockResolvedValueOnce(1);

      const remaining = await removeParticipant(room.roomName, p2, room.country);

      expect(redis.eval).toHaveBeenCalled();
      expect(remaining).toBe(1);
    });

    it('does nothing when room does not exist', async () => {
      vi.mocked(redis.eval).mockResolvedValueOnce(0);
      // Should not throw
      await expect(
        removeParticipant('ghost-room', 'user-1', 'SA')
      ).resolves.not.toThrow();
    });
  });

  describe('findOrCreateRoom', () => {
    it('creates new room if none available', async () => {
      vi.mocked(redis.smembers).mockResolvedValueOnce([]);
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');
      vi.mocked(redis.sadd).mockResolvedValueOnce(1);

      const roomName = await findOrCreateRoom('SA', 'user-1');
      expect(roomName).toContain('session-');
      expect(redis.setex).toHaveBeenCalled();
    });

    it('returns available room if one exists', async () => {
      const room = makeRoom({ participants: ['user-other'], createdAt: Date.now() + 60_000 });
      vi.mocked(redis.smembers).mockResolvedValueOnce([room.roomName]);
      vi.mocked(redis.get)
        .mockResolvedValueOnce(JSON.stringify(room))
        .mockResolvedValueOnce(JSON.stringify(room));
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');
      vi.mocked(redis.sadd).mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      const roomName = await findOrCreateRoom(room.country, 'user-self');
      expect(roomName).toBe(room.roomName);
    });

    it('returns fallback room on Redis error', async () => {
      vi.mocked(redis.smembers).mockRejectedValueOnce(new Error('Redis crash'));
      const roomName = await findOrCreateRoom('SA', 'user-1');
      expect(roomName).toContain('session-');
    });
  });
});
