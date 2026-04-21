import SignInPage from "@/pages/signin/SignInPage";
import SignUpPage from "@/pages/signup/SignUpPage";
import { signOut, supabase, saveUserProfileImage } from "@/lib/supabaseClient";
import { useState, useEffect, Suspense, lazy } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getUserAvatarUrl } from "@/lib/utils";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import { useTabNotifications } from "@/hooks/useTabNotifications";
import { useFingerprint } from "@/hooks/useFingerprint";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PageErrorFallback } from "@/components/ui/PageErrorFallback";
import { useAuthRefresh } from "@/features/auth/hooks/useAuthRefresh";
import { WelcomeOverlay } from "@/components/ui/effects/WelcomeOverlay";
import { FloatingAssistant } from "@/features/ai-assistant";


import { LandingPage } from "@/pages/landing/LandingPage";

const VideoChatPage = lazy(() => import("@/pages/videochat/VideoChatPage"));
const ProfilePage = lazy(() => import("@/pages/profile/ProfilePage"));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"));
const MessagesPage = lazy(() => import("@/pages/messages/MessagesPage"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const BannedPage = lazy(() => import("@/pages/banned/BannedPage"));

const SuspenseLoader = () => (
  <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[9999]">
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      <div className="w-24 h-24 rounded-3xl bg-primary/10 backdrop-blur-3xl border border-primary/20 flex items-center justify-center relative overflow-hidden">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="40 20 140 260" className="w-12 h-12">
          <path
            d="M 120 40 L 60 160 L 95 160 L 70 260 L 140 130 L 105 130 Z"
            fill="none"
            stroke="#7c3aed"
            strokeWidth="12"
            strokeLinejoin="round"
            className="suspense-loader-path"
          />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-50" />
      </div>

      {/* Absolute pulsing ring */}
      <div
        className="absolute -inset-4 border border-primary/30 rounded-[2.5rem] pointer-events-none suspense-loader-ring"
      />
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-8 flex flex-col items-center"
    >
      <h2 className="text-sm font-black uppercase tracking-[0.3em] text-foreground/80">JUST Social</h2>
      <div className="mt-4 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full bg-primary suspense-loader-dot"
          />
        ))}
      </div>
    </motion.div>
  </div>
);

export function App() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [showSignIn, setShowSignIn] = useState(() => {
    return localStorage.getItem("appState_showSignIn") === "true";
  });
  const [showSignUp, setShowSignUp] = useState(() => {
    return localStorage.getItem("appState_showSignUp") === "true";
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [isBanChecking, setIsBanChecking] = useState(true);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");

  // Initialize Tab Notifications Hook
  const { unreadCount, latestMessage, notificationCount, setNotificationCount, latestNotification } = useTabNotifications(userId);

  // Global Ban Check
  const fingerprint = useFingerprint();

  // Initialize Global Auto Token Refresh
  useAuthRefresh();

  useEffect(() => {
    if (!fingerprint) return;
    const checkBanStatus = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("bypassed") === "true") {
          setIsBanned(false);
          return;
        }

        // Direct check against Supabase
        const { data: banData, error: banError } = await supabase
          .from('banned_users')
          .select('reason')
          .or(`fingerprint.eq.${fingerprint}${userId ? `,user_id.eq.${userId}` : ''}`)
          .eq('is_active', true)
          .maybeSingle();

        if (banError) throw banError;

        if (banData) {
          setIsBanned(true);
          if (location.pathname !== '/banned') {
            navigate('/banned', { replace: true, state: { reason: banData.reason } });
          }
        } else {
          setIsBanned(false);
          if (location.pathname === '/banned') {
            navigate('/', { replace: true });
          }
        }
      } catch (err) {
        console.error("Global ban check failed", err);
      } finally {
        setIsBanChecking(false);
      }
    };
    checkBanStatus();
  }, [fingerprint, userId, location.pathname, navigate]);

  // Global Realtime Ban Watcher (Instant kick)
  useEffect(() => {
    if (!fingerprint && !userId) return;

    const channel = supabase
      .channel('global-ban-watch')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'banned_users' },
        (payload) => {
          if (payload.new.user_id === userId || payload.new.fingerprint === fingerprint) {
            setIsBanned(true);
            navigate('/banned', { replace: true, state: { reason: payload.new.reason } });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fingerprint, navigate]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("appState_showSignIn", String(showSignIn));
  }, [showSignIn]);

  useEffect(() => {
    localStorage.setItem("appState_showSignUp", String(showSignUp));
  }, [showSignUp]);

  // Check auth state on mount and listen for changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      if (user) {
        setIsLoggedIn(true);
        setUserEmail(user.email || "");
        setUserId(user.id);
        // Close sign-in/sign-up modals on successful auth (e.g. Google OAuth redirect)
        setShowSignIn(false);
        setShowSignUp(false);

        if (event === "SIGNED_IN") {
          const authProvider = localStorage.getItem('auth_provider');
          const hasShownWelcome = sessionStorage.getItem('welcomeShown');

          if (authProvider === 'google' && !hasShownWelcome) {
            sessionStorage.setItem('welcomeShown', 'true');
            // Because Google OAuth redirects the page, onLoginSuccess callback isn't fired.
            // We must trigger the welcome screen here!
            supabase
              .from("public_profiles")
              .select("full_name, username")
              .eq("id", user.id)
              .maybeSingle()
              .then(({ data }) => {
                const name = data?.full_name || data?.username || user.user_metadata?.full_name || user.user_metadata?.username || user.email?.split("@")[0] || "";
                setWelcomeName(name);
                setShowWelcomeScreen(true);
                setTimeout(() => setShowWelcomeScreen(false), 5000);
              });
          }

          const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
          if (authProvider === 'google' && googleAvatar) {
            // Trigger owns profile creation; we only verify and update avatar if profile exists.
            supabase
              .from("users")
              .select("id")
              .eq("id", user.id)
              .maybeSingle()
              .then(({ data, error }) => {
                setProfileImageUrl(googleAvatar);

                if (!data) {
                  console.error("Profile not created by trigger for user:", user.id, error?.message || 'profile_missing');
                  return;
                }

                saveUserProfileImage(user.id, googleAvatar)
                  .then(() => setProfileImageUrl(googleAvatar), (err: any) => console.error("Error saving Google profile image:", err));
              }, (err: any) => console.error("Error checking user:", err));
          }
        }
      } else {
        setIsLoggedIn(false);
        setUserEmail("");
        setProfileImageUrl("");
        // If user logs out, go to home
        navigate("/");
        setShowSignIn(false);
        setShowSignUp(false);
        setShowProfileMenu(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, [navigate]);



  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowSignIn(false);
      setShowSignUp(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setIsLoggedIn(false);
    setUserEmail("");
    setUserId(null);
    setShowSignIn(false);
    setShowSignUp(false);
    setShowProfileMenu(false);
    navigate("/");
    localStorage.removeItem("appState_showSignIn");
    localStorage.removeItem("appState_showSignUp");
  };

  // Profile image state
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const [profileImageLoaded, setProfileImageLoaded] = useState(false);

  // Load profile image when user logs in
  useEffect(() => {
    const loadProfileImage = async () => {
      if (!isLoggedIn || !userEmail) {
        setProfileImageUrl("");
        setProfileImageLoaded(false);
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (user) {
          const authProvider = localStorage.getItem('auth_provider');

          // Check DB first
          const { data } = await supabase
            .from("public_profiles")
            .select("avatar_url, full_name, username")
            .eq("id", user.id)
            .single();

          if (data?.avatar_url && data.avatar_url.trim() !== '') {
            setProfileImageUrl(data.avatar_url);
          } else if (authProvider === 'google' && (user.user_metadata?.avatar_url || user.user_metadata?.picture)) {
            const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
            setProfileImageUrl(googleAvatar);
            // background save
            saveUserProfileImage(user.id, googleAvatar).then(() => { }, console.error);
          } else {
            const fallbackName = data?.full_name || data?.username || user.user_metadata?.full_name || userEmail;
            setProfileImageUrl(getUserAvatarUrl(null, fallbackName));
          }
        }
      } catch (err) {
        console.error("Failed to load profile image", err);
        setProfileImageUrl(getUserAvatarUrl(null, userEmail));
      }
      setProfileImageLoaded(true);
    };
    loadProfileImage();
  }, [isLoggedIn, userEmail]);

  // Generate avatar from email (fallback)
  const getAvatarUrl = (_email: string) => {
    if (!profileImageLoaded) return ""; // Return empty while loading to prevent flash
    return profileImageUrl || getUserAvatarUrl(null, _email);
  };

  return (
    <ErrorBoundary>
      <div className={`relative min-h-screen w-full flex flex-col items-center overflow-x-hidden select-none ${theme === "dark"
      ? "bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]"
      : "bg-background"
      }`}>
      <Suspense fallback={<SuspenseLoader />}>
        {isBanned && location.pathname !== '/banned' ? (
          <BannedPage />
        ) : (
          <ErrorBoundary>
            <Routes location={location} key={location.pathname}>
              {/* Banned Page */}
              <Route path="/banned" element={<BannedPage />} />

              {/* Landing Page Route */}
              <Route
                path="/"
                element={
                  <LandingPage
                    isLoggedIn={isLoggedIn}
                    onStartClick={() => {
                      if (isLoggedIn) {
                        navigate("/chat");
                      } else {
                        setShowSignIn(true);
                      }
                    }}
                    unreadCount={unreadCount}
                    latestMessage={latestMessage}
                    notificationCount={notificationCount}
                    setNotificationCount={setNotificationCount}
                    latestNotification={latestNotification}
                    userId={userId}
                    onMessagesClick={() => {
                      if (isLoggedIn) {
                        navigate("/messages");
                      } else {
                        setShowSignIn(true);
                      }
                    }}
                    getAvatarUrl={getAvatarUrl}
                    userEmail={userEmail}
                    onSignInClick={() => {
                      setShowSignIn(true);
                      setShowSignUp(false);
                    }}
                    onSignUpClick={() => {
                      setShowSignUp(true);
                      setShowSignIn(false);
                    }}
                    onSignOutClick={handleSignOut}
                    onProfileClick={() => {
                      navigate("/profile");
                      setShowProfileMenu(false);
                    }}
                    onSettingsClick={() => {
                      navigate("/settings");
                      setShowProfileMenu(false);
                    }}
                    onSenderClick={(userId) => {
                      navigate(`/messages?user=${userId}`);
                    }}
                    showProfileMenu={showProfileMenu}
                    setShowProfileMenu={setShowProfileMenu}
                  />
                }
              />

              {/* Video Chat Route */}
              {/* Realtime DM Messages Page */}
              <Route
                path="/messages"
                element={
                  isLoggedIn ? (
                    <>
                      <div className="w-full flex-1">
                          <ErrorBoundary
                            fallback={
                              <PageErrorFallback
                                pageName="Messages"
                                onReset={() => window.location.reload()}
                              />
                            }
                          >
                          <MessagesPage />
                        </ErrorBoundary>
                      </div>
                    </>
                  ) : (
                    <LandingPage
                      isLoggedIn={isLoggedIn}
                      unreadCount={unreadCount}
                      latestMessage={latestMessage}
                      notificationCount={notificationCount}
                      setNotificationCount={setNotificationCount}
                      latestNotification={latestNotification}
                      userId={userId}
                      onStartClick={() => setShowSignIn(true)}
                      onMessagesClick={() => setShowSignIn(true)}
                      getAvatarUrl={getAvatarUrl}
                      userEmail={userEmail}
                      onSignOutClick={handleSignOut}
                      onSignInClick={() => setShowSignIn(true)}
                      onSignUpClick={() => setShowSignUp(true)}
                      onSettingsClick={() => navigate("/settings")}
                      onProfileClick={() => setShowProfileMenu(true)}
                      onSenderClick={(id) => navigate(`/messages?user=${id}`)}
                      showProfileMenu={showProfileMenu}
                      setShowProfileMenu={setShowProfileMenu}
                    />
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
                            pageName="Video Chat"
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

              {/* Profile Route */}
              <Route
                path="/profile"
                element={
                  <AnimatePresence>
                    <ErrorBoundary
                      fallback={
                        <PageErrorFallback
                          pageName="Profile"
                          onReset={() => window.location.reload()}
                        />
                      }
                    >
                      <ProfilePage
                        email={userEmail}
                        onClose={() => navigate("/")}
                      />
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
                          pageName="Profile"
                          onReset={() => window.location.reload()}
                        />
                      }
                    >
                      <ProfilePage
                        email={userEmail}
                        onClose={() => navigate("/")}
                      />
                    </ErrorBoundary>
                  </AnimatePresence>
                }
              />

              {/* Settings Route */}
              <Route
                path="/settings"
                element={
                  <AnimatePresence>
                    <ErrorBoundary
                      fallback={
                        <PageErrorFallback
                          pageName="Settings"
                          onReset={() => window.location.reload()}
                        />
                      }
                    >
                      <SettingsPage />
                    </ErrorBoundary>
                  </AnimatePresence>
                }
              />

              {/* Admin Moderation Dashboard */}
              <Route
                path="/admin"
                element={
                  <ErrorBoundary
                    fallback={
                      <PageErrorFallback
                        pageName="Admin Dashboard"
                        onReset={() => window.location.reload()}
                      />
                    }
                  >
                    <AdminDashboard />
                  </ErrorBoundary>
                }
              />
            </Routes>
          </ErrorBoundary>
        )}
      </Suspense>

      {/* Sign In Modal */}
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
                onClose={() => setShowSignIn(false)}
                onSwitchToSignUp={() => {
                  setShowSignIn(false);
                  setShowSignUp(true);
                }}
                onLoginSuccess={async (email: string) => {
                  setShowSignIn(false);
                  setIsLoggedIn(true);
                  setUserEmail(email);

                  // Manually trigger welcome screen for manual login
                  let name = email.split("@")[0] || "";
                  try {
                    const sessionData = await supabase.auth.getSession();
                    const userId = sessionData.data.session?.user?.id;
                    if (userId) {
                      const { data } = await supabase.from("public_profiles").select("full_name, username").eq("id", userId).maybeSingle();
                      if (data?.full_name || data?.username) {
                        name = data.full_name || data.username;
                      }
                    }
                  } catch (e) {}

                  setWelcomeName(name);
                  setShowWelcomeScreen(true);
                  setTimeout(() => setShowWelcomeScreen(false), 5000);
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sign Up Modal */}
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
                onClose={() => setShowSignUp(false)}
                onSwitchToSignIn={() => {
                  setShowSignUp(false);
                  setShowSignIn(true);
                }}
                onSignupSuccess={(email: string) => {
                  setShowSignUp(false);
                  setIsLoggedIn(true);
                  setUserEmail(email);

                  // Manually trigger welcome screen for manual signup
                  const name = email.split("@")[0] || "";
                  setWelcomeName(name);
                  setShowWelcomeScreen(true);
                  setTimeout(() => setShowWelcomeScreen(false), 5000);
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Welcome Screen Overlay */}
      <WelcomeOverlay 
        isVisible={showWelcomeScreen} 
        userName={welcomeName} 
        onClose={() => setShowWelcomeScreen(false)} 
      />

      {/* Floating Assistant */}
      <FloatingAssistant />

      </div>
    </ErrorBoundary>
  );
}
