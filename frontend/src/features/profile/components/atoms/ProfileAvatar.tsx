import React, { useState } from "react";
import { Upload, AlertTriangle } from "lucide-react";
import { AvatarModStatus } from "../../types";
import { AvatarFrame, FrameId } from "./AvatarFrame";

interface ProfileAvatarProps {
  profileImage: string;
  fullName: string;
  email: string;
  isOwnProfile: boolean;
  profileLoaded: boolean;
  avatarModStatus: AvatarModStatus;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  getUserAvatarUrl: (url: string | null, name: string) => string;
  avatarFrame?: FrameId;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  profileImage,
  fullName,
  email,
  isOwnProfile,
  profileLoaded,
  avatarModStatus,
  onImageUpload,
  getUserAvatarUrl,
  avatarFrame = 'none'
}) => {
  const [showUploadButton, setShowUploadButton] = useState(false);

  return (
    <div
      className={`relative inline-block ${isOwnProfile ? 'cursor-pointer group' : ''}`}
      onMouseEnter={() => isOwnProfile && setShowUploadButton(true)}
      onMouseLeave={() => setShowUploadButton(false)}
      onClick={() => isOwnProfile && setShowUploadButton(!showUploadButton)}
    >
      <AvatarFrame frameId={avatarFrame}>
        <img
          src={profileImage || undefined}
          alt="Profile"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={(e) => {
            e.currentTarget.src = getUserAvatarUrl(null, fullName || email?.split("@")[0] || "User");
            e.currentTarget.onerror = null;
          }}
          className={`w-full h-full rounded-full border-4 border-background object-cover bg-background transition-opacity duration-300 shadow-xl ${!profileLoaded ? 'opacity-0' : (isOwnProfile ? 'group-hover:opacity-90' : 'opacity-100')}`}
        />
        {!profileLoaded && (
          <div className="absolute inset-0 w-full h-full rounded-full border-4 border-background bg-muted animate-pulse" />
        )}
        {isOwnProfile && (
          <div
            className={`absolute inset-0 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-300 ${showUploadButton ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
              }`}
          >
            {avatarModStatus.checking ? (
              <div className="p-3 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: '200ms' }} />
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            ) : (
              <label className="cursor-pointer p-4 rounded-full bg-white/30 dark:bg-black/30 hover:bg-white/40 dark:hover:bg-black/40 transition-all backdrop-blur-2xl border border-white/50 dark:border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:scale-[1.05] active:scale-[0.95] flex items-center justify-center">
                <Upload size={24} className="text-white shadow-sm" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={onImageUpload}
                  className="hidden"
                  onClick={(e) => e.stopPropagation()}
                />
              </label>
            )}
          </div>
        )}
      </AvatarFrame>
      {avatarModStatus.error && (
        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/90 text-white text-xs font-semibold shadow-lg backdrop-blur-md">
            <AlertTriangle size={14} />
            <span>{avatarModStatus.error}</span>
          </div>
        </div>
      )}
    </div>
  );
};
