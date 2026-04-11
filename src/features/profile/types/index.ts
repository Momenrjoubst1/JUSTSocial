export interface SocialLinks {
  instagram: string;
  twitter: string;
  github: string;
  discord: string;
  tiktok: string;
}

export interface ProfileData {
  avatar_url?: string;
  bio?: string;
  full_name?: string;
  username?: string;
  university?: string;
  social_links?: SocialLinks | string;
}

export interface FollowsModalState {
  isOpen: boolean;
  type: 'followers' | 'following';
}

export interface AvatarModStatus {
  checking: boolean;
  error: string | null;
}
