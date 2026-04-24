import { BrandLogo } from "@/components/ui/effects";
import { SearchBar, NotificationsPanel } from "@/components/ui/shared";
import { ThemeToggle } from "@/components/ui/core";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Bot, MessageSquare, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { LandingAvatarPreview, LandingNotificationActor } from "@/features/landing/types";
import { ProfileFeedbackMenu } from "./ProfileFeedbackMenu";

interface LandingHeaderProps {
  activeSection: string;
  getAvatarUrl: (email: string) => string;
  headerTranslate: number;
  isLoggedIn: boolean;
  latestMessageText: string | null;
  latestMessageSenderName: string | null;
  notificationCount: number;
  notifActors: LandingNotificationActor[];
  onMessagesClick?: () => void;
  onProfileClick: () => void;
  onSenderClick?: (senderId: string) => void;
  onSettingsClick: () => void;
  onSignInClick: () => void;
  onSignOutClick: () => void;
  onSignUpClick: () => void;
  onStartClick: () => void;
  onFeedbackClick: () => void;
  profileMenuRef: RefObject<HTMLDivElement | null>;
  setNotificationCount: (count: number) => void;
  setShowNotifPanel: Dispatch<SetStateAction<boolean>>;
  setShowProfileMenu: (show: boolean) => void;
  showNotifPanel: boolean;
  showProfileMenu: boolean;
  t: (key: string) => string;
  unreadCount: number;
  unreadSenders: LandingAvatarPreview[];
  userEmail: string;
  userId: string | null;
}

function scrollToSection(sectionId: string) {
  if (sectionId === "top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function OrbitingAvatarGroup({
  avatars,
  borderClassName,
  onAvatarClick,
}: {
  avatars: Array<{ id: string; avatar: string; type?: string }>;
  borderClassName: string;
  onAvatarClick: (id: string) => void;
}) {
  return (
    <div className="relative w-full h-full opacity-0 transition-opacity duration-300 group-hover:opacity-100">
      {avatars.map((avatar, index) => {
        const total = avatars.length;
        const step = 32;
        const maxSpan = 210;
        const actualSpan = Math.min(maxSpan, (total - 1) * step);
        const startAngle = 90 - actualSpan / 2;
        const angleDeg = total > 1 ? startAngle + (index / (total - 1)) * actualSpan : 90;
        const angleRad = (angleDeg * Math.PI) / 180;
        const radius = 42;

        return (
          <motion.div
            key={`${avatar.id}-${index}`}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            whileHover={{ scale: 1.25, zIndex: 100, transition: { duration: 0.2 } }}
            animate={{
              opacity: 1,
              scale: 1,
              x: Math.cos(angleRad) * radius,
              y: Math.sin(angleRad) * radius,
              transition: {
                type: "spring",
                stiffness: 400,
                damping: 25,
                delay: index * 0.03,
              },
            }}
            exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            className={`absolute start-1/2 top-1/2 -ms-3 -mt-3 flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border bg-background shadow-xl pointer-events-auto transform-gpu ${borderClassName}`}
            onClick={(event) => {
              event.stopPropagation();
              onAvatarClick(avatar.id);
            }}
          >
            <img
              src={avatar.avatar}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              width="24"
              height="24"
            />
            {avatar.type === "like" ? <div className="absolute inset-0 bg-red-500/10" /> : null}
          </motion.div>
        );
      })}
    </div>
  );
}

export function LandingHeader({
  activeSection,
  getAvatarUrl,
  headerTranslate,
  isLoggedIn,
  latestMessageSenderName,
  latestMessageText,
  notificationCount,
  notifActors,
  onMessagesClick,
  onProfileClick,
  onSenderClick,
  onSettingsClick,
  onSignInClick,
  onSignOutClick,
  onSignUpClick,
  onStartClick,
  onFeedbackClick,
  profileMenuRef,
  setNotificationCount,
  setShowNotifPanel,
  setShowProfileMenu,
  showNotifPanel,
  showProfileMenu,
  t,
  unreadCount,
  unreadSenders,
  userEmail,
  userId,
}: LandingHeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className="fixed left-0 right-0 top-0 z-50 bg-transparent pb-3 pr-2 pt-4 transition-transform duration-500 ease-in-out sm:pr-4 md:pr-6"
      style={{ transform: `translateY(${headerTranslate}px)` }}
    >
      <div className="w-full bg-transparent px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8 lg:gap-12">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-0"
              onClick={() => navigate("/")}
            >
              <BrandLogo className="h-12 w-10 -me-1" />
              <div className="flex items-center gap-1">
                <span className="hidden text-lg font-bold tracking-tight sm:block">
                  <span className="font-bold text-foreground">JUST</span>
                  <span className="ms-1 font-medium text-foreground/90">Social</span>
                </span>
                <span className="text-[10px] font-semibold text-foreground">BETA</span>
              </div>
            </button>

            <nav className="hidden items-center gap-8 lg:flex">
              {["top", "features", "community", "about"].map((sectionId) => (
                <a
                  key={sectionId}
                  href={`#${sectionId}`}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection(sectionId);
                  }}
                  className={`text-sm font-medium transition-colors ${activeSection === sectionId ? "text-foreground" : "text-[#525252] hover:text-[#A1A1A1]"}`}
                >
                  {String(t(`landing.nav.${sectionId === "top" ? "home" : sectionId}`))}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {!isLoggedIn ? (
              <>
                <button
                  onClick={onSignInClick}
                  className="rounded-xl border border-border bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_18px_rgba(255,255,255,0.3)]"
                >
                  {String(t("landing.signIn"))}
                </button>
                <button
                  onClick={onSignUpClick}
                  className="rounded-xl border border-border bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_18px_rgba(255,255,255,0.3)]"
                >
                  {String(t("landing.signUp"))}
                </button>
              </>
            ) : (
              <>
                <SearchBar placeholder={String(t("landing.searchPlaceholder"))} />

                <button
                  onClick={() => navigate("/assistant")}
                  className="group relative flex items-center justify-center rounded-full border border-border bg-purple-500/10 p-2 text-purple-500 shadow-sm transition-all hover:bg-purple-500/20"
                  title="AI Assistant"
                >
                  <Bot size={20} />
                  <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-purple-500" />
                  </span>
                </button>

                <button
                  onClick={onStartClick}
                  className="relative flex cursor-pointer items-center justify-center rounded-full border border-border bg-primary/10 p-2 text-primary shadow-sm transition-all hover:bg-primary/20"
                  title={String(t("landing:videochatButtonTitle"))}
                >
                  <Video size={20} />
                </button>

                <div className="group/message relative z-50">
                  <button
                    onClick={onMessagesClick}
                    className="group relative flex cursor-pointer items-center justify-center rounded-full border border-border bg-background/5 p-2 text-foreground/80 shadow-sm transition-all hover:bg-background/10 hover:text-foreground"
                    title={String(t("landing:messagesTitle"))}
                  >
                    <MessageSquare size={20} />
                    <AnimatePresence>
                      {unreadCount > 0 ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-1 -end-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-lg transition-transform group-hover:scale-110"
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </button>

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <AnimatePresence>
                      {unreadSenders.length > 0 ? (
                        <OrbitingAvatarGroup
                          avatars={unreadSenders}
                          borderClassName="border-primary/50"
                          onAvatarClick={(senderId) => {
                            if (onSenderClick) {
                              onSenderClick(senderId);
                              return;
                            }

                            onMessagesClick?.();
                          }}
                        />
                      ) : null}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {latestMessageText && latestMessageSenderName ? (
                      <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.9, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: 15, scale: 0.9, filter: "blur(4px)", pointerEvents: "none" }}
                        transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                        onClick={onMessagesClick}
                        className="absolute start-1/2 top-[calc(100%+8px)] w-56 -translate-x-1/2 cursor-pointer rounded-2xl border border-primary/30 bg-card p-2.5 shadow-2xl shadow-[0_8px_30px_rgb(0,0,0,0.15)] backdrop-blur-xl md:w-64"
                        style={{ transformOrigin: "top center" }}
                      >
                        <div className="absolute -top-[14px] start-1/2 -translate-x-1/2 border-[7px] border-transparent border-b-primary/30" />
                        <div className="absolute -top-[13px] start-1/2 -translate-x-1/2 border-[7.5px] border-transparent border-b-card" />

                        <div className="flex w-full items-start gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/10 bg-gradient-to-br from-primary/20 to-primary/5">
                            <span className="text-xs font-bold text-primary">{latestMessageSenderName[0]}</span>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col justify-center">
                            <h4 className="mb-0.5 flex w-full items-center justify-between gap-1.5 overflow-hidden text-[13px] font-bold text-foreground">
                              <span className="truncate">{latestMessageSenderName}</span>
                              <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] text-primary/90">
                                {String(t("landing:newMessage"))}
                              </span>
                            </h4>
                            <p className="line-clamp-2 w-full text-[10px] leading-relaxed text-foreground/60">
                              {latestMessageText}
                            </p>
                          </div>
                        </div>
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-2xl">
                          <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: "0%" }}
                            transition={{ duration: 5, ease: "linear" }}
                            className="h-full w-full bg-gradient-to-r from-[#262626] via-[#A1A1A1] to-[#262626]"
                          />
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <div className="group/notif relative z-50">
                  <button
                    className="group relative flex cursor-pointer items-center justify-center rounded-full border border-border bg-background/5 p-2 text-foreground/80 shadow-sm transition-all hover:bg-background/10 hover:text-foreground"
                    title={String(t("landing:notifications"))}
                    onClick={() => setShowNotifPanel((previous) => !previous)}
                  >
                    <Bell size={20} />
                    <AnimatePresence>
                      {notificationCount > 0 ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-1 -end-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg transition-transform group-hover:scale-110"
                        >
                          {notificationCount > 99 ? "99+" : notificationCount}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </button>

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <AnimatePresence>
                      {notifActors.length > 0 ? (
                        <OrbitingAvatarGroup
                          avatars={notifActors}
                          borderClassName="border-red-500/50"
                          onAvatarClick={() => {
                            setShowNotifPanel(true);
                          }}
                        />
                      ) : null}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {showNotifPanel ? (
                      <NotificationsPanel
                        userId={userId}
                        notificationCount={notificationCount}
                        setNotificationCount={setNotificationCount}
                        onClose={() => setShowNotifPanel(false)}
                      />
                    ) : null}
                  </AnimatePresence>
                </div>

                <div className="relative" ref={profileMenuRef}>
                  {getAvatarUrl(userEmail) ? (
                    <img
                      src={getAvatarUrl(userEmail)}
                      alt={String(t("landing:profileAlt"))}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={(event) => {
                        event.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail.split("@")[0])}&background=6366f1&color=fff&size=150`;
                        event.currentTarget.onerror = null;
                      }}
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="h-10 w-10 cursor-pointer rounded-full border-2 border-border transition-colors duration-300 hover:border-border"
                      loading="lazy"
                      decoding="async"
                      width="40"
                      height="40"
                    />
                  ) : (
                    <div className="h-10 w-10 animate-pulse rounded-full border-2 border-border bg-muted" />
                  )}

                  {showProfileMenu ? (
                    <div className="absolute end-0 top-full z-50 mt-2">
                      <ProfileFeedbackMenu
                        onFeedbackClick={onFeedbackClick}
                        onProfileClick={onProfileClick}
                        onSettingsClick={onSettingsClick}
                        onSignOutClick={onSignOutClick}
                        setShowProfileMenu={setShowProfileMenu}
                      />
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[1px]"
        style={{
          background: "linear-gradient(to right, transparent, hsl(var(--border)), transparent)",
          boxShadow: "0 0 8px hsl(var(--foreground) / 0.15)",
        }}
      />
    </header>
  );
}