import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import {
  useVideoChat,
  useTextChat,
  type VideoChatPageProps as BaseProps,
  type VideoSessionParticipant,
} from "@/pages/videochat/core";
import { useModeration, type UseModerationReturn } from "@/pages/videochat/core/useModeration";
import { useCountryPreference } from "@/pages/videochat/core/useCountryPreference";
import { COUNTRIES } from "@/pages/videochat/core/countries";
import { useCodeEditor } from "@/pages/videochat/features";
import { useFingerprint } from "@/hooks/useFingerprint";
import { useScreenShare } from "@/features/screen-share";
import type { InfiniteMenuItem } from "@/components/ui/navigation";
import type { WatchSyncMessage } from "@/features/watch-mode/types";
import { useMicPcmStream } from "@/features/ai-agent/hooks/useMicPcmStream";

export interface VideoChatPageProps extends BaseProps {
  onExtraDataReceived?: (raw: any) => void;
  aiActive?: boolean;
}

export interface VideoUserInfo {
  name: string;
  country: string;
  flag: string;
  countryCode: string;
  avatar: string | null;
  userId: string;
  fingerprint: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function codeToEmoji(code: string): string {
  return code
    ? code.toUpperCase().replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
    : "🌐";
}

export function useVideoPageState(props: VideoChatPageProps) {
  const { onExit, userEmail = "" } = props;
  const { t } = useLanguage();
  const userName = userEmail ? userEmail.split("@")[0] : String(t("videochat.you"));
  const deviceFingerprint = useFingerprint();

  const { country: myCountry, updateCountry, loading: countryLoading } = useCountryPreference();

  const [showReportToast, setShowReportToast] = useState(false);
  const [reportToastMsg, setReportToastMsg] = useState("");

  const [showCountryGlobe, setShowCountryGlobe] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isWatchMode, setIsWatchMode] = useState(() => sessionStorage.getItem("vc_watch_mode") === "true");
  const [watchVideoIdFromPeer, setWatchVideoIdFromPeer] = useState<string | null>(() => sessionStorage.getItem("vc_watch_id"));
  const [watchRequestPending, setWatchRequestPending] = useState(false);
  const [watchRequestSent, setWatchRequestSent] = useState(false);
  const [watchCloseRequestPending, setWatchCloseRequestPending] = useState(false);
  const [watchSyncMessage, setWatchSyncMessage] = useState<WatchSyncMessage | null>(null);

  const [isWhiteboardMode, setIsWhiteboardMode] = useState(false);
  const [isAvatarMode, setIsAvatarMode] = useState(false);

  const [showFeaturePanel, setShowFeaturePanel] = useState(false);
  const featurePanelRef = useRef<HTMLDivElement>(null);

  const [statusBarVisible, setStatusBarVisible] = useState(true);
  const statusBarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const prevMsgCountRef = useRef(0);

  const [localUserInfo, setLocalUserInfo] = useState<VideoUserInfo | null>(null);
  const [remoteUserInfo, setRemoteUserInfo] = useState<VideoUserInfo | null>(null);
  const [isFollowingRemote, setIsFollowingRemote] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [peerInfoHovered, setPeerInfoHovered] = useState(false);

  const hasSentInfoRef = useRef(false);
  const hasRepliedInfoRef = useRef(false);
  const localUserInfoRef = useRef<VideoUserInfo | null>(null);
  const sendDataRef = useRef<(data: object) => void>(() => {
    // no-op until useVideoChat initializes
  });
  const onExtraDataReceivedRef = useRef<((raw: any) => void) | undefined>(undefined);
  const moderationCallbackRef = useRef<UseModerationReturn | null>(null);

  const {
    isCodeMode,
    openCodeEditor,
    receiveCodeState,
    closeCodeEditor,
    reset: resetCodeEditor,
  } = useCodeEditor((payload: object) => sendDataRef.current(payload));

  const moderationRef = useRef<UseModerationReturn | null>(null);
  const roomNameRef = useRef<string | null>(null);
  const textChatRef = useRef<any>(null);

  const watchSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userInfoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notConnectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRemotePointerDown = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => {
      setShowCountryGlobe(true);
      longPressTimerRef.current = null;
    }, 600);
  }, []);

  const handleRemotePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleDataReceived = useCallback(async (raw: unknown, _participant: VideoSessionParticipant) => {
    try {
      if (!isRecord(raw) || typeof raw.type !== "string") {
        return;
      }

      if (raw.type === "watch" && typeof raw.videoId === "string") {
        setWatchVideoIdFromPeer(raw.videoId);
        setIsWatchMode(true);
        return;
      }

      if (raw.type === "watch-request") {
        setWatchRequestPending(true);
        return;
      }

      if (raw.type === "watch-accept") {
        setIsWatchMode(true);
        setWatchRequestSent(false);
        return;
      }

      if (raw.type === "watch-decline") {
        setWatchRequestSent(false);
        return;
      }

      if (raw.type === "watch-exit-request") {
        setWatchCloseRequestPending(true);
        return;
      }

      if (raw.type === "watch-exit-confirm") {
        setIsWatchMode(false);
        setWatchVideoIdFromPeer(null);
        sessionStorage.removeItem("vc_watch_mode");
        sessionStorage.removeItem("vc_watch_id");
        return;
      }

      if (raw.type === "watch-sync") {
        const action = raw.action;
        if (action === "play" || action === "pause" || action === "seek" || action === "watch") {
          setWatchSyncMessage({
            action,
            time: typeof raw.time === "number" ? raw.time : undefined,
            videoId: typeof raw.videoId === "string" ? raw.videoId : undefined,
          } as WatchSyncMessage);
          if (watchSyncTimerRef.current) {
            clearTimeout(watchSyncTimerRef.current);
          }
          watchSyncTimerRef.current = setTimeout(() => setWatchSyncMessage(null), 100);
        }
        return;
      }

      if (raw.type === "code-open") {
        receiveCodeState(Boolean(raw.state));
        return;
      }

      if (raw.type === "user_info") {
        setRemoteUserInfo({
          name: typeof raw.name === "string" ? raw.name : "Guest",
          country: typeof raw.country === "string" ? raw.country : "World",
          flag: typeof raw.flag === "string" ? raw.flag : "🌐",
          countryCode: typeof raw.countryCode === "string" ? raw.countryCode : "",
          avatar: typeof raw.avatar === "string" ? raw.avatar : null,
          userId: typeof raw.userId === "string" ? raw.userId : "",
          fingerprint: typeof raw.fingerprint === "string" ? raw.fingerprint : null,
        });

        if (localUserInfoRef.current && !hasRepliedInfoRef.current) {
          hasRepliedInfoRef.current = true;
          if (userInfoTimerRef.current) {
            clearTimeout(userInfoTimerRef.current);
          }
          userInfoTimerRef.current = setTimeout(() => {
            const local = localUserInfoRef.current;
            if (local) {
              sendDataRef.current({ type: "user_info", ...local });
              hasSentInfoRef.current = true;
            }
          }, 150);
        }
        return;
      }

      if (raw.type === "banned_kick") {
        moderationRef.current?.onBanned?.({
          banned: true,
          reason: "Banned for guidelines violation.",
        });
        return;
      }

      if (raw.type === "msg") {
        const messageRecord = isRecord(raw.message) ? raw.message : null;
        const text = messageRecord && typeof messageRecord.text === "string" ? messageRecord.text : "";
        const moderationResult = await moderationRef.current?.moderateText(text);
        if (moderationResult && !moderationResult.safe && messageRecord) {
          messageRecord.text = "[Security: Message Hidden]";
          (raw as any).message.text = "[Security: Message Hidden]";
        }
        textChatRef.current?.handleIncomingMessage(raw);
      }

      if (onExtraDataReceivedRef.current) {
        onExtraDataReceivedRef.current(raw);
      }

    } catch (error) {
      console.error('[useVideoPageState.ts] handleDataReceived:', error);
    }
  }, [receiveCodeState]);

  const videoChat = useVideoChat({
    onExit,
    onDataReceived: handleDataReceived,
    countryPreference: myCountry,
    readyToConnect: !countryLoading,
    aiActive: props.aiActive,
  });

  const {
    status,
    statusMessage,
    connected,
    cameraMuted,
    audioMuted,
    remoteCameraMuted,
    isSearching,
    remotePeerIdentity,
    localVideoRef,
    remoteVideoRef,
    localStreamRef,
    roomRef,
    sendData,
    handleSkip: coreSkip,
    handleToggleCamera,
    handleToggleAudio,
    handleToggleSearch,
    handleExit: coreExit,
    handleVolumeChange,
    audioEls,
  } = videoChat;

  sendDataRef.current = sendData;
  onExtraDataReceivedRef.current = props.onExtraDataReceived;
  roomNameRef.current = roomRef.current?.name || null;

  const moderation = useModeration({
    fingerprint: deviceFingerprint,
    userId: localUserInfo?.userId || null,
    identity: remotePeerIdentity,
    roomName: roomNameRef.current,
    connected,
    remoteVideoRef,
    onBanned: () => {
      roomRef.current?.disconnect();
    },
  });
  moderationRef.current = moderation;
  moderationCallbackRef.current = moderation;

  const textChat = useTextChat(sendData);
  textChatRef.current = textChat;

  const {
    messages,
    messageInput,
    setMessageInput,
    visibleMsgIds,
    showChatHistory,
    setShowChatHistory,
    sendMessage,
    clearMessages,
    messagesEndRef,
  } = textChat;

  const [chatInputOpen, setChatInputOpen] = useState(false);
  const [notConnectedToast, setNotConnectedToast] = useState(false);

  const screenShare = useScreenShare(roomRef, localVideoRef, localStreamRef);

  const countryMenuItems = useMemo<InfiniteMenuItem[]>(
    () => COUNTRIES.map((country) => ({
      image: country.code ? `https://flagcdn.com/${country.code.toLowerCase()}.svg` : "",
      emoji: codeToEmoji(country.code),
      title: country.name,
      code: country.code,
    })),
    [],
  );

  const sendInterrupt = useCallback((reason: "new_prompt" | "user_speaking" | "skip" = "new_prompt") => {
    sendData({
      type: "interrupt",
      reason,
    });
  }, [sendData]);

  const handleSendMessage = useCallback(async () => {
    if (!connected) {
      if (notConnectedTimerRef.current) {
        clearTimeout(notConnectedTimerRef.current);
      }
      setNotConnectedToast(true);
      notConnectedTimerRef.current = setTimeout(() => setNotConnectedToast(false), 2500);
      return;
    }

    const text = messageInput.trim();
    if (!text) {
      return;
    }

    const mod = moderationCallbackRef.current;
    if (!mod) return;
    const check = await mod.moderateText(text);
    if (!check.safe) {
      setReportToastMsg(`Security Block: ${check.reason || "content violation"}`);
      setShowReportToast(true);
      if (reportToastTimerRef.current) {
        clearTimeout(reportToastTimerRef.current);
      }
      reportToastTimerRef.current = setTimeout(() => setShowReportToast(false), 3000);
      return;
    }

    sendInterrupt("new_prompt");
    sendMessage();
  }, [connected, messageInput, sendMessage, sendInterrupt]);

  const handleReportUser = useCallback(async () => {
    if (!connected || !remotePeerIdentity) {
      return;
    }

    const mod = moderationCallbackRef.current;
    if (!mod) return;

    const result = await mod.reportUser({
      reportedIdentity: remotePeerIdentity,
      reportedFingerprint: remoteUserInfo?.fingerprint || undefined,
      reportedUserId: remoteUserInfo?.userId || undefined,
      reason: "inappropriate_content",
    });

    if (!result.ok) {
      return;
    }

    if (result.autoBanned) {
      sendData({ type: "banned_kick" });
      setReportToastMsg("User has been permanently banned");
      if (reportToastTimerRef.current) {
        clearTimeout(reportToastTimerRef.current);
      }
      setShowReportToast(true);
      reportToastTimerRef.current = setTimeout(() => setShowReportToast(false), 3000);
      return;
    }

    setReportToastMsg(String(t("videochat.report.success")));
    setShowReportToast(true);
    if (reportToastTimerRef.current) {
      clearTimeout(reportToastTimerRef.current);
    }
    reportToastTimerRef.current = setTimeout(() => setShowReportToast(false), 3000);
  }, [connected, remotePeerIdentity, remoteUserInfo, sendData, t]);

  const handleFollowRemote = useCallback(async () => {
    if (!remoteUserInfo?.userId || !localUserInfo?.userId || followLoading) {
      return;
    }

    if (remoteUserInfo.userId === localUserInfo.userId) {
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowingRemote) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", localUserInfo.userId)
          .eq("following_id", remoteUserInfo.userId);
        setIsFollowingRemote(false);
      } else {
        await supabase
          .from("follows")
          .insert({ follower_id: localUserInfo.userId, following_id: remoteUserInfo.userId });
        setIsFollowingRemote(true);
      }
    } catch (error) {
      console.error("Follow error:", error);
    } finally {
      setFollowLoading(false);
    }
  }, [followLoading, isFollowingRemote, localUserInfo?.userId, remoteUserInfo?.userId]);

  const handleSkip = useCallback(() => {
    screenShare.cleanupScreenShare();
    clearMessages();
    coreSkip();
  }, [clearMessages, coreSkip, screenShare]);

  const handleExit = useCallback(() => {
    screenShare.cleanupScreenShare();
    coreExit();
  }, [coreExit, screenShare]);

  const dotColor = status === "connected"
    ? "#22c55e"
    : (status === "looking" || status === "connecting" ? "#f59e0b" : "#ef4444");

  useEffect(() => {
    sessionStorage.setItem("vc_watch_mode", isWatchMode.toString());
  }, [isWatchMode]);

  useEffect(() => {
    if (watchVideoIdFromPeer) {
      sessionStorage.setItem("vc_watch_id", watchVideoIdFromPeer);
    } else {
      sessionStorage.removeItem("vc_watch_id");
    }
  }, [watchVideoIdFromPeer]);

  useEffect(() => {
    setStatusBarVisible(true);
    if (statusBarTimerRef.current) {
      clearTimeout(statusBarTimerRef.current);
    }
    statusBarTimerRef.current = setTimeout(() => setStatusBarVisible(false), 3000);

    return () => {
      if (statusBarTimerRef.current) {
        clearTimeout(statusBarTimerRef.current);
      }
    };
  }, [status, statusMessage]);

  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const newMessages = messages.slice(prevMsgCountRef.current);
      const remoteCount = newMessages.filter((message) => message.sender === "remote").length;
      if (remoteCount > 0 && !chatInputOpen) {
        setUnreadCount((count) => count + remoteCount);
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [chatInputOpen, messages]);

  useEffect(() => {
    if (showChatHistory || chatInputOpen) {
      setUnreadCount(0);
    }
  }, [chatInputOpen, showChatHistory]);

  const prevConnectedRef = useRef(false);
  useEffect(() => {
    if (!connected) {
      setIsWatchMode(false);
      setWatchVideoIdFromPeer(null);
      setWatchRequestSent(false);
      setWatchRequestPending(false);
      setWatchCloseRequestPending(false);
      setIsWhiteboardMode(false);
      resetCodeEditor();
      prevConnectedRef.current = false;
      hasSentInfoRef.current = false;
      hasRepliedInfoRef.current = false;
      return;
    }

    const isNewConnection = !prevConnectedRef.current;
    prevConnectedRef.current = true;

    if (isNewConnection) {
      clearMessages();
      prevMsgCountRef.current = 0;
      setRemoteUserInfo(null);
      setIsFollowingRemote(false);
      setPeerInfoHovered(false);
      hasSentInfoRef.current = false;
      hasRepliedInfoRef.current = false;
    }

    const sendInfo = () => {
      const local = localUserInfoRef.current;
      if (local && !hasSentInfoRef.current) {
        sendData({ type: "user_info", ...local });
        hasSentInfoRef.current = true;
      }
    };

    sendInfo();
    const timerA = setTimeout(sendInfo, 800);
    const timerB = setTimeout(sendInfo, 2500);

    return () => {
      clearTimeout(timerA);
      clearTimeout(timerB);
    };
  }, [clearMessages, connected, resetCodeEditor, sendData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, messagesEndRef]);

  useEffect(() => {
    localUserInfoRef.current = localUserInfo;
  }, [localUserInfo]);

  useEffect(() => {
    let active = true;

    const fetchLocalInfo = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!active) return;

        let name = "Guest";
        let avatar: string | null = null;
        const user = auth.user;

        if (user) {
          const { data: profile } = await supabase
            .from("users")
            .select("full_name, username, avatar_url")
            .eq("id", user.id)
            .maybeSingle();

          if (!active) return;
          if (profile) {
            name = profile.full_name || profile.username || user.email?.split("@")[0] || "Guest";
            avatar = profile.avatar_url;
          }
        }

        const flag = codeToEmoji(myCountry);
        const mappedCountryName = COUNTRIES.find((country) => country.code === myCountry)?.name || "World";

        setLocalUserInfo({
          name,
          country: mappedCountryName,
          flag,
          countryCode: myCountry || "",
          avatar,
          userId: user?.id || "",
          fingerprint: deviceFingerprint,
        });
      } catch (error) {
        console.error("Error fetching local info:", error);
      }
    };

    if (!countryLoading) {
      fetchLocalInfo();
    }

    return () => { active = false; };
  }, [countryLoading, deviceFingerprint, myCountry]);

  useEffect(() => {
    if (!remoteUserInfo?.userId || !localUserInfo?.userId) {
      setIsFollowingRemote(false);
      return;
    }

    let active = true;
    const checkFollow = async () => {
      try {
        const { data } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", localUserInfo.userId)
          .eq("following_id", remoteUserInfo.userId)
          .maybeSingle();

        if (active) {
          setIsFollowingRemote(Boolean(data));
        }
      } catch (error) {
        console.error('checkFollow error:', error);
      }
    };
    checkFollow();
    return () => { active = false; };
  }, [localUserInfo?.userId, remoteUserInfo?.userId]);

  useEffect(() => {
    if (!showFeaturePanel) return;

    const handler = (event: PointerEvent) => {
      if (featurePanelRef.current && !featurePanelRef.current.contains(event.target as Node)) {
        setShowFeaturePanel(false);
      }
    };

    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showFeaturePanel]);

  useEffect(() => {
    return () => {
      if (watchSyncTimerRef.current) clearTimeout(watchSyncTimerRef.current);
      if (userInfoTimerRef.current) clearTimeout(userInfoTimerRef.current);
      if (reportToastTimerRef.current) clearTimeout(reportToastTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (notConnectedTimerRef.current) clearTimeout(notConnectedTimerRef.current);
      if (statusBarTimerRef.current) clearTimeout(statusBarTimerRef.current);
    };
  }, []);

  // ربط إرسال الصوت للـ Agent عند تفعيل AI والاتصال
  useMicPcmStream({
    enabled: (props.aiActive ?? false) && connected,
    stream: localStreamRef.current,
    sendData,
  });

  return {
    t,
    onExit,
    userEmail,
    userName,
    moderation,

    showReportToast,
    setShowReportToast,
    reportToastMsg,
    setReportToastMsg,

    myCountry,
    updateCountry,
    countryLoading,
    showCountryGlobe,
    setShowCountryGlobe,
    handleRemotePointerDown,
    handleRemotePointerUp,
    countryMenuItems,

    isWatchMode,
    setIsWatchMode,
    watchVideoIdFromPeer,
    setWatchVideoIdFromPeer,
    watchRequestPending,
    setWatchRequestPending,
    watchRequestSent,
    setWatchRequestSent,
    watchCloseRequestPending,
    setWatchCloseRequestPending,
    watchSyncMessage,

    isWhiteboardMode,
    setIsWhiteboardMode,
    isAvatarMode,
    setIsAvatarMode,

    showFeaturePanel,
    setShowFeaturePanel,
    featurePanelRef,

    statusBarVisible,
    setStatusBarVisible,

    unreadCount,
    setUnreadCount,

    localUserInfo,
    setLocalUserInfo,
    remoteUserInfo,
    setRemoteUserInfo,
    isFollowingRemote,
    followLoading,
    peerInfoHovered,
    setPeerInfoHovered,

    isCodeMode,
    openCodeEditor,
    closeCodeEditor,

    status,
    statusMessage,
    connected,
    cameraMuted,
    audioMuted,
    remoteCameraMuted,
    isSearching,
    remotePeerIdentity,

    localVideoRef,
    remoteVideoRef,
    localStreamRef,
    roomRef,

    sendData,
    handleToggleCamera,

    messages,
    messageInput,
    setMessageInput,
    visibleMsgIds,
    showChatHistory,
    setShowChatHistory,
    messagesEndRef,

    chatInputOpen,
    setChatInputOpen,
    notConnectedToast,
    handleSendMessage,
    sendInterrupt,

    screenShare,
    handleReportUser,
    handleFollowRemote,
    handleVolumeChange,

    handleSkip,
    handleToggleAudio,
    handleToggleSearch,
    handleExit,
    dotColor,
  };
}

export type UseVideoPageStateReturn = ReturnType<typeof useVideoPageState>;
