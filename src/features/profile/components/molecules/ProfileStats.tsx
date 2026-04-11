import React from 'react';
import { FollowStat } from '../atoms/FollowStat';

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
  onFollowingClick
}) => {
  return (
    <div className="flex items-center gap-6 mb-8 text-sm">
      <FollowStat 
        count={followingCount} 
        label="Following" 
        onClick={onFollowingClick} 
      />
      <FollowStat 
        count={followersCount} 
        label="Followers" 
        onClick={onFollowersClick} 
      />
    </div>
  );
};
