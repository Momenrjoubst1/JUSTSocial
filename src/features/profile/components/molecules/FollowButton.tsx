import React from 'react';
import { UserPlus, Check } from 'lucide-react';

interface FollowButtonProps {
  isFollowing: boolean;
  onToggleFollow: () => void;
}

export const FollowButton: React.FC<FollowButtonProps> = ({ isFollowing, onToggleFollow }) => {
  return (
    <button
      onClick={onToggleFollow}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-xl border text-sm hover:scale-[1.02] active:scale-[0.98]
        ${isFollowing
          ? 'bg-white/50 dark:bg-black/40 border-white/40 dark:border-white/10 text-foreground hover:bg-white/60 dark:hover:bg-black/50'
          : 'bg-foreground/90 border-transparent text-background hover:bg-foreground'
        }`}
    >
      {isFollowing ? (
        <>
          <Check size={18} />
          Following
        </>
      ) : (
        <>
          <UserPlus size={18} />
          Follow
        </>
      )}
    </button>
  );
};
