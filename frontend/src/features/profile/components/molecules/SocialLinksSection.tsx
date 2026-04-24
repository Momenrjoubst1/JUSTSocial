import React, { useState } from "react";
import { Edit } from "lucide-react";
import { SocialLinks } from "../../types";
import { SOCIAL_CONFIG } from "../../constants";
import { SocialIcon } from "../atoms/SocialIcon";
import { useLanguage } from "@/context/LanguageContext";

interface SocialLinksSectionProps {
  socialLinks: SocialLinks;
  isOwnProfile: boolean;
  onSave: (links: SocialLinks) => Promise<void>;
}

export const SocialLinksSection: React.FC<SocialLinksSectionProps> = ({
  socialLinks: initialLinks,
  isOwnProfile,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<SocialLinks>(initialLinks);
  const { t } = useLanguage();

  const handleEditClick = () => {
    setDraft({ ...initialLinks });
    setIsEditing(true);
  };

  const handleSave = async () => {
    await onSave(draft);
    setIsEditing(false);
  };

  return (
    <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-6 sm:p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-foreground tracking-tight">
          {String(t("profile:social.title"))}
        </h3>
        {isOwnProfile && !isEditing && (
          <button
            onClick={handleEditClick}
            className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors"
            aria-label={String(t("profile:editProfile"))}
          >
            <Edit size={18} />
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="space-y-4">
          {SOCIAL_CONFIG.some((item) => initialLinks[item.key]) ? (
            SOCIAL_CONFIG.filter((item) => initialLinks[item.key]).map((item) => (
              <a
                key={item.key}
                href={
                  item.key === "github"
                    ? `https://github.com/${initialLinks[item.key].replace("@", "")}`
                    : item.key === "discord"
                      ? `https://discord.com/users/${initialLinks[item.key].replace("@", "")}`
                      : item.key === "twitter"
                        ? `https://x.com/${initialLinks[item.key].replace("@", "")}`
                        : item.key === "instagram"
                          ? `https://instagram.com/${initialLinks[item.key].replace("@", "")}`
                          : item.key === "tiktok"
                            ? `https://tiktok.com/${initialLinks[item.key].replace("@", "")}`
                            : "#"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 group"
              >
                <SocialIcon config={item} />
                <span className="text-foreground font-medium text-sm group-hover:underline">
                  {initialLinks[item.key]}
                </span>
              </a>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">
              {String(t("profile:social.empty"))}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
            {SOCIAL_CONFIG.map((item) => (
              <div key={item.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                {String(t(item.labelKey))}
                </label>
              <div className="relative">
                <div
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: item.color }}
                >
                  {item.icon}
                </div>
                <input
                  type="text"
                  value={draft[item.key]}
                  onChange={(e) => setDraft({ ...draft, [item.key]: e.target.value })}
                  placeholder={String(t(item.placeholderKey))}
                  className="w-full bg-background border border-border/50 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 text-foreground"
                />
              </div>
            </div>
          ))}
          <div className="pt-2 flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 px-4 py-2 hover:bg-muted text-muted-foreground font-medium rounded-full transition-colors text-sm"
            >
              {String(t("profile:actions.cancel"))}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-foreground text-background font-medium rounded-full transition-colors text-sm shadow-md"
            >
              {String(t("profile:actions.save"))}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
