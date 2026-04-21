import React, { useRef, useEffect } from "react";

interface ChatInputBarProps {
  chatInputOpen: boolean;
  setChatInputOpen: (v: boolean) => void;
  messageInput: string;
  setMessageInput: (v: string) => void;
  handleSendMessage: () => void;
  connected: boolean;
  unreadCount: number;
  setUnreadCount: (v: number) => void;
  notConnectedToast: boolean;
}

export function ChatInputBar({
  chatInputOpen,
  setChatInputOpen,
  messageInput,
  setMessageInput,
  handleSendMessage,
  connected,
  unreadCount,
  setUnreadCount,
  notConnectedToast,
}: ChatInputBarProps) {
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatInputOpen && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [chatInputOpen]);

  return (
    <>
      {/* Not connected toast */}
      {notConnectedToast && (
        <div style={{
          position: "absolute",
          bottom: 60,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 50,
          background: "linear-gradient(135deg, rgba(220, 38, 38, 0.92), rgba(185, 28, 28, 0.95))",
          color: "#fff",
          padding: "10px 24px",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 600,
          boxShadow: "0 4px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.2)",
          backdropFilter: "blur(8px)",
          whiteSpace: "nowrap",
          animation: "fadeInUp 0.25s ease",
          pointerEvents: "none",
          border: "1px solid rgba(255,255,255,0.12)",
        }}>
          ⚠️ No one is connected to the room
        </div>
      )}

      {/* Chat input box */}
      <div style={{
        position: "absolute",
        bottom: 12,
        left: 12,
        right: 12,
        zIndex: 25,
        pointerEvents: chatInputOpen ? "auto" : "none",
        opacity: chatInputOpen ? 1 : 0,
        transform: chatInputOpen ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div className="ai-input" style={{ width: "100%" }}>
          <div className="container">
            <div className="ai-input-container">
              <div className="ai-input-field">
                <input
                  ref={chatInputRef}
                  placeholder={connected ? "Send message" : "Waiting for connection..."}
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setChatInputOpen(false);
                    }
                    if (e.key === "Enter") {
                      e.preventDefault(); // Prevent default behavior (like form submission)
                      if (connected && messageInput.trim()) {
                        handleSendMessage();
                        setChatInputOpen(false);
                      }
                    }
                  }}
                  style={{ cursor: "text", opacity: 1 }}
                  disabled={!connected}
                />
              </div>
                <button
                  id="send-button"
                  aria-label="Send message"
                  title="Send message"
                  onClick={() => {
                    if (!connected || !messageInput.trim()) return;
                    if (typeof navigator !== "undefined" && navigator.vibrate) {
                      navigator.vibrate(50);
                    }
                    handleSendMessage();
                    setChatInputOpen(false);
                  }}
                  disabled={!connected || !messageInput.trim()}
                  style={{ opacity: messageInput.trim() ? 1 : 0.5, cursor: (!connected || !messageInput.trim()) ? "not-allowed" : "pointer" }}
                >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" stroke="currentColor" d="M22 2L11 13" />
                  <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" stroke="currentColor" d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat toggle button */}
      <button
        aria-label={chatInputOpen ? "Close chat box" : "Open chat box"}
        onClick={() => {
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(25);
          setChatInputOpen(!chatInputOpen);
          if (!chatInputOpen) setUnreadCount(0);
        }}
        title={chatInputOpen ? "Close chat" : "Open chat"}
        style={{
          position: "absolute",
          bottom: chatInputOpen ? 64 : 12,
          right: 12,
          zIndex: 26,
          width: 44,
          height: 44,
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.12)",
          background: chatInputOpen ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          color: chatInputOpen ? "#a5b4fc" : "rgba(255,255,255,0.7)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
          padding: 0,
          outline: "none",
        }}
      >
        {/* Unread badge */}
        {!chatInputOpen && unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            background: '#ef4444',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid rgba(0,0,0,0.6)',
            boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
            animation: 'pulse 1.5s infinite',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {chatInputOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>
    </>
  );
}
