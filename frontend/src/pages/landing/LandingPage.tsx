import { StarBackground } from "@/components/ui/effects";


import { HeroSection } from "@/features/landing/components/HeroSection";
import { HowItWorks } from "@/features/landing/components/HowItWorks";
import { FeedbackModal } from "@/features/landing/components/FeedbackModal";
import { Footer } from "@/features/landing/components/Footer";
import { LandingHeader } from "@/features/landing/components/LandingHeader";

import { FeaturesSection } from "@/features/landing/components/FeaturesSection";
import { SafetySection } from "@/features/landing/components/SafetySection";
import { CommunitySection } from "@/features/landing/components/CommunitySection";
import { FeaturedMembersSection } from "@/features/landing/components/FeaturedMembersSection";
import { useLandingPageController } from "@/features/landing/hooks/useLandingPageController";
import type { LandingPageProps } from "@/features/landing/types";

export function LandingPage({
  isLoggedIn,
  onStartClick,
  onMessagesClick,
  getAvatarUrl,
  userEmail,
  onSignInClick,
  onSignUpClick,
  onSignOutClick,
  onProfileClick,
  onSettingsClick,
  showProfileMenu,
  setShowProfileMenu,
  unreadCount = 0,
  latestMessage = null,
  notificationCount = 0,
  setNotificationCount,
  userId = null,
  onSenderClick,
}: LandingPageProps) {
  const {
    t,
    headerTranslate,
    activeSection,
    showNotifPanel,
    setShowNotifPanel,
    profileMenuRef,
    scrollToFeatures,
    formatJoinedDate,
    showFeedbackModal,
    setShowFeedbackModal,
    fbCategory,
    setFbCategory,
    fbHoverRating,
    setFbHoverRating,
    fbRating,
    setFbRating,
    fbMessage,
    setFbMessage,
    fbError,
    setFbError,
    fbSuccess,
    fbLoading,
    handleFeedbackSubmit,
    unreadSenders,
    notifActors,
    communityMembers,
    membersLoading,
    membersError,
  } = useLandingPageController({
    isLoggedIn,
    unreadCount,
    notificationCount,
    userId,
    userEmail,
    showProfileMenu,
    setShowProfileMenu,
  });

  return (
    <>
      <LandingHeader
        activeSection={activeSection}
        getAvatarUrl={getAvatarUrl}
        headerTranslate={headerTranslate}
        isLoggedIn={isLoggedIn}
        latestMessageSenderName={latestMessage?.senderName ?? null}
        latestMessageText={latestMessage?.text ?? null}
        notificationCount={notificationCount}
        notifActors={notifActors}
        onMessagesClick={onMessagesClick}
        onProfileClick={onProfileClick}
        onSenderClick={onSenderClick}
        onSettingsClick={onSettingsClick}
        onSignInClick={onSignInClick}
        onSignOutClick={onSignOutClick}
        onSignUpClick={onSignUpClick}
        onStartClick={onStartClick}
        onFeedbackClick={() => setShowFeedbackModal(true)}
        profileMenuRef={profileMenuRef}
        setNotificationCount={setNotificationCount || (() => {})}
        setShowNotifPanel={setShowNotifPanel}
        setShowProfileMenu={setShowProfileMenu}
        showNotifPanel={showNotifPanel}
        showProfileMenu={showProfileMenu}
        t={(key) => String(t(key))}
        unreadCount={unreadCount}
        unreadSenders={unreadSenders}
        userEmail={userEmail}
        userId={userId}
      />

      {/* --- Global Animated Star Background --- */}
      <StarBackground />

      {/* Subtle ambient lighting — dark, no color bleed */}
      <div
        className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] blur-[120px] opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)" }}
      />
      <div
        className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] blur-[140px] opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)" }}
      />

      <HeroSection 
        isLoggedIn={isLoggedIn} 
        onStartClick={onStartClick} 
        scrollToFeatures={scrollToFeatures} 
      />

      <HowItWorks onStartClick={onStartClick} />

      <FeaturesSection t={t} />

      <SafetySection t={t} />

      <FeaturedMembersSection
        communityMembers={communityMembers}
        formatJoinedDate={formatJoinedDate}
        isLoggedIn={isLoggedIn}
        membersError={membersError}
        membersLoading={membersLoading}
        onSignInClick={onSignInClick}
        t={t}
      />

      <CommunitySection t={t} onStartClick={onStartClick} />

      {/* ═══════════ FEEDBACK MODAL ═══════════ */}
      <FeedbackModal 
        showFeedbackModal={showFeedbackModal}
        setShowFeedbackModal={setShowFeedbackModal}
        fbCategory={fbCategory}
        setFbCategory={setFbCategory}
        fbHoverRating={fbHoverRating}
        setFbHoverRating={setFbHoverRating}
        fbRating={fbRating}
        setFbRating={setFbRating}
        fbMessage={fbMessage}
        setFbMessage={setFbMessage}
        fbError={fbError}
        setFbError={setFbError}
        fbSuccess={fbSuccess}
        fbLoading={fbLoading}
        handleFeedbackSubmit={handleFeedbackSubmit}
        userId={userId}
        userEmail={userEmail}
      />

      {/* Modern Footer */}
      <Footer t={t} />
    </>
  );
}
