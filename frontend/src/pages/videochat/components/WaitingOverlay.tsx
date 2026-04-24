import React from "react";
import { useTranslation } from "react-i18next";

interface WaitingOverlayProps {
  isSearching: boolean;
  statusMessage: string;
  status: string;
  reconnectAttempt?: number;
  maxAttempts?: number;
  styles: Record<string, any>;
}

export function WaitingOverlay({ isSearching, statusMessage, status, reconnectAttempt, maxAttempts, styles }: WaitingOverlayProps) {
  const { t } = useTranslation("videochat");
  if (status === 'reconnecting') {
    return (
      <div style={styles.videoPaceholder}>
        <div style={{ ...styles.placeholderInner, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(99, 102, 241, 0.3)', borderTopColor: 'rgba(99, 102, 241, 1)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ color: 'white', marginTop: 16, fontSize: 16, fontWeight: 500 }}>
            {t("reconnecting", { attempt: reconnectAttempt, max: maxAttempts })}
          </p>
          <p style={{ color: 'var(--vc-text-muted)', fontSize: 13, marginTop: -8 }}>
            {t("dontClosePage")}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div style={styles.videoPaceholder}>
      <div style={styles.placeholderInner}>
        {isSearching ? (
          <>
            <div style={styles.searchingContainer}>
              <div style={{
                position: 'absolute',
                width: 100,
                height: 100,
                borderRadius: '50%',
                border: '1.5px solid rgba(99, 102, 241, 0.3)',
                animation: 'calmBreathe 3s ease-in-out infinite',
              }} />
              <div style={{
                position: 'absolute',
                width: 100,
                height: 100,
                borderRadius: '50%',
                border: '1px solid rgba(99, 102, 241, 0.15)',
                animation: 'calmBreathe 3s ease-in-out 1s infinite',
              }} />

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255, 255, 255, 0.6)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  width: 40,
                  height: 40,
                  position: 'absolute',
                  zIndex: 10,
                  animation: 'calmFade 3s ease-in-out infinite',
                }}
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>

              <div style={{
                position: 'absolute',
                bottom: 20,
                display: 'flex',
                gap: 6,
              }}>
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.5)',
                  animation: 'dotPulse 1.4s ease-in-out infinite',
                }} />
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.5)',
                  animation: 'dotPulse 1.4s ease-in-out 0.2s infinite',
                }} />
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.5)',
                  animation: 'dotPulse 1.4s ease-in-out 0.4s infinite',
                }} />
              </div>
            </div>

            <p style={styles.waitingText}>{statusMessage}</p>
          </>
        ) : (
          <>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(99,102,241,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(99,102,241,0.2)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(99,102,241,0.6)"
                strokeWidth="1.5"
                style={{ width: 36, height: 36 }}
              >
                <rect x="6" y="4" width="4" height="16" rx="1" fill="rgba(99,102,241,0.4)" stroke="none" />
                <rect x="14" y="4" width="4" height="16" rx="1" fill="rgba(99,102,241,0.4)" stroke="none" />
              </svg>
            </div>
            <p style={{
              ...styles.waitingText,
              color: "var(--vc-text-muted)",
              fontSize: 14,
              fontWeight: 500,
            }}>
              {t("searchPaused")}
            </p>
            <p style={{
              color: "var(--vc-text-muted)",
              fontSize: 11,
              margin: 0,
              marginTop: -8,
            }}>
              {t("pressResume")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
