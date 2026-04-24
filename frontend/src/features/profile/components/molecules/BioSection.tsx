import React, { useState } from "react";
import { Edit } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface BioSectionProps {
  bio: string;
  isOwnProfile: boolean;
  onSave: (bio: string) => Promise<void>;
}

export const BioSection: React.FC<BioSectionProps> = ({
  bio: initialBio,
  isOwnProfile,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(initialBio);
  const { t } = useLanguage();

  const handleSave = async () => {
    await onSave(bio);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setBio(initialBio);
    setIsEditing(false);
  };

  return (
    <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-6 sm:p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-foreground tracking-tight">
          {String(t("profile:bio.title"))}
        </h3>
        {isOwnProfile && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors"
            aria-label={String(t("profile:editProfile"))}
          >
            <Edit size={18} />
          </button>
        )}
      </div>

      {!isEditing ? (
        <p className="text-muted-foreground leading-relaxed text-base whitespace-pre-wrap">
          {initialBio || String(t("profile:bio.empty"))}
        </p>
      ) : (
        <div className="space-y-4">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={300}
            className="w-full bg-background text-foreground border border-border/50 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none text-base"
            rows={4}
            placeholder={String(t("profile:bio.placeholder"))}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {bio.length}/300
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="px-5 py-2 hover:bg-muted text-muted-foreground font-medium rounded-full transition-colors text-sm"
              >
                {String(t("profile:actions.cancel"))}
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 bg-foreground text-background hover:bg-foreground/90 font-medium rounded-full transition-colors text-sm shadow-md"
              >
                {String(t("profile:actions.save"))}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
