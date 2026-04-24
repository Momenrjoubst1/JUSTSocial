import { useEffect, type MutableRefObject } from "react";
import { supabase } from "@/lib/supabaseClient";
import { COUNTRIES } from "@/pages/videochat/core/countries";
import type { VideoUserInfo } from "@/pages/videochat/hooks/useVideoPageState";

interface UseVideoPageLifecycleEffectsParams {
  connected: boolean;
  status: string;
  statusMessage: string;
  messages: Array<{ sender: string }>;
  showChatHistory: boolean;
  chatInputOpen: boolean;
  setUnreadCount: (value: number | ((value: number) => number)) => void;
  prevMsgCountRef: MutableRefObject<number>;
  setStatusBarVisible: (value: boolean) => void;
  statusBarTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  isWatchMode: boolean;
  setIsWatchMode: (value: boolean) => void;
  watchVideoIdFromPeer: string | null;
  setWatchVideoIdFromPeer: (value: string | null) => void;
  setWatchRequestPending: (value: boolean) => void;
  setWatchCloseRequestPending: (value: boolean) => void;
  setIsWhiteboardMode: (value: boolean) => void;
  resetCodeEditor: () => void;
  clearMessages: () => void;
  localUserInfo: VideoUserInfo | null;
  localUserInfoRef: MutableRefObject<VideoUserInfo | null>;
  hasSentInfoRef: MutableRefObject<boolean>;
  hasRepliedInfoRef: MutableRefObject<boolean>;
  setRemoteUserInfo: (value: VideoUserInfo | null) => void;
  setIsFollowingRemote: (value: boolean) => void;
  setPeerInfoHovered: (value: boolean) => void;
  remoteUserInfo: VideoUserInfo | null;
  userInfoTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  sendData: (data: object) => void;
  myCountry: string;
  countryLoading: boolean;
  deviceFingerprint: string | null;
  setLocalUserInfo: (value: VideoUserInfo | null) => void;
  messagesEndRef: MutableRefObject<{
    scrollIntoView: (options?: ScrollIntoViewOptions) => void;
  } | null>;
  showFeaturePanel: boolean;
  featurePanelRef: MutableRefObject<HTMLDivElement | null>;
  setShowFeaturePanel: (value: boolean) => void;
  watchSyncTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  reportToastTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  longPressTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  notConnectedTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  prevConnectedRef: MutableRefObject<boolean>;
}

function codeToEmoji(code: string): string {
  return code
    ? code.toUpperCase().replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
    : "ðŸŒ";
}

export function useVideoPageLifecycleEffects(params: UseVideoPageLifecycleEffectsParams) {
  const {
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
  } = params;

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
  }, [setStatusBarVisible, status, statusBarTimerRef, statusMessage]);

  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const newMessages = messages.slice(prevMsgCountRef.current);
      const remoteCount = newMessages.filter((message) => message.sender === "remote").length;
      if (remoteCount > 0 && !chatInputOpen) {
        setUnreadCount((count) => count + remoteCount);
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [chatInputOpen, messages, prevMsgCountRef, setUnreadCount]);

  useEffect(() => {
    if (showChatHistory || chatInputOpen) {
      setUnreadCount(0);
    }
  }, [chatInputOpen, setUnreadCount, showChatHistory]);

  useEffect(() => {
    if (!connected) {
      setIsWatchMode(false);
      setWatchVideoIdFromPeer(null);
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
  }, [
    clearMessages,
    connected,
    hasRepliedInfoRef,
    hasSentInfoRef,
    localUserInfoRef,
    prevConnectedRef,
    prevMsgCountRef,
    resetCodeEditor,
    sendData,
    setIsFollowingRemote,
    setIsWatchMode,
    setIsWhiteboardMode,
    setPeerInfoHovered,
    setRemoteUserInfo,
    setWatchCloseRequestPending,
    setWatchRequestPending,
    setWatchVideoIdFromPeer,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, messagesEndRef]);

  useEffect(() => {
    localUserInfoRef.current = localUserInfo;
  }, [localUserInfo, localUserInfoRef]);

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
  }, [countryLoading, deviceFingerprint, myCountry, setLocalUserInfo]);

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
        console.error("checkFollow error:", error);
      }
    };
    checkFollow();
    return () => { active = false; };
  }, [localUserInfo?.userId, remoteUserInfo?.userId, setIsFollowingRemote]);

  useEffect(() => {
    if (!showFeaturePanel) return;

    const handler = (event: PointerEvent) => {
      if (featurePanelRef.current && !featurePanelRef.current.contains(event.target as Node)) {
        setShowFeaturePanel(false);
      }
    };

    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [featurePanelRef, setShowFeaturePanel, showFeaturePanel]);

  useEffect(() => {
    return () => {
      if (watchSyncTimerRef.current) clearTimeout(watchSyncTimerRef.current);
      if (userInfoTimerRef.current) clearTimeout(userInfoTimerRef.current);
      if (reportToastTimerRef.current) clearTimeout(reportToastTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (notConnectedTimerRef.current) clearTimeout(notConnectedTimerRef.current);
      if (statusBarTimerRef.current) clearTimeout(statusBarTimerRef.current);
    };
  }, [longPressTimerRef, notConnectedTimerRef, reportToastTimerRef, statusBarTimerRef, userInfoTimerRef, watchSyncTimerRef]);
}
