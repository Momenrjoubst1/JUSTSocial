import React from "react";
import { GraduationCap } from "lucide-react";
import { VerifiedBadge, isUserVerified } from "@/components/ui/core";
import { ProfileAvatar } from "../atoms/ProfileAvatar";
import { FollowButton } from "../molecules/FollowButton";
import { ProfileStats } from "../molecules/ProfileStats";
import { AvatarModStatus } from "../../types";
import { FrameId } from "../atoms/AvatarFrame";
import { useLanguage } from "@/context/LanguageContext";

interface ProfileHeaderProps {
  email: string;
  fullName: string;
  profileImage: string;
  isOwnProfile: boolean;
  profileLoaded: boolean;
  avatarModStatus: AvatarModStatus;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  getUserAvatarUrl: (url: string | null, name: string) => string;
  isFollowing: boolean;
  onToggleFollow: () => void;
  followingCount: number;
  followersCount: number;
  onFollowersClick: () => void;
  onFollowingClick: () => void;
  onEditProfileClick?: () => void;
  username?: string;
  university?: string;
  avatarFrame?: FrameId;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  email,
  fullName,
  profileImage,
  isOwnProfile,
  profileLoaded,
  avatarModStatus,
  onImageUpload,
  getUserAvatarUrl,
  isFollowing,
  onToggleFollow,
  followingCount,
  followersCount,
  onFollowersClick,
  onFollowingClick,
  onEditProfileClick,
  username,
  university,
  avatarFrame,
}) => {
  const { t } = useLanguage();

  return (
    <div className="px-6 sm:px-10 relative">
      <div className="relative flex justify-between items-end -mt-16 sm:-mt-20 mb-6">
        <ProfileAvatar
          profileImage={profileImage}
          fullName={fullName}
          email={email}
          isOwnProfile={isOwnProfile}
          profileLoaded={profileLoaded}
          avatarModStatus={avatarModStatus}
          onImageUpload={onImageUpload}
          getUserAvatarUrl={getUserAvatarUrl}
          avatarFrame={avatarFrame}
        />

        <div className="flex gap-3 pb-4">
          {!isOwnProfile ? (
            <FollowButton isFollowing={isFollowing} onToggleFollow={onToggleFollow} />
          ) : (
            onEditProfileClick && (
              <button
                onClick={onEditProfileClick}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all shadow-[0_4px_20px_rgba(0,0,0,0.08)] text-sm bg-white/50 dark:bg-black/40 backdrop-blur-xl text-foreground border border-white/40 dark:border-white/10 hover:bg-white/60 dark:hover:bg-black/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                {String(t("profile:editProfile"))}
              </button>
            )
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-foreground text-3xl sm:text-4xl font-extrabold flex items-center gap-2 tracking-tight">
            {fullName || email?.split("@")[0]}
            {isUserVerified(email) && <VerifiedBadge size={24} />}
          </h2>
          {username && (
            <p className="text-muted-foreground text-sm font-medium">@{username}</p>
          )}
          {university && (
            <p className="text-muted-foreground text-sm font-medium flex items-center gap-1.5 mt-1">
              <GraduationCap size={14} className="opacity-70" />
              <span>{university}</span>
            </p>
          )}
        </div>
      </div>

      <ProfileStats
        followingCount={followingCount}
        followersCount={followersCount}
        onFollowersClick={onFollowersClick}
        onFollowingClick={onFollowingClick}
      />
    </div>
  );
};
