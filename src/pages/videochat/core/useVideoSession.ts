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
}

/* ─── Hook Return ───────────────────────────────────────────────────────── */
export interface UseVideoSessionReturn {
  status: Status;
  statusMessage: string;
  connected: boolean;
  cameraMuted: boolean;
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
  const [remoteCameraMuted, setRemoteCameraMuted] = useState(false);
  const [isSearching, setIsSearching] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<'poor' | 'good'>('good');
  const [remotePeerIdentity, setRemotePeerIdentity] = useState<string | null>(null);

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

  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep callback ref fresh without re-triggering effects
  const onDataRef = useRef(onDataReceived);
  useEffect(() => { onDataRef.current = onDataReceived; }, [onDataReceived]);

  /* ── Tiny helpers ───────────────────────────────────────────────────── */
  const clearTimers = useCallback(() => {
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    if (peerTimer.current) { clearTimeout(peerTimer.current); peerTimer.current = null; }
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
  }, []);

  const cleanupAudio = useCallback(() => {
    audioEls.current.forEach((el) => { try { el.remove(); } catch (_) { } });
    audioEls.current = [];
  }, []);

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
      }).catch(() => { });
    });
  }, []);

  /** Safely tear down a Room: remove listeners → disconnect (keep tracks alive) */
  const teardownRoom = useCallback((room: Room | null, roomName: string | null) => {
    if (!room) return;
    try { room.removeAllListeners(); } catch (_) { }
    try { room.disconnect(false); } catch (_) { }   // false = DON'T kill local MediaStreamTracks
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

  const RECONNECT_DELAYS = [1000, 2000, 4000];

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
    const delay = RECONNECT_DELAYS[state.attempt] ?? 4000;

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
        if (err.name === 'NotAllowedError') {
           setStatus("error-camera");
           setStatusMessage(String(t("videochat.status.error") + " - Permission Denied"));
        }
      }
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = newStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
      setCameraMuted(true);
      return newStream;
    } catch (_) { }
    setCameraMuted(true);
    return null;
  }, [setCameraMuted, t]);

  /* ══════════════════════════════════════════════════════════════════════
   * joinRoom — the main connection flow
   * Re-entry safe: if already joining, subsequent calls are ignored.
   * ════════════════════════════════════════════════════════════════════ */
  const joinRoom = useCallback(async () => {
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
      teardownRoom(roomRef.current, currentRoomName.current);
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
      const assignment = await requestMatch();
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
      room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);

      room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
        console.warn("🟢 [VideoChat] ParticipantConnected:", p.identity);
        handlePeerFound(p);
      });

      room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
        console.warn("🟡 [VideoChat] ParticipantDisconnected:", p?.identity);
        if (!mountedRef.current || isSkippingRef.current || roomRef.current !== room) return;
        resetPeerState();
        cleanupAudio();
        setStatus("looking");
        setStatusMessage(String(t("videochat.status.peer_left")));
        retryTimer.current = setTimeout(() => {
          isJoiningRef.current = false;   // allow re-entry
          joinRoom();
        }, CONFIG.RETRY_DELAY);
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
        track.detach().forEach((el) => el.remove());
      });

      // ── Remote camera mute/unmute detection ────────────────────────
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

      // ── Remote track published/unpublished (camera toggled on/off) ──
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
        } catch (_) { }
      });

      room.on(RoomEvent.ConnectionStateChanged, (s: ConnectionState) => {
        console.warn("🔵 [VideoChat] State →", s, "| room:", roomName);
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
            joinRoom();
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
            joinRoom();
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

      // ── Connect ────────────────────────────────────────────────────
      setStatus("connecting");
      setStatusMessage(String(t("videochat.status.connecting")));

      const iceServers = await fetchIceServers();

      await Promise.race([
        room.connect(url, token, { rtcConfig: { iceServers } }),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("Connection timeout (15s)")), 15_000),
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
      if (stream && roomRef.current === room) {
        const vt = stream.getVideoTracks()[0];
        const at = stream.getAudioTracks()[0];
        if (vt) await room.localParticipant.publishTrack(vt, { name: "camera", simulcast: true });
        if (at) await room.localParticipant.publishTrack(at, { name: "microphone" });
        console.warn("🟢 [VideoChat] Published tracks (v:", !!vt, "a:", !!at, ")");
      }

      // ── Check for existing peers ───────────────────────────────────
      for (const [, p] of room.remoteParticipants) {
        if (remotePeerRef.current) break;
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
            if (!remotePeerRef.current) handlePeerFound(p);
          }
        }, 2_000);

        peerTimer.current = setTimeout(() => {
          if (pollTimer.current) clearInterval(pollTimer.current);
          if (!mountedRef.current || !isSearchingRef.current) return;
          if (roomRef.current === room && !remotePeerRef.current) {
            console.warn("🟡 [VideoChat] No peer after 15s — retry…");
            teardownRoom(room, roomName);
            roomRef.current = null;
            currentRoomName.current = null;
            isJoiningRef.current = false;
            joinRoom();
          }
        }, 15_000);
      }
    } catch (err) {
      console.error("🔴 [VideoChat] joinRoom error:", err);
      if (!mountedRef.current) return;
      setStatus("error-peer");
      setStatusMessage(String(t("videochat.status.error")));
      retryTimer.current = setTimeout(() => {
        isJoiningRef.current = false;
        joinRoom();
      }, CONFIG.RETRY_DELAY);
    } finally {
      // Release the joining lock UNLESS a retry timer was set (it will release)
      if (!retryTimer.current && !peerTimer.current) {
        isJoiningRef.current = false;
      }
    }
  }, [onTrackSubscribed, cleanupAudio, clearTimers, teardownRoom, resetPeerState, notifyLeave, ensureLocalStream, readyToConnect, requestMatch]);

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
        if (err.name === 'NotAllowedError') {
          setStatus("error-camera");
          setStatusMessage(String(t("videochat.status.error") + " - Permission Denied"));
        }
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
      if (err.name === 'NotAllowedError') {
        setStatus("error-camera");
        setStatusMessage(String(t("videochat.status.error") + " - Permission Denied"));
        setCameraMuted(true);
        return null;
      }
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      setCameraMuted(true);
      return s;
    } catch (_) { }
    setCameraMuted(true);
    return null;
  }, [setCameraMuted, t]);

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
        if (vt) await roomRef.current.localParticipant.publishTrack(vt, { name: "camera" });
      }
    } catch (err: any) {
      console.warn("Retry camera failed:", err.message);
    }
  }, []);

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
      teardownRoom(roomRef.current, currentRoomName.current);
      roomRef.current = null;
      currentRoomName.current = null;
      // Stop local camera/mic tracks so the camera LED turns off when leaving
      localStreamRef.current?.getTracks().forEach((t) => { t.stop(); t.enabled = false; });
      localStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      cleanupAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyToConnect, joinRoom]);

  /* ── Skip ───────────────────────────────────────────────────────────── */
  const handleSkip = useCallback(() => {
    isSkippingRef.current = true;
    clearTimers();
    teardownRoom(roomRef.current, currentRoomName.current);
    roomRef.current = null;
    currentRoomName.current = null;
    resetPeerState();
    cleanupAudio();
    setStatus("connecting");
    setStatusMessage(String(t("videochat.status.finding_new")));
    setTimeout(() => {
      isSkippingRef.current = false;
      isJoiningRef.current = false;
      if (mountedRef.current && isSearchingRef.current) joinRoom();
    }, 400);
  }, [clearTimers, teardownRoom, resetPeerState, joinRoom, cleanupAudio]);

  /* ── Toggle Camera ──────────────────────────────────────────────────── */
  const handleToggleCamera = useCallback(async () => {
    const mute = !cameraMuted;

    if (mute) {
      // ── TURN OFF: fully stop video tracks so camera LED goes off ──
      const vt = localStreamRef.current?.getVideoTracks() ?? [];
      vt.forEach((t) => { t.stop(); });

      // Remove video tracks from the stream (keep audio)
      if (localStreamRef.current) {
        vt.forEach((t) => localStreamRef.current!.removeTrack(t));
      }

      // Clear local video preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current || null;
      }

      // Unpublish video track from LiveKit room
      const room = roomRef.current;
      if (room && room.state === ConnectionState.Connected) {
        try {
          for (const pub of room.localParticipant.videoTrackPublications.values()) {
            if (pub.track) {
              await room.localParticipant.unpublishTrack(pub.track);
            }
          }
        } catch (_) { }
      }

      setCameraMuted(true);
      console.warn("📷 [VideoChat] Camera OFF (tracks stopped, mic still active)");
    } else {
      // ── TURN ON: re-acquire video track and publish to LiveKit ──
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        const newVideoTrack = videoStream.getVideoTracks()[0];


        if (newVideoTrack && localStreamRef.current) {


          localStreamRef.current.addTrack(newVideoTrack);


        } else if (newVideoTrack) {


          if (!mountedRef.current) {
            videoStream.getTracks().forEach((t) => t.stop());
            return;
          }

          // If stream was lost, recreate with existing audio
          const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
          const newStream = new MediaStream([...audioTracks, newVideoTrack]);
          localStreamRef.current = newStream;
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        // Publish new video track directly to LiveKit room
        const room = roomRef.current;
        if (room && room.state === ConnectionState.Connected && newVideoTrack) {
          try {
            await room.localParticipant.publishTrack(newVideoTrack, { name: "camera", simulcast: false });
          } catch (pubErr) {
            console.error("[VideoChat] Failed to publish camera track:", pubErr);
          }
        }

        setCameraMuted(false);
        console.warn("📷 [VideoChat] Camera ON (new track acquired & published)");
      } catch (err) {
        console.error("[VideoChat] Failed to re-acquire camera:", err);
      }
    }
  }, [cameraMuted]);

  /* ── Pause / Resume Search ──────────────────────────────────────────── */
  const handleToggleSearch = useCallback(() => {
    if (isSearching) {
      isSearchingRef.current = false;
      setIsSearching(false);
      clearTimers();
      teardownRoom(roomRef.current, currentRoomName.current);
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
      setTimeout(() => { if (mountedRef.current) joinRoom(); }, 400);
    }
  }, [isSearching, clearTimers, teardownRoom, resetPeerState, joinRoom, cleanupAudio]);

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
      try { roomRef.current.removeAllListeners(); } catch (_) { }
      try { roomRef.current.disconnect(true); } catch (_) { }     // true = stop tracks
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
    status, statusMessage, connected, cameraMuted, remoteCameraMuted, isSearching, connectionQuality, remotePeerIdentity,
    localVideoRef, remoteVideoRef, localStreamRef, roomRef,
    sendData, handleSkip, handleToggleCamera, handleToggleSearch, handleExit, retryCamera,
    audioEls,
  };
}
