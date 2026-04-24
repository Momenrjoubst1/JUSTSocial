import React, { useState } from "react";
import { useTranslation } from "react-i18next";

interface BottomControlsProps {
  styles: Record<string, any>;
  isWatchMode: boolean;
  isSearching: boolean;
  handleToggleSearch: () => void;
  handleSkip: () => void;
}

export function BottomControls({
  styles,
  isWatchMode,
  isSearching,
  handleToggleSearch,
  handleSkip,
}: BottomControlsProps) {
  const { t } = useTranslation("videochat");
  const [isResumeHovered, setIsResumeHovered] = useState(false);
  const [isSkipHovered, setIsSkipHovered] = useState(false);

  return (
    <div style={{ ...styles.controls, display: isWatchMode ? "none" : "flex" }}>
      <button
        style={{
          ...styles.btn,
          ...styles.btnStop,
          transform: isResumeHovered ? "translateY(-2px)" : "translateY(0)",
          boxShadow: isResumeHovered
            ? "0 6px 12px rgba(0,0,0,0.25)"
            : "0 2px 8px rgba(0,0,0,0.15)",
        }}
        onClick={handleToggleSearch}
        onMouseEnter={() => setIsResumeHovered(true)}
        onMouseLeave={() => setIsResumeHovered(false)}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" style={styles.btnIcon}>
          <path d="M6 6h12v12H6z" />
        </svg>
        {isSearching ? t("controls.stop") : t("controls.resume")}
      </button>

      <button
        style={{
          ...styles.btn,
          ...styles.btnSkip,
          transform: isSkipHovered ? "scale(1.05)" : "scale(1)",
          boxShadow: isSkipHovered
            ? "0 8px 20px rgba(0, 123, 255, 0.6), 0 0 40px rgba(0,198,255,0.5)"
            : "0 4px 15px rgba(0, 123, 255, 0.4), 0 0 30px rgba(0,198,255,0.3)",
        }}
        onMouseEnter={() => setIsSkipHovered(true)}
        onMouseLeave={() => setIsSkipHovered(false)}
        onClick={handleSkip}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" style={styles.btnIcon}>
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </svg>
        {t("controls.next")}
      </button>
    </div>
  );
}
