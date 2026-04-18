/**
 * ════════════════════════════════════════════════════════════════════════════════
 * useVideoSession — Core video session hook (production-grade)
 *
 * Manages:
 *  - LiveKit Room lifecycle (connect, disconnect, reconnect)
 *  - Local camera/audio track acquisition & publishing
 *  - Remote track subscription
 *  - Skip / Next / Stop controls
 *  - Camera mute toggle
 *  - Search pause/resume
 *
 * Handles React StrictMode double-mount, concurrent joinRoom races,
 * camera survival across reconnects, and clean event-listener teardown.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  Participant,
  Track,
  TrackPublication,
  ConnectionState,
  ConnectionQuality,
  DisconnectReason,
} from "livekit-client";
import { supabase } from '@/lib/supabaseClient';
import { Status, CONFIG, ReconnectionState, INITIAL_RECONNECTION_STATE } from "@/pages/videochat/core/types";

async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

    const res = await fetch(CONFIG.ICE_SERVERS_API_URL, { headers });
    if (!res.ok) throw new Error('Failed to fetch ICE servers');
    const data = await res.json() as { iceServers: RTCIceServer[] };
    return data.iceServers;
  } catch {
    // Fallback to basic STUN
    return [{ urls: 'stun:stun.l.google.com:19302' }];
  }
}

/* ─── Hook Options ──────────────────────────────────────────────────────── */
export interface VideoSessionParticipant {
  identity: string;
}

export interface VideoSessionMatch {
  token: string;
  roomName: string;
  url: string;
}

export interface UseVideoSessionOptions {
  onExit: () => void;
  onDataReceived?: (parsed: unknown, participant: VideoSessionParticipant) => void;
  requestMatch: () => Promise<VideoSessionMatch | null>;
  readyToConnect?: boolean;
  aiActive?: boolean; // Controls whether to mute local audio to the remote human peer
}

/* ─── Hook Return ───────────────────────────────────────────────────────── */
export interface UseVideoSessionReturn {
  status: Status;
  statusMessage: string;
  connected: boolean;
  cameraMuted: boolean;
  audioMuted: boolean;
  remoteCameraMuted: boolean;
  isSearching: boolean;
  connectionQuality: 'poor' | 'good';
  remotePeerIdentity: string | null;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  roomRef: React.MutableRefObject<Room | null>;
  sendData: (data: object) => void;
  handleSkip: () => void;
  handleToggleCamera: () => void;
  handleToggleAudio: () => void;
  handleToggleSearch: () => void;
  handleExit: () => void;
  retryCamera: () => Promise<void>;
  audioEls: React.MutableRefObject<HTMLElement[]>;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export function useVideoSession({
  onExit,
  onDataReceived,
  requestMatch,
  readyToConnect = true,
  aiActive = false,
}: UseVideoSessionOptions): UseVideoSessionReturn {

  const { t } = useLanguage();

  /* ── State ──────────────────────────────────────────────────────────── */
  const [status, setStatus] = useState<Status>("init");
  const [statusMessage, setStatusMessage] = useState(String(t("videochat.status.initializing")));
  const [connected, setConnected] = useState(false);
  const [cameraMuted, setCameraMutedRaw] = useState(() => localStorage.getItem('vc_camera_off') === '1');
  const setCameraMuted = useCallback((v: boolean) => {
    setCameraMutedRaw(v);
    localStorage.setItem('vc_camera_off', v ? '1' : '0');
  }, []);
  const cameraMutedRef = useRef(cameraMuted);
  cameraMutedRef.current = cameraMuted;

  const [audioMuted, setAudioMutedRaw] = useState(() => localStorage.getItem('vc_mic_off') === '1');
  const setAudioMuted = useCallback((v: boolean) => {
    setAudioMutedRaw(v);
    localStorage.setItem('vc_mic_off', v ? '1' : '0');
  }, []);

  const [remoteCameraMuted, setRemoteCameraMuted] = useState(false);
  const [isSearching, setIsSearching] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<'poor' | 'good'>('good');
  const [remotePeerIdentity, setRemotePeerIdentity] = useState<string | null>(null);
  
  const currentVolumeRef = useRef<number>(0.5); // Default 50%

  /* ── Refs ───────────────────────────────────────────────────────────── */
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const roomRef = useRef<Room | null>(null);
  const remotePeerRef = useRef<RemoteParticipant | null>(null);
  const currentRoomName = useRef<string | null>(null);
  const reconnectionRef = useRef<ReconnectionState>(INITIAL_RECONNECTION_STATE);

  const isSkippingRef = useRef(false);
  const isSearchingRef = useRef(true);
  const isJoiningRef = useRef(false);   // ← prevents concurrent joinRoom
  const mountedRef = useRef(true);
  const effectIdRef = useRef(0);       // ← StrictMode guard
  const audioEls = useRef<HTMLElement[]>([]);
  const joinRoomRef = useRef<(() => Promise<void>) | null>(null);

  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep callback ref fresh without re-triggering effects
  const onDataRef = useRef(onDataReceived);
  useEffect(() => { onDataRef.current = onDataReceived; }, [onDataReceived]);

  /* ── Tiny helpers ───────────────────────────────────────────────────── */
  const syncTrackPermissions = useCallback(() => {
    const room = roomRef.current;
    const peer = remotePeerRef.current;
    if (!room || !room.localParticipant) return;

    if (aiActive && peer) {
      // Allow the human peer to see video, but not hear audio
      const allowedSids: string[] = [];
      room.localParticipant.videoTrackPublications.forEach((pub) => {
        if (pub.trackSid) allowedSids.push(pub.trackSid);
      });
      room.localParticipant.setTrackSubscriptionPermissions(true, [
        {
          participantIdentity: peer.identity,
          allowAll: false,
          allowedTrackSids: allowedSids,
        },
      ]);
      console.warn(`🔇 [VideoChat] Muted audio to peer (${peer.identity}) because AI is active.`);
    } else {
      // Revert to everyone is allowed
      room.localParticipant.setTrackSubscriptionPermissions(true, []);
      console.warn("🔊 [VideoChat] Restored default audio to peer (AI inactive).");
    }
  }, [aiActive, remotePeerIdentity]);

  // Ensure it reacts immediately to aiActive state changes
  useEffect(() => {
    syncTrackPermissions();
  }, [syncTrackPermissions]);

  const clearTimers = useCallback(() => {
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    if (peerTimer.current) { clearTimeout(peerTimer.current); peerTimer.current = null; }
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
  }, []);

  const cleanupAudio = useCallback(() => {
    audioEls.current.forEach((el) => {
      try {
        (el as HTMLAudioElement).srcObject = null;
        el.remove();
      } catch (error) { console.error("Audio cleanup failed:", error); }
    });
    audioEls.current = [];
  }, []);

  const handleMediaError = useCallback((error: any, isAudioOnlyFallback: boolean = false) => {
    if (error?.name === 'NotAllowedError') {
      setStatus("error-camera");
      const errorMsg = isAudioOnlyFallback
        ? " - Microphone access is required to start a video call. Please allow access in your browser settings and try again."
        : " - Permission Denied";
      setStatusMessage(String(t("videochat.status.error")) + errorMsg);
    } else {
      console.warn("Cleaned up error:", error);
    }
  }, [t]);

  /** Notify server we left (works even during page unload) */
  const notifyLeave = useCallback((room: string | null) => {
    if (!room) return;
    const body = JSON.stringify({ roomName: room });
    // Use fetch with keepalive — more reliable than sendBeacon for JSON
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      fetch(CONFIG.LEAVE_API_URL, {
        method: "POST",
        headers,
        body,
        keepalive: true,
      }).catch((error) => { console.error("Notify leave failed:", error); });
    });
  }, []);

  /** Safely tear down a Room: remove listeners → disconnect (keep tracks alive) */
  const teardownRoom = useCallback(async (room: Room | null, roomName: string | null) => {
    if (!room || room.state === "disconnected") return;
    try { room.removeAllListeners(); } catch (error) { console.error("WebRTC removeAllListeners failed:", error); }
    try { await room.disconnect(false); } catch (error) { console.error("WebRTC disconnect failed:", error); }   // false = DON'T kill local MediaStreamTracks
    notifyLeave(roomName);
  }, [notifyLeave]);

  const resetPeerState = useCallback(() => {
    remotePeerRef.current = null;
    setRemotePeerIdentity(null);
    setConnected(false);
    setRemoteCameraMuted(false);
  }, []);

  const handleConnectionSuccess = useCallback((roomName: string, token: string, url: string) => {
    reconnectionRef.current = {
      ...reconnectionRef.current,
      lastRoomName: roomName,
      lastToken: token,
      lastUrl: url,
      attempt: 0,
      isReconnecting: false,
    };
  }, []);

  const attemptReconnection = useCallback(async (): Promise<boolean> => {
    const room = roomRef.current;
    if (!room) return false;
    const state = reconnectionRef.current;

    if (state.attempt >= state.maxAttempts) {
      console.warn('❌ Max reconnection attempts reached — giving up');
      return false;
    }

    if (!state.lastRoomName || !state.lastToken || !state.lastUrl) {
      console.warn('❌ No session info to reconnect to');
      return false;
    }

    const attemptNumber = state.attempt + 1;
    const delay = CONFIG.RECONNECT_DELAYS_MS[state.attempt] ?? 4000;

    console.log(`🔄 Reconnection attempt ${attemptNumber}/${state.maxAttempts} in ${delay}ms...`);

    reconnectionRef.current = { ...state, isReconnecting: true, attempt: attemptNumber };
    setStatus('reconnecting');

    await new Promise(r => setTimeout(r, delay));

    try {
      await room.connect(state.lastUrl, state.lastToken, {
        rtcConfig: { iceServers: await fetchIceServers() },
      });

      console.log('✅ Reconnection successful!');
      reconnectionRef.current = { ...reconnectionRef.current, isReconnecting: false, attempt: 0 };
      setStatus('connected');
      return true;
    } catch (err) {
      console.warn(`⚠️ Reconnection attempt ${attemptNumber} failed:`, err);
      return attemptReconnection();
    }
  }, []);

  /* ── Send data via LiveKit data channel ─────────────────────────────── */
  const sendData = useCallback((data: object) => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) return;
    try {
      room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(data)),
        { reliable: true },
      );
    } catch (err) {
      console.error("Failed to send data:", err);
    }
  }, []);

  /* ── Track subscription handler ─────────────────────────────────────── */
  const onTrackSubscribed = useCallback(
    (track: Track, _pub: any, _p: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
        track.attach(remoteVideoRef.current);
      } else if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        if ("volume" in el) {
          (el as HTMLMediaElement).volume = currentVolumeRef.current;
        }
        document.body.appendChild(el);
        audioEls.current.push(el);
      }
    },
    [],
  );

  /* ── Ensure local stream is alive (re-acquire if tracks ended) ──────── */
  const ensureLocalStream = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return null;
    }
    const stream = localStreamRef.current;
    // If we have a stream and at least one track is live, keep it
    if (stream && stream.getTracks().some((t) => t.readyState === "live")) {
      return stream;
    }
    // Re-acquire media (respect camera preference)
    console.warn("🔄 [VideoChat] Local tracks ended — re-acquiring media…");
    const wantCameraOff = cameraMutedRef.current;
    if (!wantCameraOff) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        localStreamRef.current = newStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
        setCameraMuted(false);
        return newStream;
      } catch (err: any) {
        handleMediaError(err);
      }
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = newStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
      setCameraMuted(true);
      return newStream;
    } catch (e: any) {
      handleMediaError(e, true);
    }
    setCameraMuted(true);
    return null;
  }, [setCameraMuted, handleMediaError]);

  /* ── Setup Room Events Helper ───────────────────────────────────────── */
  const setupRoomEvents = useCallback((room: Room, handlePeerFound: (p: RemoteParticipant) => void) => {
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);

    room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
      console.warn("🟢 [VideoChat] ParticipantConnected:", p.identity);
      if (p.identity.toLowerCase().includes('agent')) return;
      handlePeerFound(p);
    });

    room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
      console.warn("🟡 [VideoChat] ParticipantDisconnected:", p?.identity);
      if (p.identity.toLowerCase().includes('agent')) return;
      
      if (!mountedRef.current || isSkippingRef.current || roomRef.current !== room) return;
      
      // Only reset the call if the actual human partner disconnected
      if (remotePeerRef.current && p.identity !== remotePeerRef.current.identity) return;

      resetPeerState();
      cleanupAudio();
      setStatus("looking");
      setStatusMessage(String(t("videochat.status.peer_left")));
      retryTimer.current = setTimeout(() => {
        isJoiningRef.current = false;   // allow re-entry
        joinRoomRef.current?.();
      }, CONFIG.RETRY_DELAY);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
      track.detach().forEach((el) => {
        (el as HTMLMediaElement).srcObject = null;
        el.remove();
      });
      audioEls.current = audioEls.current.filter((storedEl) => document.body.contains(storedEl));
    });

    room.on(RoomEvent.TrackMuted, (pub: TrackPublication, _p: Participant) => {
      if (pub.kind === Track.Kind.Video) {
        console.warn("🔇 [VideoChat] Remote camera MUTED");
        setRemoteCameraMuted(true);
      }
    });
    room.on(RoomEvent.TrackUnmuted, (pub: TrackPublication, _p: Participant) => {
      if (pub.kind === Track.Kind.Video) {
        console.warn("🔊 [VideoChat] Remote camera UNMUTED");
        setRemoteCameraMuted(false);
      }
    });

    room.on(RoomEvent.TrackPublished, (pub: TrackPublication, _p: RemoteParticipant) => {
      if (pub.kind === Track.Kind.Video) {
        console.warn("📹 [VideoChat] Remote video track PUBLISHED");
        setRemoteCameraMuted(false);
      }
    });
    room.on(RoomEvent.TrackUnpublished, (pub: TrackPublication, _p: RemoteParticipant) => {
      if (pub.kind === Track.Kind.Video) {
        console.warn("📹 [VideoChat] Remote video track UNPUBLISHED");
        setRemoteCameraMuted(true);
      }
    });

    room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const parsed = JSON.parse(new TextDecoder().decode(payload));
        if (onDataRef.current && participant) {
          onDataRef.current(parsed, { identity: participant.identity });
        }
      } catch (e) { console.warn("Cleaned up error:", e); }
    });

    room.on(RoomEvent.ConnectionStateChanged, (s: ConnectionState) => {
      console.warn("🔵 [VideoChat] State →", s, "| room:", currentRoomName.current);
    });

    room.on(RoomEvent.Disconnected, async (reason?: DisconnectReason) => {
      if (!mountedRef.current || isSkippingRef.current || roomRef.current !== room) return;
      console.log('🔌 Disconnected — reason:', reason);

      const intentionalReasons = [
        DisconnectReason.CLIENT_INITIATED,
        DisconnectReason.ROOM_DELETED,
        DisconnectReason.PARTICIPANT_REMOVED,
      ];

      if (reason && intentionalReasons.includes(reason)) {
        console.log('👋 Intentional disconnect — not reconnecting');
        roomRef.current = null;
        currentRoomName.current = null;
        resetPeerState();
        cleanupAudio();
        setStatus("looking");
        setStatusMessage(String(t("videochat.status.disconnected")));
        retryTimer.current = setTimeout(() => {
          isJoiningRef.current = false;
          joinRoomRef.current?.();
        }, CONFIG.RETRY_DELAY);
        return;
      }

      console.log('📶 Unintentional disconnect — attempting reconnection...');
      const reconnected = await attemptReconnection();

      if (!reconnected) {
        console.warn('❌ Reconnection failed — finding new partner');
        roomRef.current = null;
        currentRoomName.current = null;
        resetPeerState();
        cleanupAudio();
        setStatus("looking");
        setStatusMessage(String(t("videochat.status.disconnected")));
        retryTimer.current = setTimeout(() => {
          isJoiningRef.current = false;
          joinRoomRef.current?.();
        }, CONFIG.RETRY_DELAY);
      }
    });

    room.on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality, participant: Participant) => {
      if (participant === room.localParticipant) {
        if (quality === ConnectionQuality.Poor) {
          console.warn('⚠️ Poor connection quality detected');
          setConnectionQuality('poor');
        } else if (quality === ConnectionQuality.Good || quality === ConnectionQuality.Excellent) {
          setConnectionQuality('good');
        }
      }
    });
  }, [onTrackSubscribed, cleanupAudio, resetPeerState, attemptReconnection, t]);

  /* ════════════════════════════════════════════════════════════════════════════════
   * joinRoom — the main connection flow
   * Re-entry safe: if already joining, subsequent calls are ignored.
   * ════════════════════════════════════════════════════════════════════════════════ */
  const joinRoom = useCallback(async () => {
    joinRoomRef.current = joinRoom;
    // ── Guards ────────────────────────────────────────────────────────
    if (!mountedRef.current || !isSearchingRef.current || !readyToConnect) return;
    if (isJoiningRef.current) {
      console.warn("⏭️ [VideoChat] joinRoom skipped (already joining)");
      return;
    }
    isJoiningRef.current = true;

    // ── Clean up previous room ───────────────────────────────────────
    clearTimers();
    if (roomRef.current) {
      await teardownRoom(roomRef.current, currentRoomName.current);
      roomRef.current = null;
      currentRoomName.current = null;
    }
    resetPeerState();
    cleanupAudio();

    try {
      setStatus("looking");
      setStatusMessage(String(t("videochat.status.looking")));

      // ── Request next room assignment from matchmaking ─────────────
      console.warn("🟢 [VideoSession] Requesting next match…");
      let assignment = null;
      try {
        assignment = await requestMatch();
      } catch (reqError: any) {
        console.error("🔴 [VideoSession] requestMatch threw:", reqError);
        // Throw it further so the main catch block handles 429 appropriately
        throw reqError;
      }
      
      if (!assignment) {
        throw new Error("Matchmaking did not return a room assignment");
      }

      const { token, url, roomName } = assignment;
      console.warn("🟢 [VideoChat] Room:", roomName, "→", url);

      if (!mountedRef.current || !isSearchingRef.current) return;

      // ── Create LiveKit Room ────────────────────────────────────────
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      currentRoomName.current = roomName;

      // ── Peer-found helper ──────────────────────────────────────────
      const handlePeerFound = (p: RemoteParticipant) => {
        if (!mountedRef.current || roomRef.current !== room) return;
        console.warn("🟢 [VideoChat] Peer found:", p.identity);
        clearTimers();
        remotePeerRef.current = p;
        setRemotePeerIdentity(p.identity);
        setStatus("connected");
        setStatusMessage(String(t("videochat.status.connected")));
        setConnected(true);
        // Attach any tracks already published
        let hasVideoTrack = false;
        for (const pub of p.videoTrackPublications.values()) {
          if (pub.track) {
            onTrackSubscribed(pub.track, pub, p);
            hasVideoTrack = true;
          }
        }
        for (const pub of p.audioTrackPublications.values()) {
          if (pub.track) onTrackSubscribed(pub.track, pub, p);
        }
        // If the remote peer has NO video track, they joined with camera off
        if (!hasVideoTrack) {
          console.warn("🔇 [VideoChat] Remote peer has NO video track → camera is off");
          setRemoteCameraMuted(true);
        }
      };

      // ── Event listeners ────────────────────────────────────────────
      setupRoomEvents(room, handlePeerFound);

      // ── Connect ────────────────────────────────────────────────────
      setStatus("connecting");
      setStatusMessage(String(t("videochat.status.connecting")));

      const iceServers = await fetchIceServers();

      await Promise.race([
        room.connect(url, token, { rtcConfig: { iceServers } }),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error(`Connection timeout (${CONFIG.CONNECTION_TIMEOUT_MS}ms)`)), CONFIG.CONNECTION_TIMEOUT_MS),
        ),
      ]);

      handleConnectionSuccess(roomName, token, url);

      console.warn("🟢 [VideoChat] Connected! Peers:", room.remoteParticipants.size);

      if (!mountedRef.current || roomRef.current !== room) {
        console.warn("🔴 [VideoChat] Component unmounted during connect, disconnecting leaked room...");
        room.disconnect(true);
        return;
      }

      // ── Ensure local media is alive, then publish ──────────────────
      const stream = await ensureLocalStream();
      if (stream && roomRef.current === room && room.state !== ConnectionState.Disconnected) {
        const vt = stream.getVideoTracks()[0];
        const at = stream.getAudioTracks()[0];
        try {
          if (vt) await room.localParticipant.publishTrack(vt, { name: "camera", simulcast: true });
        } catch (err) {
          console.error("Failed to publish video track:", err);
        }
        try {
          if (at) await room.localParticipant.publishTrack(at, { name: "microphone" });
        } catch (err) {
          console.error("Failed to publish audio track:", err);
        }
        console.warn("🟢 [VideoChat] Published tracks (v:", !!vt, "a:", !!at, ")");
      }

      // ── Check for existing peers ───────────────────────────────────
      for (const [, p] of room.remoteParticipants) {
        if (remotePeerRef.current) break;
        if (p.identity.toLowerCase().includes('agent')) continue;
        handlePeerFound(p);
      }

      // ── If still alone, wait then retry ────────────────────────────
      if (!remotePeerRef.current && mountedRef.current && roomRef.current === room) {
        setStatus("looking");
        setStatusMessage(String(t("videochat.status.waiting")));

        pollTimer.current = setInterval(() => {
          if (!mountedRef.current || roomRef.current !== room || remotePeerRef.current) {
            if (pollTimer.current) clearInterval(pollTimer.current);
            return;
          }
          for (const [, p] of room.remoteParticipants) {
            if (p.identity.toLowerCase().includes('agent')) continue;
            if (!remotePeerRef.current) handlePeerFound(p);
          }
        }, CONFIG.PEER_POLL_INTERVAL_MS);

        peerTimer.current = setTimeout(async () => {
          if (pollTimer.current) clearInterval(pollTimer.current);
          if (!mountedRef.current || !isSearchingRef.current) return;
          if (roomRef.current === room && !remotePeerRef.current) {
            console.warn(`🟡 [VideoChat] No peer after ${CONFIG.PEER_SEARCH_TIMEOUT_MS}ms — retry…`);
            await teardownRoom(room, roomName);
            roomRef.current = null;
            currentRoomName.current = null;
            isJoiningRef.current = false;
            joinRoomRef.current?.();
          }
        }, CONFIG.PEER_SEARCH_TIMEOUT_MS);
      }
    } catch (err: any) {
      console.error("🔴 [VideoChat] joinRoom error:", err);
      if (!mountedRef.current) return;
      setStatus("error-peer");

      let delay = CONFIG.RETRY_DELAY;
      if (err?.message?.includes("429") || err?.message?.toLowerCase().includes("limit reached") || err?.status === 429) {
          console.warn("⚠️ Rate limited. Stopping search to prevent infinite loop.");
          setStatusMessage("Rate limit reached. Please wait 15 minutes.");
          
          // CRITICAL FIX: Stop searching so it doesn't loop forever!
          isSearchingRef.current = false;
          setIsSearching(false);
          delay = 0; // We won't retry
      } else {
          setStatusMessage(String(t("videochat.status.error")));
      }

      if (isSearchingRef.current && delay > 0) {
        retryTimer.current = setTimeout(() => {
          isJoiningRef.current = false;
          joinRoomRef.current?.();
        }, delay);
      } else {
        isJoiningRef.current = false;
      }
    } finally {
      // Release the joining lock UNLESS a retry timer was set (it will release)
      if (!retryTimer.current && !peerTimer.current) {
        isJoiningRef.current = false;
      }
    }
  }, [onTrackSubscribed, cleanupAudio, clearTimers, teardownRoom, resetPeerState, notifyLeave, ensureLocalStream, readyToConnect, requestMatch, t, handleConnectionSuccess, setupRoomEvents]);

  /* ── Acquire initial media ──────────────────────────────────────────── */
  const acquireMedia = useCallback(async (): Promise<MediaStream | null> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("error-camera");
      setStatusMessage(String(t("videochat.status.error") + " - Camera Not Supported"));
      return null;
    }

    const wantCameraOff = localStorage.getItem('vc_camera_off') === '1';
    if (wantCameraOff) {
      // User previously turned camera off — only request audio
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        setCameraMuted(true);
        return s;
      } catch (err: any) {
        handleMediaError(err, true);
      }
      setCameraMuted(true);
      return null;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      setCameraMuted(false);
      return s;
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        handleMediaError(err);
        setCameraMuted(true);
        return null;
      }
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      setCameraMuted(true);
      return s;
    } catch (e: any) {
      handleMediaError(e, true);
    }
    setCameraMuted(true);
    return null;
  }, [setCameraMuted, handleMediaError, t]);

  /* ── Retry camera (UI button) ───────────────────────────────────────── */
  const retryCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      if (!mountedRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setCameraMuted(false);
      if (roomRef.current) {
        const vt = stream.getVideoTracks()[0];
        if (vt) await roomRef.current.localParticipant.publishTrack(vt, { name: "camera", simulcast: true });
      }
    } catch (err: any) {
      console.warn("Retry camera failed:", err.message);
      handleMediaError(err);
    }
  }, [handleMediaError]);

  /* ══════════════════════════════════════════════════════════════════════
   * Init Effect — StrictMode safe via effectIdRef
   * ════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!readyToConnect) return;

    const thisId = ++effectIdRef.current;
    const stale = () => effectIdRef.current !== thisId;

    mountedRef.current = true;
    isSearchingRef.current = true;
    isJoiningRef.current = false;
    console.warn(`🚀 [VideoChat] Init (effect #${thisId})`);

    (async () => {
      const stream = await acquireMedia();
      if (stale()) {
        console.warn(`⏭️ [VideoChat] Effect #${thisId} stale — aborting`);
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      if (stream) {
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }
      if (!stale() && mountedRef.current) {
        joinRoom();
      }
    })();

    return () => {
      console.warn(`🧹 [VideoChat] Cleanup #${thisId}`);
      mountedRef.current = false;
      isSearchingRef.current = false;
      isJoiningRef.current = false;
      clearTimers();
      // Stop ALL local media tracks before tearing down the room
      localStreamRef.current?.getTracks().forEach((t) => { t.stop(); t.enabled = false; });
      // Also stop any tracks still held by the room's local participant
      try {
        roomRef.current?.localParticipant.videoTrackPublications.forEach((pub) => {
          pub.track?.stop();
        });
        roomRef.current?.localParticipant.audioTrackPublications.forEach((pub) => {
          pub.track?.stop();
        });
      } catch (e) {
        console.warn("Cleanup: room participant tracks already disposed:", e);
      }
      teardownRoom(roomRef.current, currentRoomName.current);
      roomRef.current = null;
      currentRoomName.current = null;
      localStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      cleanupAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyToConnect, joinRoom]);

  /* ── Skip ───────────────────────────────────────────────────────────── */
  const handleSkip = useCallback(async () => {
    if (isSkippingRef.current) return; // Prevent multiple rapid clicks (Idempotency)
    isSkippingRef.current = true;
    clearTimers();
    await teardownRoom(roomRef.current, currentRoomName.current);
    roomRef.current = null;
    currentRoomName.current = null;
    resetPeerState();
    cleanupAudio();
    setStatus("connecting");
    setStatusMessage(String(t("videochat.status.finding_new")));

    isSkippingRef.current = false;
    isJoiningRef.current = false;
    if (mountedRef.current && isSearchingRef.current) joinRoomRef.current?.();
  }, [clearTimers, teardownRoom, resetPeerState, cleanupAudio, t]);

  /* ── Toggle Camera ──────────────────────────────────────────────────── */
  const handleToggleCamera = useCallback(async () => {
    const mute = !cameraMuted;

    if (mute) {
      // ── TURN OFF: fully stop video tracks so camera LED goes off ──
      const vt = localStreamRef.current?.getVideoTracks() ?? [];
      vt.forEach((t) => {
        t.stop();
        localStreamRef.current?.removeTrack(t);
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current || null;
      }

      // Unpublish video track from LiveKit room
      const room = roomRef.current;
      if (room?.state === ConnectionState.Connected) {
        for (const pub of room.localParticipant.videoTrackPublications.values()) {
          if (pub.track) await room.localParticipant.unpublishTrack(pub.track).catch(e => console.warn(e));
        }
      }

      setCameraMuted(true);
      console.warn("📷 [VideoChat] Camera OFF (tracks stopped, mic still active)");
    } else {
      // ── TURN ON: re-acquire video track and publish to LiveKit ──
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        const newVideoTrack = videoStream.getVideoTracks()[0];

        if (!newVideoTrack) return;
        if (!mountedRef.current) { newVideoTrack.stop(); return; }

        if (localStreamRef.current) {
          localStreamRef.current.addTrack(newVideoTrack);
        } else {
          localStreamRef.current = new MediaStream([newVideoTrack]);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        // Publish new video track directly to LiveKit room
        const room = roomRef.current;
        if (room?.state === ConnectionState.Connected) {
          await room.localParticipant.publishTrack(newVideoTrack, { name: "camera", simulcast: true }).catch(e => console.error(e));
        }

        setCameraMuted(false);
        console.warn("📷 [VideoChat] Camera ON (new track acquired & published)");
      } catch (err: any) {
        console.error("[VideoChat] Failed to re-acquire camera:", err);
        handleMediaError(err);
      }
    }
  }, [cameraMuted, handleMediaError]);

  /* ── Toggle Audio ──────────────────────────────────────────────────── */
  const handleToggleAudio = useCallback(async () => {
    const mute = !audioMuted;

    // Toggle audio track state locally
    const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
    audioTracks.forEach((t) => { t.enabled = !mute; });

    setAudioMuted(mute);
    console.warn(`🎤 [VideoChat] Microphone ${mute ? 'MUTED' : 'UNMUTED'}`);
  }, [audioMuted, setAudioMuted]);

  /* ── Volume Control ─────────────────────────────────────────────────── */
  const handleVolumeChange = useCallback((value: number) => {
    const volume = value / 100;
    currentVolumeRef.current = volume;
    audioEls.current.forEach((el) => {
      if ("volume" in el) {
        (el as HTMLMediaElement).volume = volume;
      }
    });

    // Also update ElevenLabs TTS service volume
    import('@/services/elevenlabs-tts').then(({ elevenLabsTTS }) => {
      elevenLabsTTS.setVolume(volume);
    }).catch(console.warn);
  }, []);

  /* ── Pause / Resume Search ──────────────────────────────────────────── */
  const handleToggleSearch = useCallback(async () => {
    if (isSearching) {
      isSearchingRef.current = false;
      setIsSearching(false);
      clearTimers();
      await teardownRoom(roomRef.current, currentRoomName.current);
      roomRef.current = null;
      currentRoomName.current = null;
      resetPeerState();
      cleanupAudio();
      isJoiningRef.current = false;
      setStatus("looking");
      setStatusMessage(String(t("videochat.status.paused")));
    } else {
      isSearchingRef.current = true;
      setIsSearching(true);
      setStatus("connecting");
      setStatusMessage(String(t("videochat.status.resuming")));
      isJoiningRef.current = false;
      if (mountedRef.current) joinRoomRef.current?.();
    }
  }, [isSearching, clearTimers, teardownRoom, resetPeerState, cleanupAudio, t]);

  /* ── Exit ───────────────────────────────────────────────────────────── */
  const handleExit = useCallback(() => {
    mountedRef.current = false;
    isSearchingRef.current = false;
    clearTimers();
    // On intentional exit, fully stop local tracks
    localStreamRef.current?.getTracks().forEach((t) => { t.stop(); t.enabled = false; });
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (roomRef.current) {
      try { roomRef.current.removeAllListeners(); } catch (e) { console.warn("Cleaned up error:", e); }
      try { roomRef.current.disconnect(true); } catch (e) { console.warn("Cleaned up error:", e); }     // true = stop tracks
    }
    notifyLeave(currentRoomName.current);
    roomRef.current = null;
    currentRoomName.current = null;
    cleanupAudio();
    onExit();
  }, [clearTimers, notifyLeave, cleanupAudio, onExit]);

  /* ── Browser back button (Handled by component unmount cleanup naturally) ───────────────────────── */


  /* ── Tab close ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const onUnload = () => notifyLeave(currentRoomName.current);
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [notifyLeave]);

  /* ── API ────────────────────────────────────────────────────────────── */
  return {
    status, statusMessage, connected, cameraMuted, audioMuted, remoteCameraMuted, isSearching, connectionQuality, remotePeerIdentity,
    localVideoRef, remoteVideoRef, localStreamRef, roomRef,
    sendData, handleSkip, handleToggleCamera, handleToggleAudio, handleToggleSearch, handleExit, retryCamera,
    handleVolumeChange,
    audioEls,
  };
}

