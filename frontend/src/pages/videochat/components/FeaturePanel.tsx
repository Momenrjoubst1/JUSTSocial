import React from "react";
import { useTranslation } from "react-i18next";
import { MagicAgentIcon } from "@/components/ui/icons/MagicAgentIcon";

interface FeaturePanelProps {
  styles: Record<string, any>;
  showFeaturePanel: boolean;
  setShowFeaturePanel: (v: boolean | ((p: boolean) => boolean)) => void;
  featurePanelRef: React.RefObject<HTMLDivElement>;
  // Camera
  cameraMuted: boolean;
  handleToggleCamera: () => void;
  // Screen share
  screenShare: { isScreenSharing: boolean; handleScreenShare: () => void };
  // AI Agent
  agentActive: boolean;
  agentLoading: boolean;
  startAgent: (room: string) => void;
  stopAgent: (room: string) => void;
  roomRef: React.RefObject<any>;
  // Watch Mode
  isWatchMode: boolean;
  connected: boolean;
  sendData: (data: object) => void;
  setWatchRequestSent: (v: boolean) => void;
  // Whiteboard
  isWhiteboardMode: boolean;
  setIsWhiteboardMode: (v: boolean) => void;
  // Translation (removed legacy t)
  // Code editor
  isCodeMode: boolean;
  openCodeEditor: () => void;
  closeCodeEditor: () => void;
  // Chess
  isChessMode: boolean;
  openChess: () => void;
  closeChess: () => void;
}

/** Locked feature button with tooltip */
function LockedFeatureBtn({
  icon,
  title,
  styles,
}: { icon: React.ReactNode; title: string; styles: Record<string, any> }) {
  const { t } = useTranslation("common");
  return (
    <div style={{ position: 'relative' }}>
      <button
        style={{
          ...styles.hoverBtn,
          opacity: 0.4,
          cursor: 'not-allowed',
          filter: 'grayscale(0.8)',
        }}
        onClick={(e) => {
          e.preventDefault();
          const audio = new Audio('/wtf.wav');
          audio.volume = 0.8;
          audio.play().catch(() => {});
          const el = e.currentTarget.parentElement?.querySelector('.lock-tooltip') as HTMLElement;
          if (el) {
            el.style.opacity = '1';
            el.style.transform = 'translateY(-50%) translateX(0)';
            setTimeout(() => {
              el.style.opacity = '0';
              el.style.transform = 'translateY(-50%) translateX(4px)';
            }, 1800);
          }
        }}
        title={title}
      >
        {icon}
        <span style={{ position: 'absolute', top: -2, right: -2, fontSize: 10, lineHeight: 1 }}>🔒</span>
      </button>
      <span
        className="lock-tooltip"
        style={{
          position: 'absolute', right: '120%', top: '50%',
          transform: 'translateY(-50%) translateX(4px)',
          whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.85)',
          color: '#fbbf24', fontSize: 11, padding: '4px 10px',
          borderRadius: 8, opacity: 0, transition: 'all 0.2s ease',
          pointerEvents: 'none', fontWeight: 600, zIndex: 100,
          border: '1px solid rgba(251,191,36,0.2)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}
      >
        🔒 {t("underDevelopment")}
      </span>
    </div>
  );
}

export const FeaturePanel = React.memo(function FeaturePanel({
  styles,
  showFeaturePanel,
  setShowFeaturePanel,
  featurePanelRef,
  cameraMuted,
  handleToggleCamera,
  screenShare,
  agentActive,
  agentLoading,
  startAgent,
  stopAgent,
  roomRef,
  isWatchMode,
  connected,
  sendData,
  setWatchRequestSent,
  isWhiteboardMode,
  setIsWhiteboardMode,
  isCodeMode,
  openCodeEditor,
  closeCodeEditor,
  isChessMode,
  openChess,
  closeChess,
}: FeaturePanelProps) {
  const { t } = useTranslation("videochat");
  return (
    <div ref={featurePanelRef} style={{ position: 'absolute', top: 12, right: 12, zIndex: 16 }}>
      {/* Toggle button */}
      <button
        onClick={() => setShowFeaturePanel((p: boolean) => !p)}
        style={{
          width: 40, height: 40, borderRadius: "50%",
          border: showFeaturePanel
            ? "1.5px solid rgba(99,102,241,0.6)"
            : "1px solid rgba(255,255,255,0.2)",
          background: showFeaturePanel
            ? "rgba(99,102,241,0.2)"
            : "rgba(0,0,0,0.4)",
          backdropFilter: "blur(12px)", color: "#fff",
          cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center",
          transition: "all 0.3s ease", padding: 0, outline: "none",
        }}
        title={t("features.title")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ width: 20, height: 20, transition: "transform 0.3s ease", transform: showFeaturePanel ? "rotate(90deg)" : "rotate(0deg)" }}>
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="5" r="1" fill="currentColor" />
          <circle cx="12" cy="19" r="1" fill="currentColor" />
        </svg>
      </button>

      {/* Expandable panel */}
      <div style={{
        position: "absolute", top: 48, right: 0, zIndex: 15,
        display: "flex", flexDirection: "column", gap: 8,
        padding: showFeaturePanel ? "10px" : "0px",
        background: showFeaturePanel ? "rgba(0,0,0,0.55)" : "transparent",
        backdropFilter: showFeaturePanel ? "blur(16px)" : "none",
        WebkitBackdropFilter: showFeaturePanel ? "blur(16px)" : "none",
        borderRadius: 20,
        border: showFeaturePanel ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
        opacity: showFeaturePanel ? 1 : 0,
        transform: showFeaturePanel ? "translateY(0) scale(1)" : "translateY(-10px) scale(0.9)",
        pointerEvents: showFeaturePanel ? "auto" : "none",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        maxHeight: showFeaturePanel ? 500 : 0,
        overflow: showFeaturePanel ? "visible" : "hidden",
      }}>
        {/* Camera toggle */}
        <button
          style={{ ...styles.hoverBtn, ...(cameraMuted ? styles.hoverBtnActive : {}) }}
          onClick={() => { handleToggleCamera(); setShowFeaturePanel(false); }}
          title={cameraMuted ? String(t("videochat.turnCameraOn")) : String(t("videochat.turnCameraOff"))}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" style={styles.hoverBtnIcon}>
            {cameraMuted ? (
              <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" stroke="currentColor" strokeWidth="2" fill="none" />
            ) : (
              <path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 8h10a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z" />
            )}
          </svg>
        </button>

        {/* Screen share */}
        <button
          style={{ ...styles.hoverBtn, ...(screenShare.isScreenSharing ? styles.hoverBtnScreenActive : {}) }}
          onClick={() => { screenShare.handleScreenShare(); setShowFeaturePanel(false); }}
          title={screenShare.isScreenSharing ? t("stopScreenShare") : t("shareScreen")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={styles.hoverBtnIcon}>
            {screenShare.isScreenSharing ? (
              <>
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
                <line x1="7" y1="8" x2="17" y2="14" stroke="#ef4444" strokeWidth="2.5" />
                <line x1="17" y1="8" x2="7" y2="14" stroke="#ef4444" strokeWidth="2.5" />
              </>
            ) : (
              <>
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </>
            )}
          </svg>
        </button>

        {/* AI Agent */}
        <button
          style={{
            ...styles.hoverBtn,
            ...(agentActive ? { background: "rgba(16, 185, 129, 0.25)", borderColor: "rgba(16, 185, 129, 0.5)", color: "#34d399" } : {}),
            ...(agentLoading ? { opacity: 0.5, cursor: "wait" } : {}),
          }}
          disabled={agentLoading}
          onClick={() => {
            const roomName = roomRef.current?.name;
            if (!roomName) return;
            if (agentActive) stopAgent(roomName);
            else startAgent(roomName);
            setShowFeaturePanel(false);
          }}
          title={agentActive ? t("features.stopAgent") : t("features.startAgent")}
        >
          <MagicAgentIcon size={20} className={styles.hoverBtnIcon} />
        </button>

        {/* Watch Together */}
        <button
          style={{
            ...styles.hoverBtn,
            ...(!connected ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
            ...(isWatchMode ? { background: "rgba(239,68,68,0.25)", borderColor: "rgba(239,68,68,0.5)", color: "#ef4444" } : {}),
          }}
          disabled={!connected}
          onClick={() => {
            if (!connected) return;
            if (isWatchMode) {
              sendData({ type: "watch-exit-request" });
            } else {
              sendData({ type: "watch-request" });
              setWatchRequestSent(true);
              setTimeout(() => setWatchRequestSent(false), 10000);
            }
            setShowFeaturePanel(false);
          }}
          title={!connected ? t("features.requiresPartner") : (isWatchMode ? t("closeWatch") : t("watchTogether"))}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" style={styles.hoverBtnIcon}>
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z" />
          </svg>
        </button>

        {/* Code Editor */}
        <button
          style={{
            ...styles.hoverBtn,
            ...(!connected ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
            ...(isCodeMode ? { background: "rgba(99,102,241,0.25)", borderColor: "rgba(99,102,241,0.5)", color: "#a5b4fc" } : {}),
          }}
          disabled={!connected}
          onClick={() => {
            if (!connected) return;
            if (isCodeMode) closeCodeEditor();
            else openCodeEditor();
            setShowFeaturePanel(false);
          }}
          title={!connected ? t("features.requiresPartner") : (isCodeMode ? t("features.closeCodeEditor") : t("features.openCodeEditor"))}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={styles.hoverBtnIcon}>
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </button>

        {/* Whiteboard */}
        <button
          style={{
            ...styles.hoverBtn,
            ...(!connected ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
            ...(isWhiteboardMode ? { background: "rgba(59,130,246,0.25)", borderColor: "rgba(59,130,246,0.5)", color: "#60a5fa" } : {}),
          }}
          disabled={!connected}
          onClick={() => {
            if (!connected) return;
            const opening = !isWhiteboardMode;
            setIsWhiteboardMode(opening);
            if (opening) sendData({ type: "wb-open" });
            setShowFeaturePanel(false);
          }}
          title={!connected ? t("features.requiresPartner") : (isWhiteboardMode ? t("features.closeWhiteboard") : t("features.openWhiteboard"))}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={styles.hoverBtnIcon}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" /><path d="M9 3v6" />
          </svg>
        </button>

        {/* Chess */}
        <button
          style={{
            ...styles.hoverBtn,
            ...(!connected ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
            ...(isChessMode ? { background: "rgba(245,158,11,0.25)", borderColor: "rgba(245,158,11,0.5)", color: "#fbbf24" } : {}),
          }}
          disabled={!connected}
          onClick={() => {
            if (!connected) return;
            if (isChessMode) closeChess();
            else openChess();
            setShowFeaturePanel(false);
          }}
          title={!connected ? t("features.requiresPartner") : (isChessMode ? t("features.closeChess") : t("features.openChess"))}
        >
          <span style={{ fontSize: 20, pointerEvents: "none", lineHeight: 1 }}>♟</span>
        </button>

        {/* Avatar (LOCKED) */}
        <LockedFeatureBtn
          styles={{ ...styles, hoverBtn: { ...styles.bottomBtn, ...styles.hoverBtn } }}
          title={t("features.avatarUnderDev")}
          icon={<span style={{ fontSize: 20, pointerEvents: "none", lineHeight: 1 }}>👤</span>}
        />
      </div>
    </div>
  );
});
