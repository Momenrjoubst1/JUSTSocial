import type {
  AppMessagePreview,
  AppNotificationPreview,
  NotificationCountSetter,
} from "@/app/types";

export interface LandingPageProps {
  isLoggedIn: boolean;
  onStartClick: () => void;
  onMessagesClick?: () => void;
  getAvatarUrl: (email: string) => string;
  userEmail: string;
  onSignInClick: () => void;
  onSignUpClick: () => void;
  onSignOutClick: () => void;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  showProfileMenu: boolean;
  setShowProfileMenu: (show: boolean) => void;
  unreadCount?: number;
  latestMessage?: AppMessagePreview | null;
  notificationCount?: number;
  setNotificationCount?: NotificationCountSetter;
  latestNotification?: AppNotificationPreview | null;
  userId?: string | null;
  onSenderClick?: (senderId: string) => void;
}

export interface CommunityMemberProfile {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string;
  bio: string;
  university: string;
  chatHanger: string;
  createdAt: string | null;
}

export interface RawCommunityMemberProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  university?: string | null;
  chat_hanger?: string | null;
  created_at: string | null;
}

export interface LandingAvatarPreview {
  id: string;
  avatar: string;
}

export interface LandingNotificationActor extends LandingAvatarPreview {
  type: string;
}
