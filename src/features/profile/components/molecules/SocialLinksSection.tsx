import React, { useState } from 'react';
import { Edit } from 'lucide-react';
import { SocialLinks } from '../../types';
import { SOCIAL_CONFIG } from '../../constants';
import { SocialIcon } from '../atoms/SocialIcon';

interface SocialLinksSectionProps {
  socialLinks: SocialLinks;
  isOwnProfile: boolean;
  onSave: (links: SocialLinks) => Promise<void>;
}

export const SocialLinksSection: React.FC<SocialLinksSectionProps> = ({ 
  socialLinks: initialLinks, 
  isOwnProfile, 
  onSave 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<SocialLinks>(initialLinks);

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
        <h3 className="text-lg font-bold text-foreground tracking-tight">Connect</h3>
        {isOwnProfile && !isEditing && (
          <button onClick={handleEditClick} className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors">
            <Edit size={18} />
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="space-y-4">
          {SOCIAL_CONFIG.some(s => initialLinks[s.key]) ? (
            SOCIAL_CONFIG.filter(s => initialLinks[s.key]).map(s => (
              <a
                key={s.key}
                href={
                  s.key === "github" ? `https://github.com/${initialLinks[s.key].replace("@", "")}`
                    : s.key === "discord" ? `https://discord.com/users/${initialLinks[s.key].replace("@", "")}`
                      : s.key === "twitter" ? `https://x.com/${initialLinks[s.key].replace("@", "")}`
                        : s.key === "instagram" ? `https://instagram.com/${initialLinks[s.key].replace("@", "")}`
                          : s.key === "tiktok" ? `https://tiktok.com/${initialLinks[s.key].replace("@", "")}`
                            : "#"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 group"
              >
                <SocialIcon config={s} />
                <span className="text-foreground font-medium text-sm group-hover:underline">{initialLinks[s.key]}</span>
              </a>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No social links added.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {SOCIAL_CONFIG.map(s => (
            <div key={s.key} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">{s.label}</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: s.color }}>{s.icon}</div>
                <input
                  type="text"
                  value={draft[s.key]}
                  onChange={e => setDraft({ ...draft, [s.key]: e.target.value })}
                  placeholder={s.placeholder}
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
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-foreground text-background font-medium rounded-full transition-colors text-sm shadow-md"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
