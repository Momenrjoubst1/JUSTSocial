/**
 * ════════════════════════════════════════════════════════════════════════════════
 * WatchModeOverlay — "Watch Together" YouTube feature
 *
 * Uses the YouTube iframe postMessage API for playback synchronization.
 * This avoids loading the external YT IFrame API script which can trigger
 * YouTube's bot detection on some browsers.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { styles } from "@/pages/videochat/VideoChatPage.styles";

/* ── YouTube player states ────────────────────────────────────────────── */
const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

import { WatchVideoResult, WatchSyncMessage, WatchModeOverlayProps } from "./types";

export const WatchModeOverlay: React.FC<WatchModeOverlayProps> = ({
  sendData,
  localStream,
  remoteVideoSrcObject,
  onClose,
  externalVideoId = null,
  pageRemoteVideoRef,
  pageLocalVideoRef,
  localCameraMuted = false,
  remoteCameraMuted = false,
  syncMessage = null,
}) => {
  const [watchVideoId, setWatchVideoId] = useState<string | null>(
    externalVideoId || sessionStorage.getItem("vc_watch_id"),
  );

  useEffect(() => {
    if (watchVideoId) sessionStorage.setItem("vc_watch_id", watchVideoId);
  }, [watchVideoId]);
  const [watchSearchQuery, setWatchSearchQuery] = useState("");
  const [watchSearchResults, setWatchSearchResults] = useState<WatchVideoResult[]>([]);
  const [isWatchSearching, setIsWatchSearching] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [embedSource, setEmbedSource] = useState<"inv" | "yt">(
    () => (sessionStorage.getItem("vc_embed_src") as "inv" | "yt") || "inv"
  );

  const watchLocalVideoRef = useRef<HTMLVideoElement>(null);
  const watchRemoteVideoRef = useRef<HTMLVideoElement>(null);

  /* ── YouTube iframe postMessage sync ────────────────────────────────── */
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isSyncActionRef = useRef(false);
  const lastSyncTimeRef = useRef(0);
  const playerReadyRef = useRef(false);
  const currentTimeRef = useRef(0);

  /** Send a command to the YouTube iframe via postMessage */
  const sendYTCommand = useCallback((func: string, args: any[] = []) => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*",
    );
  }, []);

  /** Initialize listening on the iframe */
  useEffect(() => {
    if (!watchVideoId) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com" && event.origin !== "https://www.youtube-nocookie.com") return;

      let data: {
        event: string;
        info?: any; // info can be number or object depending on event
      };
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      // Track current time from info events
      if (data.event === "infoDelivery" && typeof data.info?.currentTime === "number") {
        currentTimeRef.current = data.info.currentTime;
      }

      // Handle state changes
      if (data.event === "onStateChange" || data.event === "initialDelivery") {
        const state = data.info;
        if (typeof state !== "number") return;

        if (isSyncActionRef.current) return;
        const now = Date.now();
        if (now - lastSyncTimeRef.current < 500) return;

        if (state === YT_STATE.PLAYING) {
          sendData({
            type: "watch-sync",
            action: "play",
            time: currentTimeRef.current,
          });
          showSyncStatus("▶ Playing");
        } else if (state === YT_STATE.PAUSED) {
          sendData({
            type: "watch-sync",
            action: "pause",
            time: currentTimeRef.current,
          });
          showSyncStatus("⏸ Paused");
        }
      }

      // Player is ready
      if (data.event === "onReady") {
        playerReadyRef.current = true;
      }
    };

    window.addEventListener("message", handleMessage);

    // Start listening to the iframe once it loads
    const startListening = () => {
      if (!iframeRef.current?.contentWindow) return;
      // Tell YouTube we want to listen for events
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "listening" }),
        "*",
      );
      playerReadyRef.current = true;
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener("load", startListening);
      // Also try immediately in case iframe is already loaded
      setTimeout(startListening, 1000);
    }

    return () => {
      window.removeEventListener("message", handleMessage);
      if (iframe) {
        iframe.removeEventListener("load", startListening);
      }
      playerReadyRef.current = false;
    };
  }, [watchVideoId, sendData]);

  /* ── Handle incoming sync messages from peer ────────────────────────── */
  useEffect(() => {
    if (!syncMessage || !playerReadyRef.current) return;

    isSyncActionRef.current = true;
    lastSyncTimeRef.current = Date.now();

    try {
      if (syncMessage.action === "play") {
        if (typeof syncMessage.time === "number") {
          if (Math.abs(currentTimeRef.current - syncMessage.time) > 2) {
            sendYTCommand("seekTo", [syncMessage.time, true]);
          }
        }
        sendYTCommand("playVideo");
        showSyncStatus("▶ Synced");
      } else if (syncMessage.action === "pause") {
        if (typeof syncMessage.time === "number") {
          sendYTCommand("seekTo", [syncMessage.time, true]);
        }
        sendYTCommand("pauseVideo");
        showSyncStatus("⏸ Synced");
      } else if (syncMessage.action === "seek") {
        if (typeof syncMessage.time === "number") {
          sendYTCommand("seekTo", [syncMessage.time, true]);
        }
        showSyncStatus("⏩ Synced");
      }
    } catch (err) {
      console.warn("Watch sync error:", err);
    }

    setTimeout(() => {
      isSyncActionRef.current = false;
    }, 800);
  }, [syncMessage, sendYTCommand]);

  // Sync external video id (from remote peer)
  useEffect(() => {
    if (externalVideoId) {
      setWatchVideoId(externalVideoId);
      sessionStorage.setItem("vc_watch_id", externalVideoId);
    }
  }, [externalVideoId]);

  /* ── Sync status toast ──────────────────────────────────────────────── */
  const syncStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showSyncStatus = useCallback((msg: string) => {
    setSyncStatus(msg);
    if (syncStatusTimer.current) clearTimeout(syncStatusTimer.current);
    syncStatusTimer.current = setTimeout(() => setSyncStatus(null), 2000);
  }, []);

  // Reactive remote stream
  const [activeRemoteStream, setActiveRemoteStream] = useState<
    MediaStream | MediaSource | null
  >(remoteVideoSrcObject ?? null);

  // Reactive local stream
  const [activeLocalStream, setActiveLocalStream] = useState<
    MediaStream | MediaSource | null
  >(localStream ?? null);

  useEffect(() => {
    if (remoteVideoSrcObject) setActiveRemoteStream(remoteVideoSrcObject);
  }, [remoteVideoSrcObject]);

  useEffect(() => {
    if (localStream) setActiveLocalStream(localStream);
  }, [localStream]);

  // Poll the page-level <video> elements
  useEffect(() => {
    const check = () => {
      if (pageRemoteVideoRef?.current) {
        const rSrc = pageRemoteVideoRef.current.srcObject;
        if (rSrc && rSrc !== activeRemoteStream) {
          setActiveRemoteStream(rSrc as MediaStream | MediaSource);
        }
      }
      if (pageLocalVideoRef?.current) {
        const lSrc = pageLocalVideoRef.current.srcObject;
        if (lSrc && lSrc !== activeLocalStream) {
          setActiveLocalStream(lSrc as MediaStream | MediaSource);
        }
      }
    };
    check();
    const id = setInterval(check, 500);
    return () => clearInterval(id);
  }, [
    pageRemoteVideoRef,
    pageLocalVideoRef,
    activeRemoteStream,
    activeLocalStream,
  ]);

  // Attach streams to video elements
  useEffect(() => {
    if (watchLocalVideoRef.current && activeLocalStream) {
      const el = watchLocalVideoRef.current;
      el.srcObject = activeLocalStream;
      el.play().catch(console.error);
    }
    if (watchRemoteVideoRef.current && activeRemoteStream) {
      const el = watchRemoteVideoRef.current;
      el.srcObject = activeRemoteStream;
      el.play().catch(console.error);
    }
  }, [activeLocalStream, activeRemoteStream]);

  /* ── Search YouTube via Invidious ────────────────────────────────────── */
  const handleWatchSearch = useCallback(async () => {
    if (!watchSearchQuery.trim()) return;
    setIsWatchSearching(true);
    try {
      const res = await fetch(
        `https://vid.puffyan.us/api/v1/search?q=${encodeURIComponent(watchSearchQuery)}&type=video&page=1`,
        { headers: { Accept: "application/json" } },
      );
      if (res.ok) {
        const data = await res.json();
        setWatchSearchResults(
          data.slice(0, 8).map((item: any) => ({
            videoId: item.videoId,
            title: item.title,
            channel: item.author,
            thumbnail:
              item.videoThumbnails?.[4]?.url ||
              item.videoThumbnails?.[0]?.url ||
              "",
            duration: item.lengthSeconds,
          })) as WatchVideoResult[],
        );
      } else {
        const res2 = await fetch(
          `https://inv.nadeko.net/api/v1/search?q=${encodeURIComponent(watchSearchQuery)}&type=video&page=1`,
          { headers: { Accept: "application/json" } },
        );
        if (res2.ok) {
          const data2 = await res2.json();
          setWatchSearchResults(
            data2.slice(0, 8).map((item: any) => ({
              videoId: item.videoId,
              title: item.title,
              channel: item.author,
              thumbnail:
                item.videoThumbnails?.[4]?.url ||
                item.videoThumbnails?.[0]?.url ||
                "",
              duration: item.lengthSeconds,
            })) as WatchVideoResult[],
          );
        }
      }
    } catch (err) {
      console.warn("Watch search error:", err);
    }
    setIsWatchSearching(false);
  }, [watchSearchQuery]);

  /* ── Select video ────────────────────────────────────────────────────── */
  const handleSelectVideo = useCallback(
    (videoId: string) => {
      setWatchVideoId(videoId);
      setWatchSearchResults([]);
      sendData({ type: "watch", action: "watch", videoId });
    },
    [sendData],
  );

  /* ── Submit (URL or search) ──────────────────────────────────────────── */
  const handleWatchSearchSubmit = useCallback(() => {
    const query = watchSearchQuery.trim();
    const urlRegex =
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/([\w-]{11}))/;
    const match = query.match(urlRegex);
    if (match && match[1]) {
      handleSelectVideo(match[1]);
    } else {
      const vMatch = query.match(/[?&]v=([\w-]{11})/);
      if (vMatch) {
        handleSelectVideo(vMatch[1]);
      } else {
        handleWatchSearch();
      }
    }
  }, [watchSearchQuery, handleWatchSearch, handleSelectVideo]);

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div style={styles.watchModeContainer}>
      <button
        style={{
          ...styles.watchCloseBtn,
          width: "auto",
          padding: "0 16px",
          gap: "8px",
          background: "rgba(220, 38, 38, 0.2)",
          color: "#fca5a5",
          borderColor: "rgba(220, 38, 38, 0.3)",
          zIndex: 50,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(220, 38, 38, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(220, 38, 38, 0.2)";
        }}
        onClick={onClose}
        title="Close Watch Mode"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ width: 16, height: 16 }}
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Close Watch Mode</span>
      </button>

      {/* Sync status indicator */}
      {syncStatus && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(59, 130, 246, 0.25)",
            border: "1px solid rgba(59, 130, 246, 0.4)",
            borderRadius: 10,
            padding: "6px 18px",
            zIndex: 50,
            color: "#93c5fd",
            fontSize: 13,
            fontWeight: 600,
            backdropFilter: "blur(8px)",
            transition: "opacity 0.3s ease",
          }}
        >
          {syncStatus}
        </div>
      )}

      <div style={styles.watchScreen}>
        {/* Search bar */}
        <div
          style={{
            ...styles.watchSearchBar,
            position: "relative" as const,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="2"
            style={{ width: 20, height: 20, flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            style={styles.watchSearchInput}
            placeholder="Search YouTube or paste link..."
            value={watchSearchQuery}
            onChange={(e) => setWatchSearchQuery(e.target.value)}
            onKeyPress={(e) =>
              e.key === "Enter" && handleWatchSearchSubmit()
            }
          />
          <button
            style={styles.watchSearchBtn}
            onClick={handleWatchSearchSubmit}
            disabled={isWatchSearching}
          >
            {isWatchSearching ? (
              <div style={styles.loadingDots}>
                <span
                  style={{
                    ...styles.loadingDot,
                    animationDelay: "0s",
                  }}
                />
                <span
                  style={{
                    ...styles.loadingDot,
                    animationDelay: "0.2s",
                  }}
                />
                <span
                  style={{
                    ...styles.loadingDot,
                    animationDelay: "0.4s",
                  }}
                />
              </div>
            ) : (
              <>▶ Search</>
            )}
          </button>

          {/* Search results dropdown */}
          {watchSearchResults.length > 0 && (
            <div style={styles.watchSearchResults}>
              {watchSearchResults.map((result: WatchVideoResult) => (
                <div
                  key={result.videoId}
                  style={styles.watchSearchResultItem}
                  onClick={() => handleSelectVideo(result.videoId)}
                  onMouseEnter={(e) => {
                    (
                      e.currentTarget as HTMLDivElement
                    ).style.background = "rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (
                      e.currentTarget as HTMLDivElement
                    ).style.background = "transparent";
                  }}
                >
                  <img
                    src={result.thumbnail}
                    alt=""
                    style={styles.watchSearchResultThumb}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                  <div style={styles.watchSearchResultInfo}>
                    <p style={styles.watchSearchResultTitle}>
                      {result.title}
                    </p>
                    <p style={styles.watchSearchResultChannel}>
                      {result.channel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Player */}
        <div style={styles.watchIframeContainer}>
          {watchVideoId ? (
            <>
              <iframe
                ref={iframeRef}
                key={`${watchVideoId}-${embedSource}`}
                style={styles.watchIframe}
                src={
                  embedSource === "inv"
                    ? `https://vid.puffyan.us/embed/${watchVideoId}?autoplay=1&quality=dash`
                    : `https://www.youtube-nocookie.com/embed/${watchVideoId}?autoplay=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
                }
                title="YouTube"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              {/* Source switcher */}
              <button
                onClick={() => {
                  const next = embedSource === "inv" ? "yt" : "inv";
                  setEmbedSource(next);
                  sessionStorage.setItem("vc_embed_src", next);
                }}
                style={{
                  position: 'absolute' as const, bottom: 12, right: 12, zIndex: 10,
                  background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                  padding: '4px 10px', fontSize: 11, cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                }}
                title="Switch video player source"
              >
                {embedSource === "inv" ? "Switch to YouTube" : "Switch to Invidious"}
              </button>
            </>
          ) : (
            <div style={styles.watchPlaceholder}>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                style={styles.watchPlaceholderIcon}
              >
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z" />
              </svg>
              <h3 style={styles.watchPlaceholderTitle}>Watch Together</h3>
              <p style={styles.watchPlaceholderSubtitle}>
                Search for a video on YouTube in the search bar above, or
                paste a YouTube link directly
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Camera overlays */}
      <div style={styles.watchCameraOverlayRemote}>
        <video
          ref={watchRemoteVideoRef}
          autoPlay
          playsInline
          style={{
            ...styles.watchCameraVideo,
            ...(remoteCameraMuted ? { opacity: 0 } : {}),
          }}
        />
        {remoteCameraMuted && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 32, height: 32 }}
            >
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L22 7v10" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </div>
        )}
        <span style={{ ...styles.watchCameraLabel, zIndex: 10 }}>
          👤 Partner
        </span>
      </div>

      <div style={styles.watchCameraOverlayLocal}>
        <video
          ref={watchLocalVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            ...styles.watchCameraVideo,
            transform: "scaleX(-1)",
            ...(localCameraMuted ? { opacity: 0 } : {}),
          }}
        />
        {localCameraMuted && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 32, height: 32 }}
            >
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L22 7v10" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </div>
        )}
        <span style={{ ...styles.watchCameraLabel, zIndex: 10 }}>
          📷 You
        </span>
      </div>
    </div>
  );
};
