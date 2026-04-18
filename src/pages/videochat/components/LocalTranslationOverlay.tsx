import React, { memo } from "react";
import type { LocalTranslationLine, TranslationLanguage } from "@/pages/videochat/hooks/useLocalTranslation";
import { styles } from "@/pages/videochat/VideoChatPage.styles";

const LANGUAGE_LABELS: Record<TranslationLanguage, string> = {
  ar: "العربية",
  en: "English",
  es: "Español",
};

interface LocalTranslationOverlayProps {
  isEnabled: boolean;
  isBusy: boolean;
  lines: LocalTranslationLine[];
  errorMessage: string | null;
  onToggle: () => void;
}

const containerStyle: React.CSSProperties = {
  position: "absolute",
  left: 12,
  right: 74,
  bottom: 12,
  zIndex: 35,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  pointerEvents: "none",
};

const bubbleStyle: React.CSSProperties = {
  ...styles.remoteMessageBubble,
  position: "relative",
  left: "auto",
  maxWidth: "100%",
  background: "rgba(0,0,0,0.6)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "#fff",
  padding: "10px 12px",
  borderRadius: 16,
  fontSize: 12,
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
  animation: "ai-msg-slide-in 0.25s ease-out",
  wordBreak: "break-word",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const lineStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "64px 1fr",
  gap: 8,
  alignItems: "start",
};

const languageTagStyle: React.CSSProperties = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "rgba(255,255,255,0.72)",
  fontWeight: 600,
};

const floatingButtonBase: React.CSSProperties = {
  position: "absolute",
  right: 12,
  bottom: 12,
  width: 46,
  height: 46,
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.24)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  zIndex: 40,
  transition: "all 0.2s ease",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

const inactiveButtonStyle: React.CSSProperties = {
  ...floatingButtonBase,
  background: "rgba(90,90,100,0.55)",
  color: "rgba(255,255,255,0.82)",
};

const activeButtonStyle: React.CSSProperties = {
  ...floatingButtonBase,
  background: "linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)",
  border: "1px solid rgba(129,140,248,0.9)",
  color: "#ffffff",
  boxShadow: "0 10px 24px rgba(37,99,235,0.35)",
  animation: "local-translation-pulse 1.8s ease-in-out infinite",
};

const errorStyle: React.CSSProperties = {
  ...bubbleStyle,
  color: "#fecaca",
  borderColor: "rgba(239,68,68,0.5)",
  background: "rgba(61,13,13,0.58)",
};

export const LocalTranslationOverlay = memo(function LocalTranslationOverlay({
  isEnabled,
  isBusy,
  lines,
  errorMessage,
  onToggle,
}: LocalTranslationOverlayProps) {
  const shouldShowTranslations = isEnabled && lines.length > 0;

  return (
    <>
      {(shouldShowTranslations || errorMessage) && (
        <div style={containerStyle}>
          {shouldShowTranslations && lines.map((line) => (
            <div key={line.id} style={bubbleStyle}>
              {line.translations.map((translation) => (
                <div key={`${line.id}-${translation.language}`} style={lineStyle}>
                  <span style={languageTagStyle}>{LANGUAGE_LABELS[translation.language]}</span>
                  <span>{translation.text}</span>
                </div>
              ))}
            </div>
          ))}

          {!isEnabled && errorMessage && <div style={errorStyle}>{errorMessage}</div>}
        </div>
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={isBusy}
        aria-label={isEnabled ? "Disable live translation" : "Enable live translation"}
        title={isEnabled ? "Disable live translation" : "Enable live translation"}
        style={isEnabled ? activeButtonStyle : inactiveButtonStyle}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3.4 12h17.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 3.2c2.7 2.2 4.2 5.3 4.2 8.8s-1.5 6.6-4.2 8.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 3.2C9.3 5.4 7.8 8.5 7.8 12s1.5 6.6 4.2 8.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </>
  );
});
