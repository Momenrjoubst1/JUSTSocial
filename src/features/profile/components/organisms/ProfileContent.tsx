import React from 'react';
import { BioSection } from '../molecules/BioSection';
import { SocialLinksSection } from '../molecules/SocialLinksSection';
import { SocialLinks } from '../../types';

interface ProfileContentProps {
  bio: string;
  socialLinks: SocialLinks;
  isOwnProfile: boolean;
  onSaveBio: (bio: string) => Promise<void>;
  onSaveSocialLinks: (links: SocialLinks) => Promise<void>;
}

export const ProfileContent: React.FC<ProfileContentProps> = ({
  bio,
  socialLinks,
  isOwnProfile,
  onSaveBio,
  onSaveSocialLinks,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 sm:px-10">
      <div className="md:col-span-2 space-y-6">
        <BioSection bio={bio} isOwnProfile={isOwnProfile} onSave={onSaveBio} />
      </div>

      <div className="space-y-6">
        <SocialLinksSection socialLinks={socialLinks} isOwnProfile={isOwnProfile} onSave={onSaveSocialLinks} />
      </div>
    </div>
  );
};
