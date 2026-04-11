import React from "react";

interface ControlBarProps {
  styles: Record<string, React.CSSProperties>;
  isWatchMode: boolean;
  cameraMuted: boolean;
  onToggleCamera: () => void;
  onNext: () => void;
  onEnd: () => void;
}

export function ControlBar({
  styles,
  isWatchMode,
  cameraMuted,
  onToggleCamera,
  onNext,
  onEnd,
}: ControlBarProps) {
  if (isWatchMode) {
    return null;
  }

  return (
    <div style={styles.controls}>
      <button
        style={{ ...styles.btn, ...styles.btnStop }}
        onClick={onToggleCamera}
        title={cameraMuted ? "Turn camera on" : "Turn camera off"}
      >
        {cameraMuted ? "Unmute Cam" : "Mute Cam"}
      </button>
      <button style={{ ...styles.btn, ...styles.btnSkip }} onClick={onNext}>
        Next
      </button>
      <button style={{ ...styles.btn, ...styles.btnStop }} onClick={onEnd}>
        End
      </button>
    </div>
  );
}
