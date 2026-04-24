import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTitle } from "@/context/TitleContext";
import { supabase } from "@/lib/supabaseClient";
import { getUserAvatarUrl } from "@/lib/utils";
import type {
  CommunityMemberProfile,
  LandingAvatarPreview,
  LandingNotificationActor,
  LandingPageProps,
  RawCommunityMemberProfile,
} from "@/features/landing/types";

const SECTION_IDS = ["top", "features", "community", "about"] as const;
const FEEDBACK_SUCCESS_DURATION_MS = 2500;

type LandingControllerParams = Pick<
  LandingPageProps,
  | "isLoggedIn"
  | "notificationCount"
  | "showProfileMenu"
  | "setShowProfileMenu"
  | "unreadCount"
  | "userEmail"
  | "userId"
>;

export function useLandingPageController({
  isLoggedIn,
  notificationCount = 0,
  showProfileMenu,
  setShowProfileMenu,
  unreadCount = 0,
  userEmail,
  userId = null,
}: LandingControllerParams) {
  const { t, language } = useLanguage();
  const { setBaseTitle } = useTitle();

  const [headerTranslate, setHeaderTranslate] = useState(0);
  const [activeSection, setActiveSection] =
    useState<(typeof SECTION_IDS)[number]>("top");
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [fbCategory, setFbCategory] = useState("general");
  const [fbRating, setFbRating] = useState(0);
  const [fbHoverRating, setFbHoverRating] = useState(0);
  const [fbMessage, setFbMessage] = useState("");
  const [fbLoading, setFbLoading] = useState(false);
  const [fbSuccess, setFbSuccess] = useState(false);
  const [fbError, setFbError] = useState("");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [unreadSenders, setUnreadSenders] = useState<LandingAvatarPreview[]>([]);
  const [notifActors, setNotifActors] = useState<LandingNotificationActor[]>([]);
  const [communityMembers, setCommunityMembers] = useState<
    CommunityMemberProfile[]
  >([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState("");

  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const lastScrollRef = useRef(0);
  const tickingRef = useRef(false);

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  const formatJoinedDate = (date: string | null) => {
    if (!date) {
      return String(t("landing:community.joinedRecently"));
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return String(t("landing:community.joinedRecently"));
    }

    return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en-US", {
      month: "short",
      year: "numeric",
    }).format(parsedDate);
  };

  const handleFeedbackSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!fbMessage.trim()) {
      setFbError(String(t("landing:feedback.errors.messageRequired")));
      return;
    }

    if (fbRating === 0) {
      setFbError(String(t("landing:feedback.errors.ratingRequired")));
      return;
    }

    setFbLoading(true);
    setFbError("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId || null,
          email: userEmail || null,
          name: userEmail ? userEmail.split("@")[0] : null,
          category: fbCategory,
          rating: fbRating,
          message: fbMessage.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("API Route Failed");
      }

      setFbSuccess(true);
      setFbMessage("");
      setFbRating(0);
      setFbCategory("general");

      window.setTimeout(() => {
        setFbSuccess(false);
        setShowFeedbackModal(false);
      }, FEEDBACK_SUCCESS_DURATION_MS);
    } catch {
      setFbError(String(t("landing:feedback.errors.requestFailed")));
    } finally {
      setFbLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !userId) {
      setUnreadSenders([]);
      setNotifActors([]);
      return;
    }

    const fetchPreviewActors = async () => {
      try {
        if (unreadCount > 0) {
          const { data: myConversations } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("user_id", userId);

          const conversationIds =
            myConversations?.map((conversation) => conversation.conversation_id) ||
            [];

          if (conversationIds.length > 0) {
            const { data: messages } = await supabase
              .from("messages")
              .select("sender_id")
              .in("conversation_id", conversationIds)
              .neq("sender_id", userId)
              .neq("status", "read");

            if (messages?.length) {
              const senderIds = Array.from(
                new Set(messages.map((message) => message.sender_id)),
              ).slice(0, 12);

              const { data: users } = await supabase
                .from("public_profiles")
                .select("id, avatar_url, full_name, username")
                .in("id", senderIds);

              if (users) {
                setUnreadSenders(
                  users.map((user) => ({
                    id: user.id,
                    avatar: getUserAvatarUrl(
                      user.avatar_url,
                      user.full_name || user.username,
                    ),
                  })),
                );
              }
            } else {
              setUnreadSenders([]);
            }
          } else {
            setUnreadSenders([]);
          }
        } else {
          setUnreadSenders([]);
        }

        if (notificationCount > 0) {
          const { data: notifications } = await supabase
            .from("notifications")
            .select("actor_id, type")
            .eq("user_id", userId)
            .eq("is_read", false)
            .order("created_at", { ascending: false })
            .limit(30);

          if (notifications?.length) {
            const actorMap = new Map<string, string>();
            notifications.forEach((notification) => {
              if (!actorMap.has(notification.actor_id)) {
                actorMap.set(notification.actor_id, notification.type);
              }
            });

            const actorIds = Array.from(actorMap.keys()).slice(0, 12);
            const { data: users } = await supabase
              .from("public_profiles")
              .select("id, avatar_url, full_name, username")
              .in("id", actorIds);

            if (users) {
              setNotifActors(
                users.map((user) => ({
                  id: user.id,
                  avatar: getUserAvatarUrl(
                    user.avatar_url,
                    user.full_name || user.username,
                  ),
                  type: actorMap.get(user.id) || "",
                })),
              );
            }
          } else {
            setNotifActors([]);
          }
        } else {
          setNotifActors([]);
        }
      } catch (error) {
        console.error("Fetch unread actors err:", error);
      }
    };

    fetchPreviewActors();
  }, [isLoggedIn, notificationCount, unreadCount, userId]);

  useEffect(() => {
    let isCancelled = false;

    const fetchCommunityMembers = async () => {
      setMembersLoading(true);
      setMembersError("");

      try {
        const primaryResponse = await supabase
          .from("public_profiles")
          .select(
            "id, full_name, username, avatar_url, bio, university, chat_hanger, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(12);

        let rows = (primaryResponse.data ?? []) as RawCommunityMemberProfile[];
        let queryError = primaryResponse.error;

        if (
          queryError &&
          (queryError.message?.includes("university") ||
            queryError.message?.includes("chat_hanger"))
        ) {
          const fallbackResponse = await supabase
            .from("public_profiles")
            .select("id, full_name, username, avatar_url, bio, created_at")
            .order("created_at", { ascending: false })
            .limit(12);

          rows = (fallbackResponse.data ?? []) as RawCommunityMemberProfile[];
          queryError = fallbackResponse.error;
        }

        if (queryError) {
          throw queryError;
        }

        if (isCancelled) {
          return;
        }

        const normalizedRows = rows
          .filter((item) => Boolean(item?.id))
          .map((item) => {
            const displayName =
              item.full_name?.trim() ||
              item.username?.trim() ||
              String(t("landing:community.fallbackMemberName"));

            return {
              id: item.id,
              fullName: displayName,
              username: item.username?.trim() || "",
              avatarUrl: getUserAvatarUrl(item.avatar_url, displayName),
              bio:
                item.bio?.trim() || String(t("landing:community.fallbackBio")),
              university: item.university?.trim() || "",
              chatHanger: item.chat_hanger?.trim() || "",
              createdAt: item.created_at,
            };
          });

        setCommunityMembers(normalizedRows);
      } catch (error) {
        console.error("Error fetching community members:", error);
        if (!isCancelled) {
          setMembersError(String(t("landing:community.loadError")));
          setCommunityMembers([]);
        }
      } finally {
        if (!isCancelled) {
          setMembersLoading(false);
        }
      }
    };

    fetchCommunityMembers();

    return () => {
      isCancelled = true;
    };
  }, [language, t]);

  useEffect(() => {
    setBaseTitle(String(t("landing:pageTitle")));
  }, [setBaseTitle, t]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 300;

      for (let index = SECTION_IDS.length - 1; index >= 0; index -= 1) {
        const section = document.getElementById(SECTION_IDS[index]);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(SECTION_IDS[index]);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const updateScrollbarWidth = () => {
      const root = document.getElementById("root") || document.documentElement;
      const scrollbarWidth = window.innerWidth - root.clientWidth;
      document.documentElement.style.setProperty(
        "--scrollbar-width",
        `${scrollbarWidth}px`,
      );
    };

    const handleScroll = (event: Event) => {
      const target = event.target as HTMLElement | Document;
      let currentScroll = window.scrollY;

      if (target instanceof Element) {
        if (
          target.id !== "root" &&
          target.tagName !== "HTML" &&
          target.tagName !== "BODY"
        ) {
          return;
        }

        currentScroll = target.scrollTop;
      } else if (target instanceof Document) {
        currentScroll =
          target.documentElement.scrollTop || target.body.scrollTop;
      }

      if (tickingRef.current) {
        return;
      }

      tickingRef.current = true;

      requestAnimationFrame(() => {
        const lastScroll = lastScrollRef.current;

        if (currentScroll > lastScroll && currentScroll > 60) {
          setHeaderTranslate(-120);
        } else if (currentScroll < lastScroll - 5 || currentScroll <= 30) {
          setHeaderTranslate(0);
        }

        lastScrollRef.current = currentScroll;
        tickingRef.current = false;
      });
    };

    updateScrollbarWidth();
    window.addEventListener("resize", updateScrollbarWidth);
    window.addEventListener("scroll", handleScroll, {
      passive: true,
      capture: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("resize", updateScrollbarWidth);
    };
  }, []);

  useEffect(() => {
    if (!showProfileMenu) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [setShowProfileMenu, showProfileMenu]);

  return {
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
  };
}
