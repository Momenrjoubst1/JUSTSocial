import { ProfileMenu } from "@/components/ui/shared";

interface ProfileFeedbackMenuProps {
  onFeedbackClick: () => void;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onSignOutClick: () => void;
  setShowProfileMenu: (show: boolean) => void;
}

export function ProfileFeedbackMenu({
  onFeedbackClick,
  onProfileClick,
  onSettingsClick,
  onSignOutClick,
  setShowProfileMenu,
}: ProfileFeedbackMenuProps) {
  return (
    <ProfileMenu
      onProfileClick={() => {
        onProfileClick();
        setShowProfileMenu(false);
      }}
      onSettingsClick={() => {
        onSettingsClick();
        setShowProfileMenu(false);
      }}
      onLogoutClick={() => {
        onSignOutClick();
        setShowProfileMenu(false);
      }}
      onFeedbackClick={() => {
        onFeedbackClick();
        setShowProfileMenu(false);
      }}
    />
  );
}