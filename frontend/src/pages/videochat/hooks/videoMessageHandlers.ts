import type { MutableRefObject } from "react";
import type { WatchSyncMessage } from "@/features/watch-mode/types";
import type { UseModerationReturn } from "@/pages/videochat/core/useModeration";
import type { VideoSessionParticipant } from "@/pages/videochat/core";

export interface VideoMessageHandlerDeps {
  setWatchVideoIdFromPeer: (value: string | null) => void;
  setIsWatchMode: (value: boolean) => void;
  setWatchRequestPending: (value: boolean) => void;
  setWatchRequestSent: (value: boolean) => void;
  setWatchCloseRequestPending: (value: boolean) => void;
  setWatchSyncMessage: (value: WatchSyncMessage | null) => void;
  watchSyncTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  receiveCodeState: (value: boolean) => void;
  setRemoteUserInfo: (value: any) => void;
  localUserInfoRef: MutableRefObject<any>;
  hasRepliedInfoRef: MutableRefObject<boolean>;
  hasSentInfoRef: MutableRefObject<boolean>;
  userInfoTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  sendDataRef: MutableRefObject<(data: object) => void>;
  moderationRef: MutableRefObject<UseModerationReturn | null>;
  textChatRef: MutableRefObject<any>;
  setShowReportToast: (value: boolean) => void;
  setReportToastMsg: (value: string) => void;
  reportToastTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  onExtraDataReceivedRef: MutableRefObject<((raw: any) => void) | undefined>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function handleVideoMessage(
  raw: unknown,
  _participant: VideoSessionParticipant,
  deps: VideoMessageHandlerDeps,
) {
  if (!isRecord(raw) || typeof raw.type !== "string") {
    return;
  }

  if (raw.type === "watch" && typeof raw.videoId === "string") {
    deps.setWatchVideoIdFromPeer(raw.videoId);
    deps.setIsWatchMode(true);
    return;
  }

  if (raw.type === "watch-request") {
    deps.setWatchRequestPending(true);
    return;
  }

  if (raw.type === "watch-accept") {
    deps.setIsWatchMode(true);
    deps.setWatchRequestSent(false);
    return;
  }

  if (raw.type === "watch-decline") {
    deps.setWatchRequestSent(false);
    return;
  }

  if (raw.type === "watch-exit-request") {
    deps.setWatchCloseRequestPending(true);
    return;
  }

  if (raw.type === "watch-exit-confirm") {
    deps.setIsWatchMode(false);
    deps.setWatchVideoIdFromPeer(null);
    sessionStorage.removeItem("vc_watch_mode");
    sessionStorage.removeItem("vc_watch_id");
    return;
  }

  if (raw.type === "watch-sync") {
    const action = raw.action;
    if (action === "play" || action === "pause" || action === "seek" || action === "watch") {
      deps.setWatchSyncMessage({
        action,
        time: typeof raw.time === "number" ? raw.time : undefined,
        videoId: typeof raw.videoId === "string" ? raw.videoId : undefined,
      });
      if (deps.watchSyncTimerRef.current) {
        clearTimeout(deps.watchSyncTimerRef.current);
      }
      deps.watchSyncTimerRef.current = setTimeout(() => deps.setWatchSyncMessage(null), 100);
    }
    return;
  }

  if (raw.type === "code-open") {
    deps.receiveCodeState(Boolean(raw.state));
    return;
  }

  if (raw.type === "user_info") {
    deps.setRemoteUserInfo({
      name: typeof raw.name === "string" ? raw.name : "Guest",
      country: typeof raw.country === "string" ? raw.country : "World",
      flag: typeof raw.flag === "string" ? raw.flag : "🌐",
      countryCode: typeof raw.countryCode === "string" ? raw.countryCode : "",
      avatar: typeof raw.avatar === "string" ? raw.avatar : null,
      userId: typeof raw.userId === "string" ? raw.userId : "",
      fingerprint: typeof raw.fingerprint === "string" ? raw.fingerprint : null,
    });

    if (deps.localUserInfoRef.current && !deps.hasRepliedInfoRef.current) {
      deps.hasRepliedInfoRef.current = true;
      if (deps.userInfoTimerRef.current) {
        clearTimeout(deps.userInfoTimerRef.current);
      }
      deps.userInfoTimerRef.current = setTimeout(() => {
        const local = deps.localUserInfoRef.current;
        if (local) {
          deps.sendDataRef.current({ type: "user_info", ...local });
          deps.hasSentInfoRef.current = true;
        }
      }, 150);
    }
    return;
  }

  if (raw.type === "banned_kick") {
    deps.moderationRef.current?.onBanned?.({
      banned: true,
      reason: "Banned for guidelines violation.",
    });
    return;
  }

  if (raw.type === "msg") {
    const messageRecord = isRecord(raw.message) ? raw.message : null;
    const text = messageRecord && typeof messageRecord.text === "string" ? messageRecord.text : "";
    const moderationResult = await deps.moderationRef.current?.moderateText(text);
    if (moderationResult && !moderationResult.safe && messageRecord) {
      messageRecord.text = "[Security: Message Hidden]";
      (raw as any).message.text = "[Security: Message Hidden]";
    }
    deps.textChatRef.current?.handleIncomingMessage(raw);
  }

  if (deps.onExtraDataReceivedRef.current) {
    deps.onExtraDataReceivedRef.current(raw);
  }
}
