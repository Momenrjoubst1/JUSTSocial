import React from 'react';
/* ─── Inline styles (no Tailwind dependency needed here) ─────────────────── */
export const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    background: "var(--vc-bg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    overflow: "auto",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: 0,
  },

  backButton: {
    position: "fixed",
    top: 20,
    left: 20,
    zIndex: 1000,
    background: "var(--vc-glass-bg)",
    border: "1px solid var(--vc-glass-border)",
    borderRadius: 10,
    color: "var(--vc-text-secondary)",
    cursor: "pointer",
    padding: "8px 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s ease",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },

  /* Videos Container - Side by Side */
  videosContainer: {
    display: "flex",
    gap: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    background: "rgba(255,255,255,0.06)",
  },

  /* Video Section (contains video + messages + input) */
  videoSection: {
    flex: 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    background: "var(--vc-surface)",
  },

  /* Individual Video Wrapper */
  videoWrapper: {
    flex: 1,
    position: "relative",
    borderRadius: 20,
    overflow: "hidden",
    background: "var(--vc-surface)",
    border: "1px solid var(--vc-panel-border)",
    boxShadow: "0 0 60px rgba(99,102,241,0.1), inset 0 0 30px rgba(99,102,241,0.05)",
    aspectRatio: "auto",
    transition: "all 0.4s ease-in-out",
    pointerEvents: "auto",
  },

  /* Pinned Remote Video Wrapper - when pinned and draggable */
  remoteVideoPinned: {
    position: "fixed",
    borderRadius: 20,
    overflow: "hidden",
    background: "var(--vc-surface)",
    border: "2px solid rgba(0,200,255,0.5)",
    boxShadow: "0 0 80px rgba(0,200,255,0.4), inset 0 0 30px rgba(0,200,255,0.1)",
    width: "45%",
    height: "50%",
    minWidth: "300px",
    minHeight: "250px",
    cursor: "grab",
    transition: "box-shadow 0.3s ease",
    zIndex: 50,
    pointerEvents: "auto",
  },

  remoteVideoPinnedDragging: {
    cursor: "grabbing",
    boxShadow: "0 0 100px rgba(0,200,255,0.6), inset 0 0 40px rgba(0,200,255,0.15), 0 0 30px rgba(0,150,255,0.3)",
  },

  /* Pin Button */
  pinButton: {
    position: "absolute",
    top: 12,
    right: 50,
    zIndex: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(0,200,255,0.15)",
    color: "#00c8ff",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  pinButtonActive: {
    background: "rgba(0,200,255,0.3)",
    borderColor: "rgba(0,200,255,0.5)",
    boxShadow: "0 0 20px rgba(0,200,255,0.3)",
  },

  /* Peer Information Overlay */
  peerInfoOverlay: {
    position: "absolute",
    top: 14,
    left: 14,
    zIndex: 25,
    background: "rgba(0, 0, 0, 0.45)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    padding: "6px 14px 6px 6px",
    borderRadius: 50,
    border: "1px solid var(--vc-panel-border)",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: "auto",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
    pointerEvents: "none",
  },

  peerFlag: {
    fontSize: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
  },

  peerInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  peerUsername: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "0.02em",
    lineHeight: 1.2,
  },

  peerCountry: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 10,
    letterSpacing: "0.01em",
    lineHeight: 1.2,
  },

  /* Message bubbles */
  localMessageBubble: {
    position: "absolute",
    bottom: 70,
    left: 10,
    right: 10,
    background: "rgba(99,102,241,0.2)",
    border: "1px solid rgba(99,102,241,0.5)",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 10,
    fontSize: 13,
    zIndex: 10,
    animation: "slideUp 0.3s ease-out",
  },

  remoteMessagesContainer: {
    position: "absolute",
    bottom: 48,
    left: 20,
    right: 20,
    height: "auto",
    pointerEvents: "none",
    zIndex: 12,
  },

  remoteMessageBubble: {
    position: "absolute",
    left: 0,
    maxWidth: "calc(100% - 40px)",
    background: "var(--vc-surface)",
    border: "1px solid var(--vc-panel-border)",
    color: "#fff",
    padding: "8px 16px 8px 10px",
    borderRadius: 24,
    fontSize: 12,
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    animation: "slideUp 0.3s ease-out",
    wordBreak: "break-word",
    boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    overflow: "visible",
  },

  /* Remote video */
  compactInputWrapper: {
    position: "absolute",
    bottom: 12,
    right: 12,
    left: 12,
    width: "auto",
    zIndex: 25,
  },

  floatingInputWrapper: {
    position: "absolute",
    bottom: 12,
    right: 12,
    left: 12,
    width: "auto",
    zIndex: 25,
  },

  /* Remote video */
  remoteVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    zIndex: 1,
    display: "block",
  },

  /* Local video */
  localVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    zIndex: 1,
    transform: "scaleX(-1)", // Mirror effect - like looking in a mirror
    display: "block",
  },

  /* Video Dark Overlay */
  videoDark: {
    backgroundColor: "#000000",
    filter: "brightness(0)",
  },

  /* Placeholder when no stream */
  videoPaceholder: {
    position: "absolute",
    inset: 0,
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  placeholderInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },

  searchingContainer: {
    position: "relative",
    width: 160,
    height: 160,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  /* (removed old spinning/orbiting styles — now using calm inline styles) */

  waitingText: {
    color: "var(--vc-text-muted)",
    fontSize: 13,
    letterSpacing: "0.08em",
    margin: 0,
    fontWeight: 300,
  },

  /* Hover Controls */
  hoverControls: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 15,
    display: "flex",
    gap: 8,
    padding: "8px 12px",
    background: "var(--vc-glass-bg)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderRadius: 30, // Make container cylindrical
    border: "1px solid var(--vc-glass-border)",
  },

  hoverBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: "50%", // Make buttons circular
    border: "1px solid var(--vc-panel-border)",
    background: "var(--vc-glass-bg)",
    color: "var(--vc-text)",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
  },

  hoverBtnIcon: {
    width: 22,
    height: 22,
  },

  hoverBtnActive: {
    background: "rgba(168,85,247,0.25)",
    borderColor: "rgba(168,85,247,0.5)",
  },

  /* Status bar */
  statusBar: {
    position: "absolute",
    top: 30,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 30,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 20px",
    borderRadius: 100,
    background: "var(--vc-glass-bg)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--vc-glass-border)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    whiteSpace: "nowrap",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
    transition: "background 0.4s, box-shadow 0.4s",
  },
  statusText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    letterSpacing: "0.04em",
    fontWeight: 500,
  },

  loadingDots: {
    display: "flex",
    gap: 4,
    alignItems: "center",
  },

  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    backgroundColor: "rgba(0,198,255,0.8)",
    animation: "pulse 1.4s ease-in-out infinite",
  },

  /* Controls row */
  controls: {
    position: "absolute",
    bottom: 80,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 20,
    display: "flex",
    gap: 16,
  },
  btn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 32px",
    borderRadius: 50,
    border: "1px solid var(--vc-glass-border)",
    background: "var(--vc-glass-bg)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    letterSpacing: "0.03em",
  },
  btnStop: {
    background: "rgba(100,116,139,0.2)",
    borderColor: "rgba(255,255,255,0.15)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },
  btnCamera: {
    background: "rgba(168,85,247,0.18)",
    borderColor: "rgba(168,85,247,0.35)",
    boxShadow: "0 4px 20px rgba(168,85,247,0.15)",
  },
  btnPause: {
    background: "rgba(59,130,246,0.18)",
    borderColor: "rgba(59,130,246,0.35)",
    boxShadow: "0 4px 20px rgba(59,130,246,0.15)",
  },
  btnSkip: {
    background: "linear-gradient(135deg, #007bff 0%, #00d4ff 100%)",
    borderColor: "rgba(0,198,255,0.8)",
    boxShadow: "0 4px 15px rgba(0, 123, 255, 0.4), 0 0 30px rgba(0,198,255,0.3)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    fontWeight: 700,
  },
  btnIcon: {
    width: 18,
    height: 18,
  },

  btnSmall: {
    padding: "8px 8px",
    borderRadius: 10,
  },

  btnSmallIcon: {
    width: 20,
    height: 20,
  },

  /* Camera error overlay */
  errorOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--vc-overlay-bg)",
    backdropFilter: "blur(8px)",
  },
  errorCard: {
    background: "var(--vc-panel-bg)",
    border: "1px solid var(--vc-panel-border)",
    borderRadius: 24,
    padding: "48px 40px",
    maxWidth: 400,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
  },
  errorIcon: { fontSize: 48 },
  errorTitle: {
    margin: 0,
    color: "var(--vc-text)",
    fontSize: 22,
    fontWeight: 700,
  },
  errorDesc: {
    margin: 0,
    color: "var(--vc-text-muted)",
    fontSize: 14,
    lineHeight: 1.6,
  },
  errorBtn: {
    marginTop: 8,
    padding: "10px 28px",
    borderRadius: 10,
    border: "1px solid var(--vc-panel-border)",
    background: "var(--vc-glass-bg)",
    color: "var(--vc-text)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },

  /* Chat Panel */
  chatPanel: {
    position: "absolute",
    bottom: 130,
    left: "50%",
    transform: "translateX(-50%)",
    width: 380,
    maxWidth: "90%",
    height: 420,
    background: "var(--vc-panel-bg)",
    border: "1px solid var(--vc-panel-border)",
    borderRadius: 20,
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 12px 48px rgba(0,0,0,0.4)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    overflow: "hidden",
    zIndex: 18,
  },

  chatHeader: {
    padding: "14px 18px",
    borderBottom: "1px solid var(--vc-panel-border)",
    background: "var(--vc-glass-bg)",
  },

  chatTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "var(--vc-text)",
    letterSpacing: "0.02em",
  },

  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "14px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  noMessages: {
    textAlign: "center",
    color: "var(--vc-text-muted)",
    fontSize: 13,
    margin: "auto",
  },

  messageBubble: {
    padding: "10px 14px",
    borderRadius: 12,
    maxWidth: "85%",
    wordBreak: "break-word",
  },

  messageBubbleLocal: {
    background: "rgba(99,102,241,0.35)",
    border: "1px solid rgba(99,102,241,0.5)",
    alignSelf: "flex-end",
  },

  messageBubbleRemote: {
    background: "rgba(168,85,247,0.25)",
    border: "1px solid rgba(168,85,247,0.4)",
    alignSelf: "flex-start",
  },

  messageText: {
    margin: 0,
    color: "var(--vc-text)",
    fontSize: 13,
    lineHeight: 1.4,
  },

  messageTime: {
    fontSize: 11,
    color: "var(--vc-text-muted)",
    marginTop: 4,
    display: "block",
  },

  messageInputContainer: {
    padding: "12px",
    borderTop: "1px solid var(--vc-panel-border)",
    display: "flex",
    gap: 8,
    background: "var(--vc-input-bg)",
  },

  messageInput: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid var(--vc-input-border)",
    background: "var(--vc-surface)",
    color: "var(--vc-text)",
    fontSize: 13,
    outline: "none",
    transition: "background 0.2s, border-color 0.2s",
    cursor: "text",
  } as React.CSSProperties,

  sendBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(99,102,241,0.4)",
    background: "rgba(99,102,241,0.25)",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s, border-color 0.2s",
  },

  /* ── Local notification container (matches remote) ── */
  localNotificationsContainer: {
    position: "absolute",
    bottom: 48,
    left: 20,
    right: 20,
    height: "auto",
    pointerEvents: "none",
    zIndex: 14,
  },

  iosNotification: {
    position: "absolute",
    left: 0,
    right: 0,
    background: "rgba(30, 30, 40, 0.72)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    borderRadius: 50,
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "10px 18px",
    boxShadow:
      "0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
    pointerEvents: "none",
  },

  iosNotifHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  iosNotifAppRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },

  iosNotifIcon: {
    fontSize: 14,
    lineHeight: 1,
  },

  iosNotifAppName: {
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: "0.02em",
    textTransform: "uppercase" as const,
  },

  iosNotifTime: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
  },

  iosNotifBody: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
  },

  iosNotifTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    color: "rgba(255,255,255,0.9)",
  },

  iosNotifText: {
    margin: 0,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 1.4,
    wordBreak: "break-word" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
  },

  iosNotifAvatar: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    objectFit: "cover" as const,
  },

  /* ── Chat history button ── */
  chatHistoryBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "1px solid var(--vc-glass-border)",
    background: "var(--vc-glass-bg)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    color: "rgba(255,255,255,0.85)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
  },

  chatBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    background: "#6366f1",
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 4px",
    boxShadow: "0 2px 8px rgba(99,102,241,0.5)",
  },

  /* ── Chat history panel ── */
  chatHistoryPanel: {
    position: "absolute",
    top: 60,
    right: 14,
    bottom: "40%",
    width: 300,
    maxWidth: "calc(100% - 28px)",
    zIndex: 18,
    display: "flex",
    flexDirection: "column" as const,
    background: "rgba(20, 20, 28, 0.92)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
    overflow: "hidden",
    animation: "slideUp 0.3s ease-out",
  },

  chatHistoryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 14px",
    borderBottom: "1px solid var(--vc-panel-border)",
    background: "var(--vc-glass-bg)",
    flexShrink: 0,
  },

  chatHistoryClose: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1px solid var(--vc-panel-border)",
    background: "var(--vc-glass-bg)",
    color: "var(--vc-text-secondary)",
    fontSize: 14,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
  },

  chatHistoryMessages: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "10px 10px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },

  chatHistoryMsg: {
    display: "flex",
    flexDirection: "column" as const,
    padding: "8px 14px",
    borderRadius: 20,
    border: "none",
    maxWidth: "80%",
    wordBreak: "break-word" as const,
  },

  /* ── Screen Sharing Button (bottom controls) ── */
  btnScreenShare: {
    background: "rgba(34,197,94,0.18)",
    borderColor: "rgba(34,197,94,0.35)",
    boxShadow: "0 4px 20px rgba(34,197,94,0.15)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  },

  btnScreenShareActive: {
    background: "rgba(239,68,68,0.22)",
    borderColor: "rgba(239,68,68,0.5)",
    boxShadow: "0 4px 20px rgba(239,68,68,0.25), 0 0 30px rgba(239,68,68,0.15)",
    animation: "pulse 2s ease-in-out infinite",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  },

  /* ── Screen Share hover button active state ── */
  hoverBtnScreenActive: {
    background: "rgba(239,68,68,0.25)",
    borderColor: "rgba(239,68,68,0.5)",
    color: "#ef4444",
  },

  /* ── Screen Sharing Indicator (shown on local video) ── */
  screenShareIndicator: {
    position: "absolute" as const,
    bottom: 16,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 18px",
    borderRadius: 100,
    background: "rgba(239, 68, 68, 0.15)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    boxShadow: "0 4px 20px rgba(239, 68, 68, 0.2)",
    animation: "slideUp 0.3s ease-out",
  },

  screenShareDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#ef4444",
    boxShadow: "0 0 8px #ef4444",
    animation: "pulse 1.5s ease-in-out infinite",
  },

  screenShareText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.04em",
  },

  /* ══════════════════════════════════════════════════════════════════════
   * Watch Mode — Co-watching YouTube together
   * ══════════════════════════════════════════════════════════════════════ */

  /* Main watch mode layout container */
  watchModeContainer: {
    position: "absolute" as const,
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    background: "var(--vc-bg)",
    animation: "fadeIn 0.4s ease-out",
  },

  /* The large YouTube screen area */
  watchScreen: {
    position: "relative" as const,
    width: "75%",
    height: "80%",
    background: "var(--vc-panel-bg)",
    borderRadius: 20,
    border: "1px solid var(--vc-panel-border)",
    boxShadow: "0 0 80px rgba(139, 92, 246, 0.08), 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },

  /* YouTube search bar area */
  watchSearchBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    background: "var(--vc-glass-bg)",
    borderBottom: "1px solid var(--vc-panel-border)",
    flexShrink: 0,
  },

  watchSearchInput: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: 12,
    border: "1px solid var(--vc-input-border)",
    background: "var(--vc-input-bg)",
    color: "var(--vc-text)",
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.2s, background 0.2s",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  } as React.CSSProperties,

  watchSearchBtn: {
    padding: "10px 20px",
    borderRadius: 12,
    border: "1px solid rgba(239, 68, 68, 0.35)",
    background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.25) 100%)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "all 0.2s ease",
    flexShrink: 0,
  },

  /* YouTube iframe container */
  watchIframeContainer: {
    flex: 1,
    position: "relative" as const,
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  watchIframe: {
    width: "100%",
    height: "100%",
    border: "none",
  },

  /* Placeholder when no video is loaded */
  watchPlaceholder: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    color: "var(--vc-text-muted)",
    textAlign: "center" as const,
    padding: 40,
  },

  watchPlaceholderIcon: {
    width: 80,
    height: 80,
    opacity: 0.3,
    color: "var(--vc-text-muted)",
  },

  watchPlaceholderTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "var(--vc-text-secondary)",
    margin: 0,
  },

  watchPlaceholderSubtitle: {
    fontSize: 14,
    color: "var(--vc-text-muted)",
    margin: 0,
    maxWidth: 300,
    lineHeight: 1.5,
  },

  /* Small camera overlays in watch mode */
  watchCameraOverlayLocal: {
    position: "absolute" as const,
    bottom: 20,
    right: 20,
    width: 180,
    height: 135,
    borderRadius: 14,
    overflow: "hidden",
    border: "2px solid rgba(99, 102, 241, 0.4)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.15)",
    zIndex: 35,
    background: "var(--vc-surface)",
    transition: "all 0.3s ease",
  },

  watchCameraOverlayRemote: {
    position: "absolute" as const,
    top: 20,
    left: 20,
    width: 180,
    height: 135,
    borderRadius: 14,
    overflow: "hidden",
    border: "2px solid rgba(168, 85, 247, 0.4)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(168, 85, 247, 0.15)",
    zIndex: 35,
    background: "var(--vc-surface)",
    transition: "all 0.3s ease",
  },

  watchCameraVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    display: "block",
  },

  watchCameraLabel: {
    position: "absolute" as const,
    bottom: 6,
    left: 8,
    fontSize: 10,
    fontWeight: 600,
    color: "rgba(255, 255, 255, 0.8)",
    background: "rgba(0, 0, 0, 0.5)",
    padding: "3px 8px",
    borderRadius: 6,
    backdropFilter: "blur(8px)",
    letterSpacing: "0.04em",
  },

  /* Close/Exit watch mode button */
  watchCloseBtn: {
    position: "absolute" as const,
    top: 20,
    right: 20,
    zIndex: 40,
    width: 40,
    height: 40,
    borderRadius: 12,
    border: "1px solid var(--vc-panel-border)",
    background: "var(--vc-glass-bg)",
    backdropFilter: "blur(12px)",
    color: "var(--vc-text-secondary)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    fontSize: 18,
  },

  /* Watch button in controls row */
  btnWatch: {
    background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.22) 100%)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    boxShadow: "0 4px 20px rgba(239, 68, 68, 0.15)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  },

  btnWatchActive: {
    background: "linear-gradient(135deg, rgba(239, 68, 68, 0.35) 0%, rgba(185, 28, 28, 0.4) 100%)",
    borderColor: "rgba(239, 68, 68, 0.6)",
    boxShadow: "0 4px 20px rgba(239, 68, 68, 0.3), 0 0 30px rgba(239, 68, 68, 0.15)",
  },

  /* YouTube search results dropdown */
  watchSearchResults: {
    position: "absolute" as const,
    top: "100%",
    left: 0,
    right: 0,
    maxHeight: 320,
    overflowY: "auto" as const,
    background: "var(--vc-panel-bg)",
    borderRadius: "0 0 16px 16px",
    border: "1px solid var(--vc-panel-border)",
    borderTop: "none",
    boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
    zIndex: 50,
    backdropFilter: "blur(20px)",
  },

  watchSearchResultItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 16px",
    cursor: "pointer",
    transition: "background 0.15s ease",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },

  watchSearchResultThumb: {
    width: 120,
    height: 68,
    borderRadius: 8,
    objectFit: "cover" as const,
    flexShrink: 0,
    background: "rgba(255,255,255,0.05)",
  },

  watchSearchResultInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    overflow: "hidden",
  },

  watchSearchResultTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--vc-text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    lineHeight: 1.3,
    margin: 0,
  },

  watchSearchResultChannel: {
    fontSize: 11,
    color: "var(--vc-text-muted)",
    margin: 0,
  },

  /* ══════════════════════════════════════════════════════════════════════
   * Whiteboard Mode — Collaborative drawing
   * ══════════════════════════════════════════════════════════════════════ */

  whiteboardContainer: {
    position: "absolute" as const,
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    background: "var(--vc-bg)",
    animation: "fadeIn 0.4s ease-out",
  },

  whiteboardScreen: {
    position: "relative" as const,
    width: "75%",
    height: "80%",
    background: "var(--vc-panel-bg)",
    borderRadius: 20,
    border: "1px solid var(--vc-panel-border)",
    boxShadow: "0 0 80px rgba(59, 130, 246, 0.08), 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },

  /* Toolbar */
  whiteboardToolbar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    background: "var(--vc-glass-bg)",
    borderBottom: "1px solid var(--vc-panel-border)",
    flexShrink: 0,
    flexWrap: "wrap" as const,
  },

  whiteboardToolGroup: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 6px",
    borderRadius: 10,
    background: "var(--vc-input-bg)",
    border: "1px solid var(--vc-panel-border)",
  },

  whiteboardToolBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: "1px solid var(--vc-input-border)",
    background: "var(--vc-input-bg)",
    color: "var(--vc-text-secondary)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
    fontSize: 14,
    padding: 0,
  },

  whiteboardToolBtnActive: {
    background: "rgba(59, 130, 246, 0.25)",
    borderColor: "rgba(59, 130, 246, 0.5)",
    color: "#60a5fa",
    boxShadow: "0 0 12px rgba(59, 130, 246, 0.2)",
  },

  whiteboardColorBtn: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    border: "2px solid rgba(255, 255, 255, 0.15)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    padding: 0,
    flexShrink: 0,
  },

  whiteboardColorBtnActive: {
    borderColor: "#fff",
    transform: "scale(1.2)",
    boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
  },

  whiteboardSizeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: "1px solid var(--vc-input-border)",
    background: "var(--vc-input-bg)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
    padding: 0,
  },

  whiteboardSizeBtnActive: {
    background: "rgba(59, 130, 246, 0.2)",
    borderColor: "rgba(59, 130, 246, 0.4)",
  },

  whiteboardDivider: {
    width: 1,
    height: 28,
    background: "var(--vc-panel-border)",
    margin: "0 4px",
    flexShrink: 0,
  },

  whiteboardActionBtn: {
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid var(--vc-input-border)",
    background: "var(--vc-input-bg)",
    color: "var(--vc-text-secondary)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    fontWeight: 500,
    transition: "all 0.15s ease",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },

  /* Canvas area */
  whiteboardCanvasContainer: {
    flex: 1,
    position: "relative" as const,
    background: "#ffffff",
    cursor: "crosshair",
    overflowY: "auto" as const,
    overflowX: "hidden" as const,
  },

  whiteboardCanvas: {
    display: "block",
    width: "100%",
    minHeight: "3000px",
    touchAction: "none" as const,
  },

  /* Close whiteboard button */
  whiteboardCloseBtn: {
    position: "absolute" as const,
    top: 20,
    right: 20,
    zIndex: 40,
    width: 40,
    height: 40,
    borderRadius: 12,
    border: "1px solid var(--vc-panel-border)",
    background: "var(--vc-glass-bg)",
    backdropFilter: "blur(12px)",
    color: "var(--vc-text-secondary)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    fontSize: 18,
  },

  /* Camera overlays for whiteboard (reuses watch positions) */
  wbCameraOverlayLocal: {
    position: "absolute" as const,
    bottom: 20,
    right: 20,
    width: 160,
    height: 120,
    borderRadius: 14,
    overflow: "hidden",
    border: "2px solid rgba(59, 130, 246, 0.4)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.15)",
    zIndex: 35,
    background: "var(--vc-surface)",
    transition: "all 0.3s ease",
  },

  wbCameraOverlayRemote: {
    position: "absolute" as const,
    top: 20,
    left: 20,
    width: 160,
    height: 120,
    borderRadius: 14,
    overflow: "hidden",
    border: "2px solid rgba(168, 85, 247, 0.4)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(168, 85, 247, 0.15)",
    zIndex: 35,
    background: "var(--vc-surface)",
    transition: "all 0.3s ease",
  },

  /* ══════════════════════════════════════════════════════════════════════
   * Code Editor Mode — Collaborative coding
   * ══════════════════════════════════════════════════════════════════════ */

  codeContainer: {
    position: "absolute" as const,
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    background: "var(--vc-bg)",
    animation: "fadeIn 0.4s ease-out",
  },

  codeScreen: {
    position: "relative" as const,
    width: "85%",
    height: "85%",
    background: "var(--vc-code-bg)",
    borderRadius: 20,
    border: "1px solid var(--vc-panel-border)",
    boxShadow: "0 0 100px rgba(0, 0, 0, 0.6), 0 20px 60px rgba(0, 0, 0, 0.5)",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },

  codeToolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 20px",
    background: "var(--vc-code-toolbar)",
    borderBottom: "1px solid var(--vc-panel-border)",
    flexShrink: 0,
  },

  codeToolbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 15,
  },

  codeTitle: {
    color: "var(--vc-text-secondary)",
    fontSize: 13,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  codeSelect: {
    background: "var(--vc-input-bg)",
    border: "1px solid var(--vc-input-border)",
    color: "var(--vc-text)",
    borderRadius: 4,
    padding: "4px 8px",
    fontSize: 12,
    outline: "none",
    cursor: "pointer",
  },

  codeEditorWrapper: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  codeCloseBtn: {
    position: "absolute" as const,
    top: 20,
    right: 20,
    zIndex: 40,
    width: 40,
    height: 40,
    borderRadius: 12,
    border: "1px solid var(--vc-panel-border)",
    background: "var(--vc-glass-bg)",
    backdropFilter: "blur(12px)",
    color: "var(--vc-text-secondary)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    fontSize: 18,
  },

  codeCameraOverlayLocal: {
    position: "absolute" as const,
    bottom: 20,
    right: 20,
    width: 140,
    height: 105,
    borderRadius: 12,
    overflow: "hidden",
    border: "2px solid rgba(59, 130, 246, 0.3)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
    zIndex: 35,
    background: "var(--vc-surface)",
  },

  codeCameraOverlayRemote: {
    position: "absolute" as const,
    top: 20,
    left: 20,
    width: 140,
    height: 105,
    borderRadius: 12,
    overflow: "hidden",
    border: "2px solid rgba(168, 85, 247, 0.3)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
    zIndex: 35,
    background: "var(--vc-surface)",
  },

  codeCameraOverlayRemotePinned: {
    position: "fixed" as const,
    width: 140,
    height: 105,
    borderRadius: 12,
    overflow: "hidden",
    border: "2px solid rgba(0,200,255,0.5)",
    boxShadow: "0 0 80px rgba(0,200,255,0.4), inset 0 0 30px rgba(0,200,255,0.1)",
    zIndex: 40,
    background: "var(--vc-surface)",
    cursor: "grab",
    transition: "box-shadow 0.3s ease",
    pointerEvents: "auto" as const,
  },

  codeCameraOverlayRemoteDragging: {
    cursor: "grabbing",
    boxShadow: "0 0 100px rgba(0,200,255,0.6), inset 0 0 40px rgba(0,200,255,0.15), 0 0 30px rgba(0,150,255,0.3)",
  },


};

