import { useCallback, type MutableRefObject } from "react";
import i18n from "@/i18n/i18next";
import { supabase } from "@/lib/supabaseClient";
import type { VideoUserInfo } from "@/pages/videochat/hooks/useVideoPageState";
import type { UseModerationReturn } from "@/pages/videochat/core/useModeration";

interface UseVideoPageActionsParams {
  connected: boolean;
  messageInput: string;
  sendMessage: () => void;
  sendInterrupt: () => void;
  moderationRef: MutableRefObject<UseModerationReturn | null>;
  remotePeerIdentity: string | null;
  remoteUserInfo: VideoUserInfo | null;
  localUserInfo: VideoUserInfo | null;
  followLoading: boolean;
  isFollowingRemote: boolean;
  setFollowLoading: (value: boolean) => void;
  setIsFollowingRemote: (value: boolean) => void;
  sendData: (data: object) => void;
  t: (key: string, params?: Record<string, unknown>) => unknown;
  setShowReportToast: (value: boolean) => void;
  setReportToastMsg: (value: string) => void;
  reportToastTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  notConnectedTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setNotConnectedToast: (value: boolean) => void;
  screenShareCleanup: () => void;
  clearMessages: () => void;
  coreSkip: () => void;
  coreExit: () => void;
}

export function useVideoPageActions(params: UseVideoPageActionsParams) {
  const {
    connected,
    messageInput,
    sendMessage,
    sendInterrupt,
    moderationRef,
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
    screenShareCleanup,
    clearMessages,
    coreSkip,
    coreExit,
  } = params;

  const handleSendMessage = useCallback(async () => {
    if (!connected) {
      if (notConnectedTimerRef.current) {
        clearTimeout(notConnectedTimerRef.current);
      }
      setNotConnectedToast(true);
      notConnectedTimerRef.current = setTimeout(() => {
        setNotConnectedToast(false);
      }, 2500);
      return;
    }

    const text = messageInput.trim();
    if (!text) return;

    const mod = moderationRef.current;
    if (!mod) return;

    const check = await mod.moderateText(text);
    if (!check.safe) {
      setReportToastMsg(i18n.t("videochat:securityBlock", { reason: check.reason || "content violation" }));
      setShowReportToast(true);
      if (reportToastTimerRef.current) {
        clearTimeout(reportToastTimerRef.current);
      }
      reportToastTimerRef.current = setTimeout(() => setShowReportToast(false), 3000);
      return;
    }

    sendInterrupt();
    sendMessage();
  }, [
    connected,
    messageInput,
    moderationRef,
    notConnectedTimerRef,
    reportToastTimerRef,
    sendInterrupt,
    sendMessage,
    setReportToastMsg,
    setShowReportToast,
    setNotConnectedToast,
  ]);

  const handleReportUser = useCallback(async () => {
    if (!connected || !remotePeerIdentity) return;

    const mod = moderationRef.current;
    if (!mod) return;

    const result = await mod.reportUser({
      reportedIdentity: remotePeerIdentity,
      reportedFingerprint: remoteUserInfo?.fingerprint || undefined,
      reportedUserId: remoteUserInfo?.userId || undefined,
      reason: "inappropriate_content",
    });

    if (!result.ok) return;

    if (result.autoBanned) {
      sendData({ type: "banned_kick" });
      setReportToastMsg(i18n.t("videochat:userBanned"));
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
  }, [connected, remotePeerIdentity, remoteUserInfo, moderationRef, reportToastTimerRef, sendData, setReportToastMsg, setShowReportToast, t]);

  const handleFollowRemote = useCallback(async () => {
    if (!remoteUserInfo?.userId || !localUserInfo?.userId || followLoading) return;
    if (remoteUserInfo.userId === localUserInfo.userId) return;

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
  }, [followLoading, isFollowingRemote, localUserInfo?.userId, remoteUserInfo?.userId, setFollowLoading, setIsFollowingRemote]);

  const handleSkip = useCallback(() => {
    screenShareCleanup();
    clearMessages();
    coreSkip();
  }, [clearMessages, coreSkip, screenShareCleanup]);

  const handleExit = useCallback(() => {
    screenShareCleanup();
    coreExit();
  }, [coreExit, screenShareCleanup]);

  return {
    handleSendMessage,
    handleReportUser,
    handleFollowRemote,
    handleSkip,
    handleExit,
  };
}
