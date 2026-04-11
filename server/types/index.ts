export interface RoomData {
  roomName: string;
  country: string;
  participants: string[];
  createdAt: number;
}

export interface BanRecord {
  fingerprint: string;
  ip: string;
  reason: string;
  bannedAt: string;
  bannedBy: string;
}

export interface ModerationReport {
  reporterId: string;
  reportedId: string;
  roomName: string;
  reason: string;
  screenshotUrl?: string;
  createdAt: string;
}

export interface AgentProcess {
  pid: number;
  roomName: string;
  startedAt: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
