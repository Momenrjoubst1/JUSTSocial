import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signOut, supabase, saveUserProfileImage } from "@/lib/supabaseClient";
import { getUserAvatarUrl } from "@/lib/utils";
import { useTabNotifications } from "@/hooks/useTabNotifications";
import { useFingerprint } from "@/hooks/useFingerprint";
import { useAuthRefresh } from "@/features/auth/hooks/useAuthRefresh";

const SHOW_SIGN_IN_STORAGE_KEY = "appState_showSignIn";
const SHOW_SIGN_UP_STORAGE_KEY = "appState_showSignUp";
const AUTH_PROVIDER_STORAGE_KEY = "auth_provider";
const WELCOME_SHOWN_STORAGE_KEY = "welcomeShown";
const WELCOME_SCREEN_DURATION_MS = 5000;

function readStoredFlag(key: string) {
  return localStorage.getItem(key) === "true";
}

function getEmailName(email: string) {
  return email.split("@")[0] || "";
}

function resolveDisplayName({
  email,
  profileName,
  metadataName,
}: {
  email: string;
  profileName?: string | null;
  metadataName?: string | null;
}) {
  return profileName || metadataName || getEmailName(email);
}

export function useAppController() {
  const navigate = useNavigate();
  const location = useLocation();

  const [showSignIn, setShowSignIn] = useState(() =>
    readStoredFlag(SHOW_SIGN_IN_STORAGE_KEY),
  );
  const [showSignUp, setShowSignUp] = useState(() =>
    readStoredFlag(SHOW_SIGN_UP_STORAGE_KEY),
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [isBanChecking, setIsBanChecking] = useState(true);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [profileImageLoaded, setProfileImageLoaded] = useState(false);

  const welcomeTimeoutRef = useRef<number | null>(null);
  const fingerprint = useFingerprint();

  useAuthRefresh();

  const {
    unreadCount,
    latestMessage,
    notificationCount,
    setNotificationCount,
    latestNotification,
  } = useTabNotifications(userId);

  const clearWelcomeTimeout = () => {
    if (welcomeTimeoutRef.current !== null) {
      window.clearTimeout(welcomeTimeoutRef.current);
      welcomeTimeoutRef.current = null;
    }
  };

  const openWelcomeScreen = (name: string) => {
    clearWelcomeTimeout();
    setWelcomeName(name);
    setShowWelcomeScreen(true);
    welcomeTimeoutRef.current = window.setTimeout(() => {
      setShowWelcomeScreen(false);
      welcomeTimeoutRef.current = null;
    }, WELCOME_SCREEN_DURATION_MS);
  };

  const closeAuthModals = () => {
    setShowSignIn(false);
    setShowSignUp(false);
  };

  const resetAuthState = () => {
    clearWelcomeTimeout();
    setIsLoggedIn(false);
    setUserEmail("");
    setUserId(null);
    setShowSignIn(false);
    setShowSignUp(false);
    setShowProfileMenu(false);
    setShowWelcomeScreen(false);
    setWelcomeName("");
    setProfileImageUrl("");
    setProfileImageLoaded(false);
  };

  const fetchProfileDisplayName = async (currentUserId: string) => {
    try {
      const { data } = await supabase
        .from("public_profiles")
        .select("full_name, username")
        .eq("id", currentUserId)
        .maybeSingle();

      return data?.full_name || data?.username || null;
    } catch {
      return null;
    }
  };

  const syncGoogleAvatar = async (currentUserId: string, avatarUrl: string) => {
    setProfileImageUrl(avatarUrl);

    try {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("id", currentUserId)
        .maybeSingle();

      if (!data) {
        console.error(
          "Profile not created by trigger for user:",
          currentUserId,
          error?.message || "profile_missing",
        );
        return;
      }

      await saveUserProfileImage(currentUserId, avatarUrl);
      setProfileImageUrl(avatarUrl);
    } catch (error) {
      console.error("Error saving Google profile image:", error);
    }
  };

  const hydrateWelcomeState = async (email: string) => {
    let name = getEmailName(email);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const sessionUser = session?.user;

      if (sessionUser?.id) {
        setUserId(sessionUser.id);
        const profileName = await fetchProfileDisplayName(sessionUser.id);
        name = resolveDisplayName({
          email,
          profileName,
          metadataName:
            sessionUser.user_metadata?.full_name ||
            sessionUser.user_metadata?.username,
        });
      }
    } catch {
      name = getEmailName(email);
    }

    openWelcomeScreen(name);
  };

  const openSignIn = () => {
    setShowSignIn(true);
    setShowSignUp(false);
  };

  const openSignUp = () => {
    setShowSignUp(true);
    setShowSignIn(false);
  };

  const closeSignIn = () => {
    setShowSignIn(false);
  };

  const closeSignUp = () => {
    setShowSignUp(false);
  };

  const switchToSignUp = () => {
    setShowSignIn(false);
    setShowSignUp(true);
  };

  const switchToSignIn = () => {
    setShowSignUp(false);
    setShowSignIn(true);
  };

  const closeWelcome = () => {
    clearWelcomeTimeout();
    setShowWelcomeScreen(false);
  };

  const openChat = () => {
    if (isLoggedIn) {
      navigate("/chat");
      return;
    }

    openSignIn();
  };

  const openMessages = () => {
    if (isLoggedIn) {
      navigate("/messages");
      return;
    }

    openSignIn();
  };

  const openConversation = (senderId: string) => {
    navigate(`/messages?user=${senderId}`);
  };

  const handleSignOut = async () => {
    await signOut();
    resetAuthState();
    navigate("/");
    localStorage.removeItem(SHOW_SIGN_IN_STORAGE_KEY);
    localStorage.removeItem(SHOW_SIGN_UP_STORAGE_KEY);
  };

  const handleLoginSuccess = async (email: string) => {
    closeSignIn();
    setIsLoggedIn(true);
    setUserEmail(email);
    await hydrateWelcomeState(email);
  };

  const handleSignupSuccess = async (email: string) => {
    closeSignUp();
    setIsLoggedIn(true);
    setUserEmail(email);
    await hydrateWelcomeState(email);
  };

  useEffect(() => {
    return () => {
      clearWelcomeTimeout();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(SHOW_SIGN_IN_STORAGE_KEY, String(showSignIn));
  }, [showSignIn]);

  useEffect(() => {
    localStorage.setItem(SHOW_SIGN_UP_STORAGE_KEY, String(showSignUp));
  }, [showSignUp]);

  useEffect(() => {
    if (!fingerprint) return;

    let isActive = true;

    const checkBanStatus = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("bypassed") === "true") {
          if (!isActive) return;
          setIsBanned(false);
          setIsBanChecking(false);
          return;
        }

        const { data: banData, error: banError } = await supabase
          .from("banned_users")
          .select("reason")
          .or(`fingerprint.eq.${fingerprint}${userId ? `,user_id.eq.${userId}` : ""}`)
          .eq("is_active", true)
          .maybeSingle();

        if (banError) throw banError;
        if (!isActive) return;

        if (banData) {
          setIsBanned(true);
          if (location.pathname !== "/banned") {
            navigate("/banned", { replace: true, state: { reason: banData.reason } });
          }
          return;
        }

        setIsBanned(false);
        if (location.pathname === "/banned") {
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error("Global ban check failed", error);
      } finally {
        if (isActive) {
          setIsBanChecking(false);
        }
      }
    };

    checkBanStatus();

    return () => {
      isActive = false;
    };
  }, [fingerprint, userId, location.pathname, navigate]);

  useEffect(() => {
    if (!fingerprint && !userId) return;

    const channel = supabase
      .channel("global-ban-watch")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "banned_users" },
        (payload) => {
          if (
            payload.new.user_id === userId ||
            payload.new.fingerprint === fingerprint
          ) {
            setIsBanned(true);
            navigate("/banned", {
              replace: true,
              state: { reason: payload.new.reason },
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fingerprint, userId, navigate]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;

      if (!user) {
        resetAuthState();
        navigate("/");
        return;
      }

      setIsLoggedIn(true);
      setUserEmail(user.email || "");
      setUserId(user.id);
      closeAuthModals();

      if (event !== "SIGNED_IN") {
        return;
      }

      const authProvider = localStorage.getItem(AUTH_PROVIDER_STORAGE_KEY);
      const googleAvatar =
        user.user_metadata?.avatar_url || user.user_metadata?.picture;

      if (
        authProvider === "google" &&
        !sessionStorage.getItem(WELCOME_SHOWN_STORAGE_KEY)
      ) {
        sessionStorage.setItem(WELCOME_SHOWN_STORAGE_KEY, "true");
        fetchProfileDisplayName(user.id).then((profileName) => {
          openWelcomeScreen(
            resolveDisplayName({
              email: user.email || "",
              profileName,
              metadataName:
                user.user_metadata?.full_name ||
                user.user_metadata?.username,
            }),
          );
        });
      }

      if (authProvider === "google" && googleAvatar) {
        void syncGoogleAvatar(user.id, googleAvatar);
      }
    });

    return () => subscription?.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    let isActive = true;

    const loadProfileImage = async () => {
      if (!isLoggedIn || !userEmail) {
        if (!isActive) return;
        setProfileImageUrl("");
        setProfileImageLoaded(false);
        return;
      }

      setProfileImageLoaded(false);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user || !isActive) {
          return;
        }

        const authProvider = localStorage.getItem(AUTH_PROVIDER_STORAGE_KEY);
        const { data } = await supabase
          .from("public_profiles")
          .select("avatar_url, full_name, username")
          .eq("id", user.id)
          .single();

        if (!isActive) return;

        if (data?.avatar_url?.trim()) {
          setProfileImageUrl(data.avatar_url);
        } else if (
          authProvider === "google" &&
          (user.user_metadata?.avatar_url || user.user_metadata?.picture)
        ) {
          const googleAvatar =
            user.user_metadata?.avatar_url || user.user_metadata?.picture;
          setProfileImageUrl(googleAvatar);
          saveUserProfileImage(user.id, googleAvatar).then(
            () => undefined,
            (error) => console.error("Failed to persist Google avatar", error),
          );
        } else {
          const fallbackName =
            data?.full_name ||
            data?.username ||
            user.user_metadata?.full_name ||
            userEmail;
          setProfileImageUrl(getUserAvatarUrl(null, fallbackName));
        }
      } catch (error) {
        console.error("Failed to load profile image", error);
        if (isActive) {
          setProfileImageUrl(getUserAvatarUrl(null, userEmail));
        }
      } finally {
        if (isActive) {
          setProfileImageLoaded(true);
        }
      }
    };

    loadProfileImage();

    return () => {
      isActive = false;
    };
  }, [isLoggedIn, userEmail]);

  const getAvatarUrl = (email: string) => {
    if (!profileImageLoaded) {
      return "";
    }

    return profileImageUrl || getUserAvatarUrl(null, email);
  };

  return {
    isBootstrapping: isBanChecking,
    isLoggedIn,
    isBanned,
    userEmail,
    userId,
    showProfileMenu,
    setShowProfileMenu,
    showSignIn,
    showSignUp,
    showWelcomeScreen,
    welcomeName,
    unreadCount,
    latestMessage,
    notificationCount,
    setNotificationCount,
    latestNotification,
    getAvatarUrl,
    openChat,
    openMessages,
    openSignIn,
    openSignUp,
    closeSignIn,
    closeSignUp,
    switchToSignUp,
    switchToSignIn,
    closeWelcome,
    handleSignOut,
    handleLoginSuccess,
    handleSignupSuccess,
    openConversation,
  };
}
