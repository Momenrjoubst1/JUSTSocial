import React from "react";
import { FollowStat } from "../atoms/FollowStat";
import { useLanguage } from "@/context/LanguageContext";

interface ProfileStatsProps {
  followingCount: number;
  followersCount: number;
  onFollowersClick: () => void;
  onFollowingClick: () => void;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  followingCount,
  followersCount,
  onFollowersClick,
  onFollowingClick,
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-6 mb-8 text-sm">
      <FollowStat
        count={followingCount}
        label={String(t("profile:stats.following"))}
        onClick={onFollowingClick}
      />
      <FollowStat
        count={followersCount}
        label={String(t("profile:stats.followers"))}
        onClick={onFollowersClick}
      />
    </div>
  );
};
