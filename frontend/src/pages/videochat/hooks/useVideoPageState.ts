import { useCallback, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
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
import { handleVideoMessage } from "@/pages/videochat/hooks/videoMessageHandlers";
import { useVideoPageLifecycleEffects } from "@/pages/videochat/hooks/useVideoPageLifecycleEffects";
import { useVideoPageActions } from "@/pages/videochat/hooks/useVideoPageActions";

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

  const handleDataReceived = useCallback(
    (raw: unknown, participant: VideoSessionParticipant) =>
      handleVideoMessage(raw, participant, {
        setWatchVideoIdFromPeer,
        setIsWatchMode,
        setWatchRequestPending,
        setWatchRequestSent,
        setWatchCloseRequestPending,
        setWatchSyncMessage,
        watchSyncTimerRef,
        receiveCodeState,
        setRemoteUserInfo,
        localUserInfoRef,
        hasRepliedInfoRef,
        hasSentInfoRef,
        userInfoTimerRef,
        sendDataRef,
        moderationRef,
        textChatRef,
        setShowReportToast,
        setReportToastMsg,
        reportToastTimerRef,
        onExtraDataReceivedRef,
      }),
    [receiveCodeState],
  );

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
  const prevConnectedRef = useRef(false);

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
  const dotColor = status === "connected"
    ? "#22c55e"
    : (status === "looking" || status === "connecting" ? "#f59e0b" : "#ef4444");
  const { handleSendMessage, handleReportUser, handleFollowRemote, handleSkip, handleExit } = useVideoPageActions({
    connected,
    messageInput,
    sendMessage,
    sendInterrupt: () => sendInterrupt("new_prompt"),
    moderationRef: moderationCallbackRef,
    remotePeerIdentity,
    remoteUserInfo,
    localUserInfo,
    followLoading,
    isFollowingRemote,
    setFollowLoading,
    setIsFollowingRemote,
    sendData,
    t,
    setShowReportToast,
    setReportToastMsg,
    reportToastTimerRef,
    notConnectedTimerRef,
    setNotConnectedToast,
    screenShareCleanup: () => screenShare.cleanupScreenShare(),
    clearMessages,
    coreSkip,
    coreExit,
  });
  useVideoPageLifecycleEffects({
    connected,
    status,
    statusMessage,
    messages,
    showChatHistory,
    chatInputOpen,
    setUnreadCount,
    prevMsgCountRef,
    setStatusBarVisible,
    statusBarTimerRef,
    isWatchMode,
    setIsWatchMode,
    watchVideoIdFromPeer,
    setWatchVideoIdFromPeer,
    setWatchRequestPending,
    setWatchCloseRequestPending,
    setIsWhiteboardMode,
    resetCodeEditor,
    clearMessages,
    localUserInfo,
    localUserInfoRef,
    hasSentInfoRef,
    hasRepliedInfoRef,
    setRemoteUserInfo,
    setIsFollowingRemote,
    setPeerInfoHovered,
    remoteUserInfo,
    userInfoTimerRef,
    sendData,
    myCountry,
    countryLoading,
    deviceFingerprint,
    setLocalUserInfo,
    messagesEndRef,
    showFeaturePanel,
    featurePanelRef,
    setShowFeaturePanel,
    watchSyncTimerRef,
    reportToastTimerRef,
    longPressTimerRef,
    notConnectedTimerRef,
    prevConnectedRef,
  });

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
