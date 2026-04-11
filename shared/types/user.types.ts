export type UserRole = 'regular' | 'moderator' | 'admin';
export type UserStatus = 'online' | 'offline' | 'banned';

export interface User {
  id: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at?: string;
  username?: string;
  avatar_url?: string;
}
