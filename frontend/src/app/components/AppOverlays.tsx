import { lazy, Suspense, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WelcomeOverlay } from "@/components/ui/effects/WelcomeOverlay";
import SignInPage from "@/pages/signin/SignInPage";
import SignUpPage from "@/pages/signup/SignUpPage";

const FloatingAssistant = lazy(() =>
  import("@/features/ai-assistant").then((module) => ({
    default: module.FloatingAssistant,
  })),
);

interface AppOverlaysProps {
  showSignIn: boolean;
  showSignUp: boolean;
  showWelcomeScreen: boolean;
  welcomeName: string;
  onCloseSignIn: () => void;
  onCloseSignUp: () => void;
  onSwitchToSignUp: () => void;
  onSwitchToSignIn: () => void;
  onLoginSuccess: (email: string) => void | Promise<void>;
  onSignupSuccess: (email: string) => void;
  onCloseWelcome: () => void;
}

export function AppOverlays({
  showSignIn,
  showSignUp,
  showWelcomeScreen,
  welcomeName,
  onCloseSignIn,
  onCloseSignUp,
  onSwitchToSignUp,
  onSwitchToSignIn,
  onLoginSuccess,
  onSignupSuccess,
  onCloseWelcome,
}: AppOverlaysProps) {
  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCloseSignIn();
      onCloseSignUp();
    }
  };

  return (
    <>
      <AnimatePresence>
        {showSignIn && (
          <>
            <motion.div
              key="signin-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
              onClick={handleBackdropClick}
            />
            <motion.div
              key="signin-modal"
              initial={{ opacity: 0, y: "100%", x: "-50%" }}
              animate={{ opacity: 1, y: "-50%", x: "-50%" }}
              exit={{ opacity: 0, y: "100%", x: "-50%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md px-4"
            >
              <SignInPage
                onClose={onCloseSignIn}
                onSwitchToSignUp={onSwitchToSignUp}
                onLoginSuccess={onLoginSuccess}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSignUp && (
          <>
            <motion.div
              key="signup-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
              onClick={handleBackdropClick}
            />
            <motion.div
              key="signup-modal"
              initial={{ opacity: 0, y: "100%", x: "-50%" }}
              animate={{ opacity: 1, y: "-50%", x: "-50%" }}
              exit={{ opacity: 0, y: "100%", x: "-50%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md px-4"
            >
              <SignUpPage
                onClose={onCloseSignUp}
                onSwitchToSignIn={onSwitchToSignIn}
                onSignupSuccess={onSignupSuccess}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <WelcomeOverlay
        isVisible={showWelcomeScreen}
        userName={welcomeName}
        onClose={onCloseWelcome}
      />

      <Suspense fallback={null}>
        <FloatingAssistant />
      </Suspense>
    </>
  );
}
