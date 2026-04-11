import { ElasticSlider } from "@/components/ui/shared";
import React, { lazy, Suspense } from "react";
import { styles } from "@/pages/videochat/VideoChatPage.styles";
import { Avatar, VerifiedBadge, isUserVerified } from "@/components/ui/core";
import type { UseVideoPageStateReturn } from "@/pages/videochat/hooks/useVideoPageState";
import { WaitingOverlay } from "./WaitingOverlay";
import { RemotePeerInfoOverlay } from "./RemotePeerInfoOverlay";
import { FeaturePanel } from "./FeaturePanel";
import { ControlBar } from "./ControlBar";
import { ChatInputBar } from "./ChatInputBar";
import { StatusBar } from "./StatusBar";

const WatchModeOverlay = lazy(() => import("@/features/watch-mode").then((module) => ({ default: module.WatchModeOverlay })));
const AvatarScene = lazy(() => import("@/features/avatar").then((module) => ({ default: module.AvatarScene })));
const InfiniteMenu = lazy(() => import("@/components/ui/navigation").then((module) => ({ default: module.InfiniteMenu })));
const EnhancedIDE = lazy(() => import("@/features/code-editor").then((module) => ({ default: module.EnhancedIDE })));
const ChessGame = lazy(() => import("@/features/chess").then((module) => ({ default: module.ChessGame })));
const WhiteboardOverlay = lazy(() => import("@/features/whiteboard").then((module) => ({ default: module.WhiteboardOverlay })));

export function VideoCore(state: UseVideoPageStateReturn) {
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

    isChessMode,
    chessPeerMove,
    isWhiteChessPlayer,
    sendMove,
    openChess,
    closeChess,

    isCodeMode,
    openCodeEditor,
    closeCodeEditor,

    status,
    statusMessage,
    connected,
    cameraMuted,
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

    agentActive,
    agentLoading,
    agentError,
    startForRoom,
    stopForRoom,
    isStreaming,
    agentMessage,

    chatInputOpen,
    setChatInputOpen,
    notConnectedToast,
    handleSendMessage,

    screenShare,
    handleReportUser,
    handleFollowRemote,
    handleVolumeChange,

    handleSkip,
    handleExit,
    dotColor,
  } = state;

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
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Account Suspended</h2>
          <p style={{ fontSize: 14, color: "#a1a1aa", textAlign: "center", maxWidth: 400, marginBottom: 10 }}>
            Your access has been restricted due to a violation of our community guidelines.
          </p>
          {moderation.banInfo?.reason && (
            <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>Reason: {moderation.banInfo.reason}</p>
          )}
          {moderation.banInfo?.expiresAt && (
            <p style={{ fontSize: 12, color: "#fbbf24", marginBottom: 12 }}>
              Expires: {new Date(moderation.banInfo.expiresAt).toLocaleString()}
            </p>
          )}
          <button
            onClick={onExit}
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
            Go Back
          </button>
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

      {agentError && (
        <div
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9998,
            background: "rgba(220,38,38,0.9)",
            color: "#fff",
            padding: "10px 24px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            pointerEvents: "none",
          }}
        >
          {agentError}
        </div>
      )}

      {agentActive && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[30] w-full max-w-lg px-4 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white font-semibold text-sm">الذكاء الاصطناعي (Sigma)</span>
              {isStreaming && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </div>

            {agentLoading && !agentMessage && (
              <div className="flex space-x-1.5 items-center justify-center p-2" dir="ltr">
                <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}

            {agentMessage && <p className="text-white text-sm md:text-base leading-relaxed">{agentMessage}</p>}

            <button
              onClick={() => {
                void stopForRoom(roomRef.current?.name);
              }}
              className="mt-4 pointer-events-auto bg-red-500/20 hover:bg-red-500/80 border border-red-500/50 text-red-100 hover:text-white text-xs px-4 py-1.5 rounded-full"
            >
              إيقاف المحادثة
            </button>
          </div>
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
            onClose={() => sendData({ type: "watch-exit-request" })}
          />
        </Suspense>
      )}

      {watchRequestPending && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.45)" }}>
          <div style={{ background: "rgba(20,20,30,0.95)", border: "1px solid var(--vc-panel-border)", borderRadius: 20, padding: 24, minWidth: 320 }}>
            <h3 style={{ color: "#fff", marginBottom: 8 }}>Watch Request</h3>
            <p style={{ color: "var(--vc-text-secondary)", marginBottom: 16 }}>Partner wants to start Watch Together with you.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setWatchRequestPending(false);
                  sendData({ type: "watch-accept" });
                  setIsWatchMode(true);
                }}
                style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#10b981", color: "#fff", cursor: "pointer" }}
              >
                Accept
              </button>
              <button
                onClick={() => {
                  setWatchRequestPending(false);
                  sendData({ type: "watch-decline" });
                }}
                style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: "pointer" }}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {watchRequestSent && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 70, color: "#93c5fd" }}>
          Waiting for partner to accept Watch Request...
        </div>
      )}

      {watchCloseRequestPending && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.45)" }}>
          <div style={{ background: "rgba(20,20,30,0.95)", border: "1px solid var(--vc-panel-border)", borderRadius: 20, padding: 24, minWidth: 320 }}>
            <h3 style={{ color: "#fff", marginBottom: 8 }}>Close Watch Mode?</h3>
            <p style={{ color: "var(--vc-text-secondary)", marginBottom: 16 }}>Partner wants to exit Watch Together. Do you agree?</p>
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
                style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer" }}
              >
                Exit
              </button>
              <button
                onClick={() => setWatchCloseRequestPending(false)}
                style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: "pointer" }}
              >
                Cancel
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
            onClose={() => setIsWhiteboardMode(false)}
            localStream={localStreamRef.current}
            remoteStream={(remoteVideoRef.current?.srcObject as MediaStream) ?? null}
            pageRemoteVideoRef={remoteVideoRef}
          />
        </Suspense>
      )}

      {isAvatarMode && (
        <Suspense fallback={null}>
          <AvatarScene isEnabled={isAvatarMode} onToggle={() => setIsAvatarMode(!isAvatarMode)} room={roomRef.current} isCameraEnabled={!cameraMuted} />
        </Suspense>
      )}

      {isChessMode && (
        <Suspense fallback={null}>
          <ChessGame
            isWhite={isWhiteChessPlayer}
            peerMove={chessPeerMove}
            onClose={closeChess}
            onMove={sendMove}
            localStream={localStreamRef.current}
            remoteStream={(remoteVideoRef.current?.srcObject as MediaStream) ?? null}
          />
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
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 15, display: "flex", justifyContent: "center", padding: "6px 12px 8px" }}>
                <ElasticSlider defaultValue={50} maxValue={100} className="volume-bar-engraved" onChange={handleVolumeChange} />
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
                  <div
                    key={message._id}
                    style={{
                      ...styles.remoteMessageBubble,
                      bottom: index * 70,
                      opacity: 1 - index * 0.15,
                      pointerEvents: "none",
                    }}
                  >
                    <Avatar src={remoteUserInfo?.avatar} name={remoteUserInfo?.name || "Guest"} size={26} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 3 }}>
                        {remoteUserInfo?.name || remotePeerIdentity || "Guest"}
                        {isUserVerified(remoteUserInfo?.userId) && <VerifiedBadge size={12} />}
                      </span>
                      <span style={{ fontSize: 13, color: "#fff" }}>{message.text}</span>
                    </div>
                  </div>
                ))}
            </div>

            <div style={styles.localNotificationsContainer}>
              {messages
                .filter((message) => message.sender === "local" && visibleMsgIds.has(message._id))
                .reverse()
                .slice(0, 3)
                .map((message, index) => (
                  <div
                    key={message._id}
                    style={{
                      ...styles.remoteMessageBubble,
                      bottom: index * 70,
                      opacity: 1 - index * 0.15,
                      pointerEvents: "none",
                    }}
                  >
                    <Avatar src={localUserInfo?.avatar} name={localUserInfo?.name || userName} size={26} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{localUserInfo?.name || userName}</span>
                      <span style={{ fontSize: 13, color: "#fff" }}>{message.text}</span>
                    </div>
                  </div>
                ))}
            </div>

            <button
              onClick={() => {
                setShowChatHistory(!showChatHistory);
                setUnreadCount(0);
              }}
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
                  <button onClick={() => setShowChatHistory(false)} style={styles.chatHistoryClose}>✕</button>
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
                          {local ? "You" : (remoteUserInfo?.name || remotePeerIdentity || String(t("videochat.them")))} · {time}
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
          <div style={styles.videoWrapper}>
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
                        alt="Flag"
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
              agentActive={agentActive}
              agentLoading={agentLoading}
              startAgent={(room) => {
                void startForRoom(room);
              }}
              stopAgent={(room) => {
                void stopForRoom(room);
              }}
              roomRef={roomRef}
              isWatchMode={isWatchMode}
              connected={connected}
              sendData={sendData}
              setWatchRequestSent={setWatchRequestSent}
              isWhiteboardMode={isWhiteboardMode}
              setIsWhiteboardMode={setIsWhiteboardMode}
              t={t}
              isCodeMode={isCodeMode}
              openCodeEditor={openCodeEditor}
              closeCodeEditor={closeCodeEditor}
              isChessMode={isChessMode}
              openChess={openChess}
              closeChess={closeChess}
            />

            {screenShare.isScreenSharing && (
              <div style={styles.screenShareIndicator}>
                <div style={styles.screenShareDot} />
                <span style={styles.screenShareText}>Screen Sharing</span>
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
        onToggleCamera={handleToggleCamera}
        onNext={handleSkip}
        onEnd={handleExit}
      />
    </div>
  );
}
