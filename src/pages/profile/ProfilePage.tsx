import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { getUserAvatarUrl } from "@/lib/utils";
import { useParams } from "react-router-dom";
import { FollowsListModal } from "@/components/ui/modals";
import { SEO } from "@/components/ui/core";
import { useTitle } from "@/context/TitleContext";
import {
  useProfile,
  ProfileBanner,
  ProfileHeader,
  ProfileContent,
  EditProfileModal
} from "@/features/profile";

interface ProfilePageProps {
  email: string;
  onClose?: () => void;
}

export default function ProfilePage({ email, onClose }: ProfilePageProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { id } = useParams();

  const {
    bio,
    fullName,
    username,
    university,
    profileImage,
    coverImage,
    avatarFrame,
    chatHanger,
    profileLoaded,
    isOwnProfile,
    isFollowing,
    followersCount,
    followingCount,
    socialLinks,
    avatarModStatus,
    coverModStatus,
    viewedUserId,
    saveBio,
    saveFullName,
    saveUniversity,
    saveAvatarFrame,
    saveChatHanger,
    saveSocialLinks,
    handleImageUpload,
    handleCoverUpload,
    handleFollowToggle
  } = useProfile(id, email);

  const [followsModal, setFollowsModal] = useState<{ isOpen: boolean; type: 'followers' | 'following' }>({
    isOpen: false,
    type: 'followers'
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { setBaseTitle } = useTitle();

  useEffect(() => {
    setBaseTitle('Profile • SkillSwap');
  }, [setBaseTitle]);

  return (
    <>
      <SEO
        title={`${fullName || email?.split("@")[0] || "Profile"} | SkillSwap`}
        description={bio || "Check out this SkillSwap profile. Connect and start a secure skill exchange!"}
        image={profileImage || undefined}
      />
      <div className="fixed inset-0 bg-background z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border/50 px-6 py-4 z-50 flex items-center justify-between">
          <h1 className="text-foreground text-lg font-bold tracking-tight">Profile</h1>
          {onClose && (
            <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
          <div className="max-w-4xl mx-auto w-full pb-20">
            <ProfileBanner
              isDark={isDark}
              coverImage={coverImage}
              isOwnProfile={isOwnProfile}
              coverModStatus={coverModStatus}
              onCoverUpload={handleCoverUpload}
            />

            <ProfileHeader
              email={email}
              fullName={fullName}
              profileImage={profileImage}
              isOwnProfile={isOwnProfile}
              profileLoaded={profileLoaded}
              avatarModStatus={avatarModStatus}
              onImageUpload={handleImageUpload}
              getUserAvatarUrl={getUserAvatarUrl}
              isFollowing={isFollowing}
              onToggleFollow={handleFollowToggle}
              followingCount={followingCount}
              followersCount={followersCount}
              onFollowersClick={() => setFollowsModal({ isOpen: true, type: 'followers' })}
              onFollowingClick={() => setFollowsModal({ isOpen: true, type: 'following' })}
              onEditProfileClick={() => setIsEditModalOpen(true)}
              username={username}
              university={university}
              avatarFrame={avatarFrame}
            />

            <ProfileContent
              bio={bio}
              socialLinks={socialLinks}
              isOwnProfile={isOwnProfile}
              onSaveBio={saveBio}
              onSaveSocialLinks={saveSocialLinks}
            />
          </div>
        </div>

        {/* Follows List Modal */}
        {followsModal.isOpen && viewedUserId && (
          <FollowsListModal
            userId={viewedUserId}
            type={followsModal.type}
            onClose={() => setFollowsModal(prev => ({ ...prev, isOpen: false }))}
          />
        )}

        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          initialFullName={fullName}
          username={username}
          initialUniversity={university}
          initialBio={bio}
          initialAvatarFrame={avatarFrame}
          initialChatHanger={chatHanger}
          onSave={async (newFullName, newBio, newFrame, newUniversity, newChatHanger) => {
            if (newFullName !== fullName) await saveFullName(newFullName);
            if (newBio !== bio) await saveBio(newBio);
            if (newUniversity !== university) await saveUniversity(newUniversity);
            if (newFrame !== avatarFrame) await saveAvatarFrame(newFrame);
            if (newChatHanger !== chatHanger) await saveChatHanger(newChatHanger);
          }}
        />
      </div>
    </>
  );
}
