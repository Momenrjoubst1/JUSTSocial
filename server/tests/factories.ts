import { faker } from '@faker-js/faker';
import type { RoomData, BanRecord } from '../types';

export function makeRoom(overrides?: Partial<RoomData>): RoomData {
  return {
    roomName: `room-${faker.string.alphanumeric(8)}`,
    country:  faker.location.countryCode(),
    participants: [],
    createdAt: Date.now(),
    ...overrides,
  };
}

export function makeBan(overrides?: Partial<BanRecord>): BanRecord {
  return {
    fingerprint: faker.string.alphanumeric(32),
    ip:          faker.internet.ip(),
    reason:      'inappropriate_content',
    bannedAt:    new Date().toISOString(),
    bannedBy:    'admin',
    ...overrides,
  };
}

export function makeParticipantId(): string {
  return `user-${faker.string.alphanumeric(16)}`;
}
