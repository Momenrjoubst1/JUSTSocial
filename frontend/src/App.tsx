import { useTheme } from "@/context/ThemeContext";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { AppRoutes } from "@/app/components/AppRoutes";
import { AppOverlays } from "@/app/components/AppOverlays";
import { SuspenseLoader } from "@/app/components/SuspenseLoader";
import { useAppController } from "@/app/hooks/useAppController";
import { FloatingAssistant } from "@/features/ai-assistant";

export function App() {
  const { theme } = useTheme();
  const app = useAppController();

  if (app.isBootstrapping) {
    return <SuspenseLoader />;
  }

  return (
    <ErrorBoundary>
      <div className={`relative min-h-screen w-full flex flex-col items-center overflow-x-hidden ${theme === "dark"
      ? "bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]"
      : "bg-background"
      }`}>
        <AppRoutes
          isLoggedIn={app.isLoggedIn}
          isBanned={app.isBanned}
          userEmail={app.userEmail}
          userId={app.userId}
          showProfileMenu={app.showProfileMenu}
          setShowProfileMenu={app.setShowProfileMenu}
          unreadCount={app.unreadCount}
          latestMessage={app.latestMessage}
          notificationCount={app.notificationCount}
          setNotificationCount={app.setNotificationCount}
          latestNotification={app.latestNotification}
          onStartClick={app.openChat}
          onMessagesClick={app.openMessages}
          onSignInClick={app.openSignIn}
          onSignUpClick={app.openSignUp}
          onSignOutClick={() => {
            void app.handleSignOut();
          }}
          getAvatarUrl={app.getAvatarUrl}
          onSenderClick={app.openConversation}
        />

        <AppOverlays
          showSignIn={app.showSignIn}
          showSignUp={app.showSignUp}
          showWelcomeScreen={app.showWelcomeScreen}
          welcomeName={app.welcomeName}
          onCloseSignIn={app.closeSignIn}
          onCloseSignUp={app.closeSignUp}
          onSwitchToSignUp={app.switchToSignUp}
          onSwitchToSignIn={app.switchToSignIn}
          onLoginSuccess={app.handleLoginSuccess}
          onSignupSuccess={app.handleSignupSuccess}
          onCloseWelcome={app.closeWelcome}
        />

        <FloatingAssistant />
      </div>
    </ErrorBoundary>
  );
}
