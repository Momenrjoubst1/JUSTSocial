export type RoomStatus = 'waiting' | 'active' | 'closed';

export interface RoomParticipant {
  id: string;
  user_id: string;
  joined_at: string;
  is_speaking: boolean;
  has_video: boolean;
}

export interface Room {
  id: string;
  name: string;
  status: RoomStatus;
  participants_count: number;
  created_at: string;
  updated_at?: string;
}
