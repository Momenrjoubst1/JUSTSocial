import React, { useState } from "react";
import { Upload, AlertTriangle } from "lucide-react";
import { AvatarModStatus } from "../../types";
import { useLanguage } from "@/context/LanguageContext";

interface ProfileBannerProps {
  isDark: boolean;
  coverImage?: string;
  isOwnProfile?: boolean;
  coverModStatus?: AvatarModStatus;
  onCoverUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ProfileBanner: React.FC<ProfileBannerProps> = ({
  isDark,
  coverImage,
  isOwnProfile,
  coverModStatus,
  onCoverUpload,
}) => {
  const [showUploadButton, setShowUploadButton] = useState(false);
  const { t } = useLanguage();

  return (
    <div
      className="w-full h-48 md:h-64 object-cover relative group"
      style={{
        backgroundImage: coverImage
          ? `url(${coverImage})`
          : isDark
            ? "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)"
            : "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      onMouseEnter={() => isOwnProfile && setShowUploadButton(true)}
      onMouseLeave={() => setShowUploadButton(false)}
      onClick={() => isOwnProfile && setShowUploadButton(!showUploadButton)}
    >
      {isOwnProfile && onCoverUpload && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-300 ${
            showUploadButton || coverModStatus?.checking
              ? "opacity-100"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {coverModStatus?.checking ? (
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center scale-100">
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 rounded-full bg-white animate-pulse"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-white animate-pulse"
                  style={{ animationDelay: "200ms" }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-white animate-pulse"
                  style={{ animationDelay: "400ms" }}
                />
              </div>
            </div>
          ) : (
            <label className="cursor-pointer px-6 py-3 rounded-2xl bg-white/30 dark:bg-black/30 hover:bg-white/40 dark:hover:bg-black/40 transition-all backdrop-blur-2xl flex items-center gap-2 text-white font-bold border border-white/40 dark:border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:scale-[1.03] active:scale-[0.97]">
              <Upload size={20} className="drop-shadow-md" />
              <span className="drop-shadow-md">
                {String(t("profile:cover.change"))}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={onCoverUpload}
                className="hidden"
                onClick={(e) => e.stopPropagation()}
              />
            </label>
          )}
        </div>
      )}

      {coverModStatus?.error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/90 text-white text-xs font-semibold shadow-lg backdrop-blur-md">
            <AlertTriangle size={14} />
            <span>{coverModStatus.error}</span>
          </div>
        </div>
      )}
    </div>
  );
};
