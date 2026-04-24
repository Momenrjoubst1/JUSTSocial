import { RoomServiceClient } from 'livekit-server-sdk';
import { v4 as uuidv4 } from 'uuid';
import redis from '../config/redis-client.js';
import { RoomData } from '../types/index.js';
import { logger } from '../utils/logger.js';

const ROOM_TTL = 4 * 60 * 60; // 4 hours

const isTest = process.env.NODE_ENV === 'test';

const LIVEKIT_API_KEY =
  process.env.LIVEKIT_API_KEY || (isTest ? 'vitest-livekit-api-key' : '');
const LIVEKIT_API_SECRET =
  process.env.LIVEKIT_API_SECRET ||
  (isTest ? 'vitest-livekit-api-secret-at-least-32-characters!!' : '');
const LIVEKIT_URL =
  process.env.LIVEKIT_URL || (isTest ? 'wss://vitest.invalid' : '');

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
  logger.error('Missing LiveKit environment variables');
  if (!isTest) {
    process.exit(1);
  }
}

const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

export async function saveRoom(data: RoomData): Promise<void> {
  const key = `room:${data.roomName}`;
  await redis.setex(key, ROOM_TTL, JSON.stringify(data));
  await redis.sadd('rooms:active', data.roomName);
  await redis.sadd(`country:${data.country}`, data.roomName);
}

export async function getRoom(roomName: string): Promise<RoomData | null> {
  const data = await redis.get(`room:${roomName}`);
  return data ? (JSON.parse(data) as RoomData) : null;
}

export async function deleteRoom(roomName: string, country: string): Promise<void> {
  await redis.del(`room:${roomName}`);
  await redis.srem('rooms:active', roomName);
  await redis.srem(`country:${country}`, roomName);
}

export async function findAvailableRoom(country: string): Promise<RoomData | null> {
  const roomNames = await redis.smembers(`country:${country}`);
  for (const roomName of roomNames) {
    const room = await getRoom(roomName);
    if (room && room.participants.length < 2) return room;
    if (!room) {
      await redis.srem(`country:${country}`, roomName);
      await redis.srem('rooms:active', roomName);
    }
  }
  return null;
}

const addParticipantScript = `
  local key = KEYS[1]
  local identity = ARGV[1]
  local ttl = ARGV[2]

  local data = redis.call('GET', key)
  if not data then return 0 end

  local room
  local ok, decoded = pcall(cjson.decode, data)
  if not ok or not decoded then return 0 end
  room = decoded

  if #room.participants >= 2 then return 0 end

  for _, p in ipairs(room.participants) do
    if p == identity then return 1 end
  end

  table.insert(room.participants, identity)
  redis.call('SETEX', key, ttl, cjson.encode(room))
  return 1
`;

export async function addParticipant(roomName: string, identity: string): Promise<boolean> {
  const result = await redis.eval(
    addParticipantScript,
    1,
    `room:${roomName}`,
    identity,
    ROOM_TTL.toString()
  );
  return result === 1;
}

const removeParticipantScript = `
  local key = KEYS[1]
  local roomName = ARGV[1]
  local identity = ARGV[2]
  local country = ARGV[3]

  local data = redis.call('GET', key)
  if not data then return 0 end

  local room
  local ok, decoded = pcall(cjson.decode, data)
  if not ok or not decoded then return 0 end
  room = decoded
  local filtered = {}
  for _, p in ipairs(room.participants) do
    if p ~= identity then
      table.insert(filtered, p)
    end
  end

  room.participants = filtered
  
  if #filtered == 0 then
    redis.call('DEL', key)
    redis.call('SREM', 'rooms:active', roomName)
    redis.call('SREM', 'country:' .. country, roomName)
    return 0
  else
    redis.call('SETEX', key, ${ROOM_TTL}, cjson.encode(room))
    return #filtered
  end
`;

export async function removeParticipant(roomName: string, identity: string, country: string): Promise<number> {
  const result = await redis.eval(
    removeParticipantScript,
    1,
    `room:${roomName}`,
    roomName,
    identity,
    country
  );
  return Number(result);
}

export async function findOrCreateRoom(userCountry?: string, identity?: string): Promise<string> {
  const country = userCountry || 'unknown';
  const MAX_RETRIES = 3;

  try {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const existing = await findAvailableRoom(country);
      if (existing) {
        if (Date.now() - existing.createdAt > 10000) {
          try {
            const participants = await roomService.listParticipants(existing.roomName);
            if (participants.length === 0) {
              await deleteRoom(existing.roomName, country);
              continue;
            }
          } catch { /* Livekit error, ignore */ }
        }

        if (identity) {
          const added = await addParticipant(existing.roomName, identity);
          if (!added) {
            continue;
          }
        }
        logger.info(`Connected user to existing room: ${existing.roomName} (${country})`);
        return existing.roomName;
      }

      const newRoomName = `session-${uuidv4()}`;
      const newRoom: RoomData = {
        roomName: newRoomName,
        country,
        participants: identity ? [identity] : [],
        createdAt: Date.now(),
      };
      await saveRoom(newRoom);
      logger.info(`Created new room for ${country}: ${newRoomName}`);
      return newRoomName;
    }

    // All retries exhausted, create a new room as fallback
    const fallbackName = `session-${uuidv4()}`;
    const fallbackRoom: RoomData = {
      roomName: fallbackName,
      country,
      participants: identity ? [identity] : [],
      createdAt: Date.now(),
    };
    await saveRoom(fallbackRoom);
    logger.warn(`Retries exhausted, created fallback room: ${fallbackName}`);
    return fallbackName;
  } catch (err) {
    logger.error('Redis error in findOrCreateRoom', err);
    const fallbackName = `session-${uuidv4()}`;
    logger.warn(`Fallback: created ephemeral room ${fallbackName}`);
    return fallbackName;
  }
}
