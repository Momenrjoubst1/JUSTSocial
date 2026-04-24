import { ElasticSlider } from "@/components/ui/shared";
import React, { lazy, Suspense, memo } from "react";
import { useTranslation } from "react-i18next";
import { styles } from "@/pages/videochat/VideoChatPage.styles";
import { Avatar, VerifiedBadge, isUserVerified } from "@/components/ui/core";
import type { UseVideoPageStateReturn } from "@/pages/videochat/hooks/useVideoPageState";
import { WaitingOverlay } from "./WaitingOverlay";
import { RemotePeerInfoOverlay } from "./RemotePeerInfoOverlay";
import { FeaturePanel } from "./FeaturePanel";
import { ControlBar } from "./ControlBar";
import { ChatInputBar } from "./ChatInputBar";
import { StatusBar } from "./StatusBar";
import { AgentConversationOverlay } from "./AgentConversationOverlay";
import { LocalTranslationOverlay } from "./LocalTranslationOverlay";
import { useLocalTranslation } from "@/pages/videochat/hooks/useLocalTranslation";

const WatchModeOverlay = lazy(() => import("@/features/watch-mode").then((module) => ({ default: module.WatchModeOverlay })));
const AvatarScene = lazy(() => import("@/features/avatar").then((module) => ({ default: module.AvatarScene })));
const InfiniteMenu = lazy(() => import("@/components/ui/navigation").then((module) => ({ default: module.InfiniteMenu })));
const EnhancedIDE = lazy(() => import("@/features/code-editor").then((module) => ({ default: module.EnhancedIDE })));
const WhiteboardOverlay = lazy(() => import("@/features/whiteboard").then((module) => ({ default: module.WhiteboardOverlay })));

interface MessageBubbleProps {
  avatarSrc?: string;
  avatarName: string;
  displayName: string;
  isVerified: boolean;
  messageText: string;
  style: React.CSSProperties;
}

const RemoteMessageBubble = memo(function RemoteMessageBubble({
  avatarSrc,
  avatarName,
  displayName,
  isVerified,
  messageText,
  style,
}: MessageBubbleProps) {
  return (
    <div style={style}>
      <Avatar src={avatarSrc} name={avatarName} size={26} loading="lazy" decoding="async" />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 3 }}>
          {displayName}
          {isVerified && <VerifiedBadge size={12} />}
        </span>
        <span style={{ fontSize: 13, color: "#fff" }}>{messageText}</span>
      </div>
    </div>
  );
});

const LocalMessageBubble = memo(function LocalMessageBubble({
  avatarSrc,
  avatarName,
  displayName,
  isVerified,
  messageText,
  style,
}: MessageBubbleProps) {
  return (
    <div style={style}>
      <Avatar src={avatarSrc} name={avatarName} size={26} loading="lazy" decoding="async" />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 3 }}>
          {displayName}
          {isVerified && <VerifiedBadge size={12} />}
        </span>
        <span style={{ fontSize: 13, color: "#fff" }}>{messageText}</span>
      </div>
    </div>
  );
});

export const VideoCore = memo(function VideoCore(state: UseVideoPageStateReturn & { chess?: any; ai?: any; aiBubbles?: {id: string; text: string; done?: boolean}[], userBubbles?: {id: string; text: string; done: boolean}[] }) {
  const { chess, ai, aiBubbles = [], userBubbles = [], ...coreState } = state;
  const { t: tvc } = useTranslation("videochat");
  const { t: tcommon } = useTranslation("common");
  const {
    t,
    onExit,
    userEmail,
    userName,
    moderation,

    showReportToast,
    reportToastMsg,

    myCountry,
    updateCountry,
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

    unreadCount,
    setUnreadCount,

    localUserInfo,
    remoteUserInfo,
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
    handleToggleAudio,

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

    screenShare,
    handleReportUser,
    handleFollowRemote,
    handleVolumeChange,

    handleSkip,
    handleToggleSearch,
    handleExit,
    dotColor,
  } = coreState;

  const [aiFlash, setAiFlash] = React.useState(false);
  const prevAiActive = React.useRef(ai?.isActive);

  React.useEffect(() => {
    if (ai?.isActive && !prevAiActive.current) {
        setAiFlash(true);
        const timer = setTimeout(() => setAiFlash(false), 1000);
        return () => clearTimeout(timer);
    }
    prevAiActive.current = ai?.isActive;
  }, [ai?.isActive]);

  const {
    isEnabled: isLocalTranslationEnabled,
    isBusy: isLocalTranslationBusy,
    lines: localTranslationLines,
    errorMessage: localTranslationError,
    toggleTranslation: toggleLocalTranslation,
  } = useLocalTranslation({ isRoomActive: connected });

  const localVideoContainerStyle: React.CSSProperties = {
      ...styles.videoWrapper,
      position: "relative",
      overflow: "hidden",
      transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      border: ai?.isActive ? "2px solid rgba(255, 255, 255, 0.8)" : "1px solid rgba(255, 255, 255, 0.1)",
      boxShadow: ai?.isActive ? "0 0 25px rgba(255, 255, 255, 0.3), inset 0 0 15px rgba(255, 255, 255, 0.2)" : "none",
  };
  const handleWatchModeClose = React.useCallback(() => {
    sendData({ type: "watch-exit-request" });
  }, [sendData]);

  const handleWhiteboardClose = React.useCallback(() => {
    setIsWhiteboardMode(false);
  }, [setIsWhiteboardMode]);

  const handleAvatarToggle = React.useCallback(() => {
    setIsAvatarMode((prev: boolean) => !prev);
  }, [setIsAvatarMode]);

  return (
    <div style={styles.root}>
      {moderation.isBanned && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.92)",
            backdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🚫</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{tvc("suspended.title")}</h2>
          <p style={{ fontSize: 14, color: "#a1a1aa", textAlign: "center", maxWidth: 400, marginBottom: 10 }}>
            {tvc("suspended.description")}
          </p>
          {moderation.banInfo?.reason && (
            <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>{tvc("suspended.reason", { reason: moderation.banInfo.reason })}</p>
          )}
          {moderation.banInfo?.expiresAt && (
            <p style={{ fontSize: 12, color: "#fbbf24", marginBottom: 12 }}>
              {tvc("suspended.expires", { date: new Date(moderation.banInfo.expiresAt).toLocaleString() })}
            </p>
          )}
          <button
            onClick={onExit}
            aria-label={tcommon("goBack")}
            style={{
              marginTop: 24,
              padding: "10px 32px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {tcommon("goBack")}
          </button>
        </div>
      )}

      {status === "error-camera" && (
        <div style={styles.errorOverlay}>
          <div style={styles.errorCard}>
            <div style={styles.errorIcon}>🚨</div>
            <h2 style={styles.errorTitle}>{tvc("cameraAccess.title")}</h2>
            <p style={styles.errorDesc}>
              {statusMessage || tvc("cameraAccess.description")}
            </p>
            <button
              onClick={() => window.location.reload()}
              aria-label={tcommon("tryAgain")}
              style={styles.errorBtn}
            >
              {tcommon("tryAgain")}
            </button>
            <button
              onClick={onExit}
              aria-label={tcommon("goBack")}
              style={{ ...styles.errorBtn, background: "rgba(255,255,255,0.05)", border: "none" }}
            >
              {tcommon("goBack")}
            </button>
          </div>
        </div>
      )}

      {showReportToast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9998,
            background: reportToastMsg.includes("banned") ? "rgba(220,38,38,0.9)" : "rgba(34,197,94,0.9)",
            color: "#fff",
            padding: "10px 24px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 4px 18px rgba(0,0,0,0.3)",
            pointerEvents: "none",
          }}
        >
          {reportToastMsg}
        </div>
      )}


      {isWatchMode && (
        <Suspense fallback={null}>
          <WatchModeOverlay
            sendData={sendData}
            localStream={localStreamRef.current}
            remoteVideoSrcObject={(remoteVideoRef.current?.srcObject as MediaStream) ?? null}
            externalVideoId={watchVideoIdFromPeer}
            pageRemoteVideoRef={remoteVideoRef}
            pageLocalVideoRef={localVideoRef}
            localCameraMuted={cameraMuted}
            remoteCameraMuted={remoteCameraMuted}
            syncMessage={watchSyncMessage}
            onClose={handleWatchModeClose}
          />
        </Suspense>
      )}

      {watchRequestPending && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.45)" }}>
          <div style={{ background: "rgba(20,20,30,0.95)", border: "1px solid var(--vc-panel-border)", borderRadius: 20, padding: 24, minWidth: 320 }}>
            <h3 style={{ color: "#fff", marginBottom: 8 }}>{tvc("watchRequest.title")}</h3>
            <p style={{ color: "var(--vc-text-secondary)", marginBottom: 16 }}>{tvc("watchRequest.partnerWantsWatch")}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setWatchRequestPending(false);
                  sendData({ type: "watch-accept" });
                  setIsWatchMode(true);
                }}
                aria-label={tcommon("accept")}
                style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#10b981", color: "#fff", cursor: "pointer" }}
              >
                {tcommon("accept")}
              </button>
              <button
                onClick={() => {
                  setWatchRequestPending(false);
                  sendData({ type: "watch-decline" });
                }}
                aria-label={tcommon("decline")}
                style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: "pointer" }}
              >
                {tcommon("decline")}
              </button>
            </div>
          </div>
        </div>
      )}

      {watchRequestSent && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 70, color: "#93c5fd" }}>
          {tvc("watchRequest.waiting")}
        </div>
      )}

      {watchCloseRequestPending && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.45)" }}>
          <div style={{ background: "rgba(20,20,30,0.95)", border: "1px solid var(--vc-panel-border)", borderRadius: 20, padding: 24, minWidth: 320 }}>
            <h3 style={{ color: "#fff", marginBottom: 8 }}>{tvc("watchClose.title")}</h3>
            <p style={{ color: "var(--vc-text-secondary)", marginBottom: 16 }}>{tvc("watchClose.description")}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setWatchCloseRequestPending(false);
                  sendData({ type: "watch-exit-confirm" });
                  setIsWatchMode(false);
                  setWatchVideoIdFromPeer(null);
                  sessionStorage.removeItem("vc_watch_mode");
                  sessionStorage.removeItem("vc_watch_id");
                }}
                aria-label={tcommon("exit")}
                style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer" }}
              >
                {tcommon("exit")}
              </button>
              <button
                onClick={() => setWatchCloseRequestPending(false)}
                aria-label={tcommon("cancel")}
                style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: "pointer" }}
              >
                {tcommon("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCodeMode && (
        <Suspense fallback={null}>
          <EnhancedIDE
            userEmail={userEmail}
            onClose={closeCodeEditor}
            localStream={localStreamRef.current}
            remoteStream={(remoteVideoRef.current?.srcObject as MediaStream) ?? null}
          />
        </Suspense>
      )}

      {isWhiteboardMode && (
        <Suspense fallback={null}>
          <WhiteboardOverlay
            sendData={sendData}
            onClose={handleWhiteboardClose}
            localStream={localStreamRef.current}
            remoteStream={(remoteVideoRef.current?.srcObject as MediaStream) ?? null}
            pageRemoteVideoRef={remoteVideoRef}
          />
        </Suspense>
      )}

      {isAvatarMode && (
        <Suspense fallback={null}>
          <AvatarScene isEnabled={isAvatarMode} onToggle={handleAvatarToggle} room={roomRef.current} isCameraEnabled={!cameraMuted} />
        </Suspense>
      )}


      <div style={{ ...styles.videosContainer, ...(isWatchMode ? { position: "absolute", opacity: 0, pointerEvents: "none", zIndex: -10 } : {}) }}>
        <div style={styles.videoSection}>
          <div
            style={styles.videoWrapper}
            onPointerDown={handleRemotePointerDown}
            onPointerUp={handleRemotePointerUp}
            onPointerLeave={handleRemotePointerUp}
            onContextMenu={(event) => event.preventDefault()}
          >
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ ...styles.remoteVideo, ...(remoteCameraMuted ? { opacity: 0 } : {}) }}
            />

            {remoteCameraMuted && connected && (
              <div style={{ position: "absolute", inset: 0, background: "#000", zIndex: 2 }} />
            )}

            <RemotePeerInfoOverlay
              remoteUserInfo={remoteUserInfo}
              localUserInfo={localUserInfo}
              remotePeerIdentity={remotePeerIdentity || ""}
              connected={connected}
              styles={styles}
              isFollowingRemote={isFollowingRemote}
              followLoading={followLoading}
              peerInfoHovered={peerInfoHovered}
              setPeerInfoHovered={setPeerInfoHovered}
              handleFollowRemote={handleFollowRemote}
              handleReportUser={handleReportUser}
              moderation={moderation}
              t={t}
              isUserVerified={isUserVerified}
            />

            {connected && (
              <div 
                style={{ 
                  position: "absolute", 
                  bottom: -2, 
                  left: 0, 
                  right: 0, 
                  zIndex: 15, 
                  display: "flex", 
                  justifyContent: "center", 
                  padding: "12px 12px 14px",
                  pointerEvents: "auto"
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div style={{ width: 240 }}>
                   <ElasticSlider defaultValue={50} maxValue={100} className="volume-bar-engraved" onChange={handleVolumeChange} />
                </div>
              </div>
            )}

            {!connected && (
              <WaitingOverlay isSearching={isSearching} statusMessage={statusMessage} status={status} styles={styles} />
            )}

            {showCountryGlobe && (
              <div style={{ position: "absolute", inset: 0, zIndex: 20, background: "rgba(0,0,0,0.75)", borderRadius: "inherit" }}>
                <Suspense fallback={null}>
                  <InfiniteMenu
                    items={countryMenuItems}
                    onSelect={(item) => {
                      updateCountry(item.code || "");
                      setShowCountryGlobe(false);
                    }}
                  />
                </Suspense>
                <button
                  onClick={() => setShowCountryGlobe(false)}
                  aria-label={tvc("closeCountrySelection")}
                  style={{ position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.5)", color: "#fff", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            )}

            <div style={styles.remoteMessagesContainer}>
              {messages
                .filter((message) => message.sender === "remote" && visibleMsgIds.has(message._id))
                .reverse()
                .slice(0, 3)
                .map((message, index) => (
                  <RemoteMessageBubble
                    key={message._id}
                    avatarSrc={remoteUserInfo?.avatar ?? undefined}
                    avatarName={remoteUserInfo?.name || tcommon("guest")}
                    displayName={remoteUserInfo?.name || remotePeerIdentity || tcommon("guest")}
                    isVerified={isUserVerified(remoteUserInfo?.userId)}
                    messageText={message.text}
                    style={{
                      ...styles.remoteMessageBubble,
                      bottom: index * 70,
                      opacity: 1 - index * 0.15,
                      pointerEvents: "none",
                    }}
                  />
                ))}
            </div>

            <div style={styles.localNotificationsContainer}>
              {messages
                .filter((message) => message.sender === "local" && visibleMsgIds.has(message._id))
                .reverse()
                .slice(0, 3)
                .map((message, index) => (
                  <LocalMessageBubble
                    key={message._id}
                    avatarSrc={localUserInfo?.avatar ?? undefined}
                    avatarName={localUserInfo?.name || userName}
                    displayName={localUserInfo?.name || userName}
                    isVerified={isUserVerified(localUserInfo?.userId)}
                    messageText={message.text}
                    style={{
                      ...styles.remoteMessageBubble,
                      bottom: index * 70,
                      opacity: 1 - index * 0.15,
                      pointerEvents: "none",
                    }}
                  />
                ))}
            </div>

            <button
              onClick={() => {
                setShowChatHistory(!showChatHistory);
                setUnreadCount(0);
              }}
              aria-label={tvc("toggleChatHistory")}
              style={{ ...styles.chatHistoryBtn, ...(messages.length === 0 ? { opacity: 0.3, pointerEvents: "none" } : {}) }}
              title={String(t("videochat.chatHistory"))}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
                <path d="M1 4v6h6" />
                <path d="M3.51 15a9 9 0 100-6.36L1 10" />
              </svg>
              {unreadCount > 0 && <span style={styles.chatBadge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
            </button>

            {showChatHistory && (
              <div style={styles.chatHistoryPanel}>
                <div style={styles.chatHistoryHeader}>
                  <span style={{ color: "var(--vc-text)", fontSize: 14, fontWeight: 600 }}>{String(t("videochat.chatHistory"))}</span>
                  <button onClick={() => setShowChatHistory(false)} aria-label={tvc("closeChatHistory")} style={styles.chatHistoryClose}>✕</button>
                </div>
                <div style={styles.chatHistoryMessages}>
                  {messages.length === 0 && (
                    <p style={{ color: "var(--vc-text-muted)", fontSize: 13, textAlign: "center", margin: "auto" }}>
                      {String(t("videochat.noMessagesYet"))}
                    </p>
                  )}
                  {messages.map((message, index) => {
                    const time = message.time instanceof Date
                      ? message.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "";
                    const local = message.sender === "local";
                    return (
                      <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: local ? "flex-end" : "flex-start", width: "100%" }}>
                        <div style={{ ...styles.chatHistoryMsg, background: local ? "#6366f1" : "rgba(255,255,255,0.1)" }}>
                          <span style={{ fontSize: 13, color: local ? "#fff" : "var(--vc-text)" }}>{message.text}</span>
                        </div>
                        <span style={{ fontSize: 10, color: "var(--vc-text-muted)", marginTop: 2 }}>
                          {local ? tvc("you") : (remoteUserInfo?.name || remotePeerIdentity || tvc("them"))} · {time}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={styles.videoSection}>
          <div style={localVideoContainerStyle}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={(() => {
                const baseStyle = screenShare.isScreenSharing
                  ? { ...styles.localVideo, transform: "none" }
                  : styles.localVideo;
                return cameraMuted && !screenShare.isScreenSharing
                  ? { ...baseStyle, ...styles.videoDark, opacity: 1 }
                  : baseStyle;
              })()}
            />

            {/* Premium AI Startup Flash */}
            {aiFlash && (
                <div 
                   style={{
                       position: "absolute",
                       inset: 0,
                       background: "linear-gradient(45deg, #fff, rgba(255,255,255,0.5))",
                       zIndex: 50,
                       opacity: 0,
                       pointerEvents: "none",
                       animation: "ai-flash-anim 1s cubic-bezier(0.23, 1, 0.32, 1) forwards",
                       borderRadius: "inherit"
                   }}
                />
            )}

            {/* Pulsing Ambient Light for Active AI */}
            {ai?.isActive && (
                <div 
                    style={{
                        position: "absolute",
                        inset: -2,
                        pointerEvents: "none",
                        zIndex: 5,
                        background: "transparent",
                        border: "3px solid rgba(255, 255, 255, 0.6)",
                        filter: "blur(4px)",
                        animation: "ai-active-pulse 2.5s infinite ease-in-out",
                        borderRadius: "inherit"
                    }}
                />
            )}

            <AgentConversationOverlay
              aiActive={ai?.isActive}
              connected={connected}
              aiBubbles={aiBubbles}                userBubbles={userBubbles}              localLabel={localUserInfo?.name || userName}
              agentLabel="Sigma"
              audioMuted={audioMuted}
              sendData={sendData}
            />

            <LocalTranslationOverlay
              isEnabled={isLocalTranslationEnabled}
              isBusy={isLocalTranslationBusy}
              lines={localTranslationLines}
              errorMessage={localTranslationError}
              onToggle={toggleLocalTranslation}
            />

            {localUserInfo && (
              <div style={{ ...styles.peerInfoOverlay, pointerEvents: "auto", cursor: "default" }}>
                <Avatar src={localUserInfo.avatar} name={localUserInfo.name} size={30} />
                <div style={styles.peerInfo}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={styles.peerUsername}>{localUserInfo.name}</span>
                    {isUserVerified(localUserInfo.userId) && <VerifiedBadge size={15} />}
                    {localUserInfo.countryCode && (
                      <img
                        src={`https://flagcdn.com/${localUserInfo.countryCode.toLowerCase()}.svg`}
                        alt={tvc("flagAlt")}
                        style={{ width: 16, height: 11, objectFit: "cover", borderRadius: 2 }}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </div>
                  <div style={styles.peerCountry}>{localUserInfo.country}</div>
                </div>
              </div>
            )}

            <FeaturePanel
              styles={styles}
              showFeaturePanel={showFeaturePanel}
              setShowFeaturePanel={setShowFeaturePanel}
              featurePanelRef={featurePanelRef as React.RefObject<HTMLDivElement>}
              cameraMuted={cameraMuted}
              handleToggleCamera={handleToggleCamera}
              screenShare={screenShare}
              agentActive={ai?.isActive}
              agentLoading={ai?.isLoading}
              startAgent={ai?.startForRoom}
              stopAgent={ai?.stopForRoom}
              roomRef={roomRef}
              isWatchMode={isWatchMode}
              connected={connected}
              sendData={sendData}
              setWatchRequestSent={setWatchRequestSent}
              isWhiteboardMode={isWhiteboardMode}
              setIsWhiteboardMode={setIsWhiteboardMode}
              isCodeMode={isCodeMode}
              openCodeEditor={openCodeEditor}
              closeCodeEditor={closeCodeEditor}
              isChessMode={chess?.isActive}
              openChess={chess?.openChess}
              closeChess={chess?.closeChess}
            />

            {screenShare.isScreenSharing && (
              <div style={styles.screenShareIndicator}>
                <div style={styles.screenShareDot} />
                <span style={styles.screenShareText}>{tvc("screenSharing")}</span>
              </div>
            )}
          </div>

          <ChatInputBar
            chatInputOpen={chatInputOpen}
            setChatInputOpen={setChatInputOpen}
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            handleSendMessage={handleSendMessage}
            connected={connected}
            unreadCount={unreadCount}
            setUnreadCount={setUnreadCount}
            notConnectedToast={notConnectedToast}
          />
        </div>
      </div>

      <StatusBar
        styles={styles}
        isWatchMode={isWatchMode}
        statusBarVisible={statusBarVisible}
        status={status}
        statusMessage={statusMessage}
        dotColor={dotColor}
        t={t}
      />

      <ControlBar
        styles={styles}
        isWatchMode={isWatchMode}
        cameraMuted={cameraMuted}
        audioMuted={audioMuted}
        onToggleCamera={handleToggleCamera}
        onToggleAudio={handleToggleAudio}
        onNext={handleSkip}
        onEnd={handleToggleSearch}
        isSearching={isSearching}
      />
    </div>
  );
});
