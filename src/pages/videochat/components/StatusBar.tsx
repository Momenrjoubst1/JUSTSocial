import React from "react";

interface StatusBarProps {
  styles: Record<string, any>;
  isWatchMode: boolean;
  statusBarVisible: boolean;
  status: string;
  statusMessage: string;
  dotColor: string;
  t: (key: string) => any;
}

export function StatusBar({
  styles,
  isWatchMode,
  statusBarVisible,
  status,
  statusMessage,
  dotColor,
  t,
}: StatusBarProps) {
  return (
    <div style={{
      ...styles.statusBar,
      display: isWatchMode ? "none" : "flex",
      opacity: statusBarVisible ? 1 : 0,
      transform: statusBarVisible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-10px)",
      pointerEvents: statusBarVisible ? "auto" : "none",
      transition: "opacity 0.5s ease, transform 0.5s ease",
    }}>
      <span
        style={{
          ...styles.dot,
          background: dotColor,
          boxShadow: `0 0 8px ${dotColor}`,
        }}
      />
      {status === "looking" || status === "connecting" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={styles.statusText}>{String(t("videochat.lookingForMatch"))}</span>
          <div style={styles.loadingDots}>
            <span style={{ ...styles.loadingDot, animationDelay: "0s" }} />
            <span style={{ ...styles.loadingDot, animationDelay: "0.2s" }} />
            <span style={{ ...styles.loadingDot, animationDelay: "0.4s" }} />
          </div>
        </div>
      ) : (
        <span style={styles.statusText}>{statusMessage}</span>
      )}
    </div>
  );
}
