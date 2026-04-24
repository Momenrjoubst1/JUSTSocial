import { lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  useLocation,
  useNavigate,
  type NavigateFunction,
  Routes,
  Route,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PageErrorFallback } from "@/components/ui/PageErrorFallback";
import { LandingPage } from "@/pages/landing/LandingPage";
import type {
  AppMessagePreview,
  AppNotificationPreview,
  NotificationCountSetter,
} from "@/app/types";
import { SuspenseLoader } from "./SuspenseLoader";

const VideoChatPage = lazy(() => import("@/pages/videochat/VideoChatPage"));
const ProfilePage = lazy(() => import("@/pages/profile/ProfilePage"));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"));
const MessagesPage = lazy(() => import("@/pages/messages/MessagesPage"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const BannedPage = lazy(() => import("@/pages/banned/BannedPage"));
const AssistantApp = lazy(() =>
  import("@/features/ai-assistant").then((module) => ({
    default: module.AssistantApp,
  })),
);

interface AppRoutesProps {
  isLoggedIn: boolean;
  isBanned: boolean;
  userEmail: string;
  userId: string | null;
  showProfileMenu: boolean;
  setShowProfileMenu: (show: boolean) => void;
  unreadCount: number;
  latestMessage: AppMessagePreview | null;
  notificationCount: number;
  setNotificationCount?: NotificationCountSetter;
  latestNotification: AppNotificationPreview | null;
  onStartClick: () => void;
  onMessagesClick: () => void;
  onSignInClick: () => void;
  onSignUpClick: () => void;
  onSignOutClick: () => void;
  getAvatarUrl: (email: string) => string;
  onSenderClick?: (senderId: string) => void;
}

function getLandingProps({
  isLoggedIn,
  showProfileMenu,
  setShowProfileMenu,
  unreadCount,
  latestMessage,
  notificationCount,
  setNotificationCount,
  latestNotification,
  userId,
  getAvatarUrl,
  userEmail,
  onStartClick,
  onMessagesClick,
  onSignInClick,
  onSignUpClick,
  onSignOutClick,
  onSenderClick,
  navigate,
}: AppRoutesProps & {
  navigate: NavigateFunction;
}) {
  return {
    isLoggedIn,
    onStartClick,
    onMessagesClick,
    unreadCount,
    latestMessage,
    notificationCount,
    setNotificationCount,
    latestNotification,
    userId,
    getAvatarUrl,
    userEmail,
    onSignInClick,
    onSignUpClick,
    onSignOutClick,
    onProfileClick: () => {
      navigate("/profile");
      setShowProfileMenu(false);
    },
    onSettingsClick: () => {
      navigate("/settings");
      setShowProfileMenu(false);
    },
    onSenderClick,
    showProfileMenu,
    setShowProfileMenu,
  };
}

export function AppRoutes(props: AppRoutesProps) {
  const { t } = useTranslation("app");
  const navigate = useNavigate();
  const location = useLocation();

  const landingProps = getLandingProps({
    ...props,
    navigate,
  });

  if (props.isBanned && location.pathname !== "/banned") {
    return <BannedPage />;
  }

  return (
    <Suspense fallback={<SuspenseLoader />}>
      <ErrorBoundary>
        <Routes location={location} key={location.pathname}>
          <Route path="/banned" element={<BannedPage />} />

          <Route path="/" element={<LandingPage {...landingProps} />} />

          <Route
            path="/messages"
            element={
              props.isLoggedIn ? (
                <div className="w-full flex-1">
                  <ErrorBoundary
                    fallback={
                      <PageErrorFallback
                        pageName={t("page.messages")}
                        onReset={() => window.location.reload()}
                      />
                    }
                  >
                    <MessagesPage />
                  </ErrorBoundary>
                </div>
              ) : (
                <LandingPage {...landingProps} />
              )
            }
          />

          <Route
            path="/chat"
            element={
              <AnimatePresence>
                <motion.div
                  key="video-chat"
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="fixed inset-0 z-[100]"
                >
                  <ErrorBoundary
                    fallback={
                      <PageErrorFallback
                        pageName={t("page.videochat")}
                        onReset={() => window.location.reload()}
                      />
                    }
                  >
                    <VideoChatPage onExit={() => navigate("/")} />
                  </ErrorBoundary>
                </motion.div>
              </AnimatePresence>
            }
          />

          <Route
            path="/profile"
            element={
              <AnimatePresence>
                <ErrorBoundary
                  fallback={
                    <PageErrorFallback
                      pageName={t("page.profile")}
                      onReset={() => window.location.reload()}
                    />
                  }
                >
                  <ProfilePage email={props.userEmail} onClose={() => navigate("/")} />
                </ErrorBoundary>
              </AnimatePresence>
            }
          />

          <Route
            path="/profile/:id"
            element={
              <AnimatePresence>
                <ErrorBoundary
                  fallback={
                    <PageErrorFallback
                      pageName={t("page.profile")}
                      onReset={() => window.location.reload()}
                    />
                  }
                >
                  <ProfilePage email={props.userEmail} onClose={() => navigate("/")} />
                </ErrorBoundary>
              </AnimatePresence>
            }
          />

          <Route
            path="/settings"
            element={
              <AnimatePresence>
                <ErrorBoundary
                  fallback={
                    <PageErrorFallback
                      pageName={t("page.settings")}
                      onReset={() => window.location.reload()}
                    />
                  }
                >
                  <SettingsPage />
                </ErrorBoundary>
              </AnimatePresence>
            }
          />

          <Route
            path="/admin"
            element={
              <ErrorBoundary
                fallback={
                  <PageErrorFallback
                    pageName={t("page.adminDashboard")}
                    onReset={() => window.location.reload()}
                  />
                }
              >
                <AdminDashboard />
              </ErrorBoundary>
            }
          />

          <Route
            path="/assistant"
            element={
              <ErrorBoundary
                fallback={
                  <PageErrorFallback
                    pageName="AI Assistant"
                    onReset={() => window.location.reload()}
                  />
                }
              >
                <AssistantApp />
              </ErrorBoundary>
            }
          />
        </Routes>
      </ErrorBoundary>
    </Suspense>
  );
}
