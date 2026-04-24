import React from "react";
import { useTranslation } from "react-i18next";

interface ControlBarProps {
  styles: Record<string, React.CSSProperties>;
  isWatchMode: boolean;
  cameraMuted: boolean;
  audioMuted: boolean;
  onToggleCamera: () => void;
  onToggleAudio: () => void;
  onNext: () => void;
  onEnd: () => void;
  isSearching: boolean;
}

export function ControlBar({
  styles,
  isWatchMode,
  cameraMuted,
  audioMuted,
  onToggleCamera,
  onToggleAudio,
  onNext,
  onEnd,
  isSearching,
}: ControlBarProps) {
  const { t } = useTranslation("videochat");
  if (isWatchMode) {
    return null;
  }

  return (
    <div style={styles.controls}>
      <button
        style={{ ...styles.btn, ...styles.btnStop, display: "flex", gap: "8px", alignItems: "center" }}
        onClick={onToggleAudio}
        title={audioMuted ? t("controls.turnMicOn") : t("controls.turnMicOff")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {audioMuted ? (
            <>
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </>
          ) : (
            <>
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </>
          )}
        </svg>
        {audioMuted ? t("controls.unmuteMic") : t("controls.muteMic")}
      </button>
      <button
        style={{ ...styles.btn, ...styles.btnStop, display: "flex", gap: "8px", alignItems: "center" }}
        onClick={onToggleCamera}
        title={cameraMuted ? t("turnCameraOn") : t("turnCameraOff")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {cameraMuted ? (
            <>
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M21 17.16V5a2 2 0 0 0-2-2H7.73"></path>
              <path d="M3.27 3.27A2 2 0 0 0 3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 1.73-.73"></path>
            </>
          ) : (
            <>
              <path d="M23 7l-7 5 7 5V7z"></path>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </>
          )}
        </svg>
        {cameraMuted ? t("controls.unmuteCam") : t("controls.muteCam")}
      </button>
      <button style={{ ...styles.btn, ...styles.btnSkip }} onClick={onNext}>
        {t("controls.next")}
      </button>
      <button style={{ ...styles.btn, ...styles.btnStop, background: "rgba(220, 38, 38, 0.2)", color: "#fca5a5" }} onClick={onEnd}>
        {isSearching ? t("controls.stopSearching") : t("controls.startSearching")}
      </button>
    </div>
  );
}
