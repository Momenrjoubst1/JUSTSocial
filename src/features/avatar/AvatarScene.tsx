/**
 * AvatarScene — React component that wires together:
 *   • A Web Worker running MediaPipe face-tracking
 *   • AvatarSceneManager for Three.js rendering
 *   • LiveKit track substitution (camera → avatar canvas stream)
 *
 * Props
 *   isEnabled       – whether the avatar overlay is active
 *   onToggle        – callback to toggle avatar mode in parent
 *   room            – LiveKit Room (or null when not connected)
 *   isCameraEnabled – whether the real camera is currently on
 */

import {
  useRef,
  useEffect,
  useCallback,
  useState,
} from "react";
import { AvatarSceneManager } from "./AvatarSceneManager";

/* ── Types ────────────────────────────────────────────── */

interface AvatarSceneProps {
  isEnabled: boolean;
  onToggle: () => void;
  room: {
    localParticipant: {
      publishTrack: (t: MediaStreamTrack) => Promise<unknown>;
      unpublishTrack: (t: MediaStreamTrack) => void;
    };
  } | null;
  isCameraEnabled: boolean;
}

interface WorkerResult {
  type: string;
  blendshapes?: { categoryName: string; score: number }[] | null;
  matrix?: number[] | null;
  error?: string;
}

/* ── Available models ─────────────────────────────────── */
const AVATAR_MODELS = [
  { label: "Default", url: "/models/default_avatar.vrm" },
  { label: "Custom…", url: "" },
];

/* ── Component ────────────────────────────────────────── */
export function AvatarScene({ isEnabled, onToggle, room, isCameraEnabled }: AvatarSceneProps) {
  /* Refs */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const managerRef = useRef<AvatarSceneManager | null>(null);
  const rafRef = useRef<number>(0);
  const avatarTrackRef = useRef<MediaStreamTrack | null>(null);
  const prevClockRef = useRef(0);

  /* State */
  const [workerReady, setWorkerReady] = useState(false);
  const [modelUrl, setModelUrl] = useState(AVATAR_MODELS[0].url);
  const [status, setStatus] = useState<string>("");

  /* ── Helpers ────────────────────────────────────────── */
  const cleanupTrack = useCallback(() => {
    const track = avatarTrackRef.current;
    if (track) {
      try { room?.localParticipant.unpublishTrack(track); } catch { /* ok */ }
      track.stop();
      avatarTrackRef.current = null;
    }
  }, [room]);

  /* ── Initialise Worker ──────────────────────────────── */
  useEffect(() => {
    if (!isEnabled) return;

    const w = new Worker(
      new URL("./avatar.worker.ts", import.meta.url),
      { type: "module" },
    );

    w.onmessage = (e: MessageEvent<WorkerResult>) => {
      if (e.data.type === "LOADED") {
        setWorkerReady(true);
        setStatus("Tracking ready");
      } else if (e.data.type === "ERROR") {
        setStatus("Worker error: " + (e.data.error ?? "unknown"));
      }
    };

    w.postMessage({ type: "INIT" });
    workerRef.current = w;
    setStatus("Loading face model…");

    return () => {
      w.terminate();
      workerRef.current = null;
      setWorkerReady(false);
    };
  }, [isEnabled]);

  /* ── Initialise Three.js scene ──────────────────────── */
  useEffect(() => {
    if (!isEnabled || !canvasRef.current) return;

    const mgr = new AvatarSceneManager(canvasRef.current);
    managerRef.current = mgr;

    mgr.loadModel(modelUrl || "/models/default_avatar.vrm");

    return () => {
      mgr.dispose();
      managerRef.current = null;
    };
    // Only re-build when isEnabled changes. Model swaps use the method below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled]);

  /* ── Swap model when selector changes ────────────── */
  useEffect(() => {
    if (!isEnabled || !managerRef.current || !modelUrl) return;
    managerRef.current.loadModel(modelUrl);
  }, [modelUrl, isEnabled]);

  /* ── Start camera → capture loop ────────────────────── */
  useEffect(() => {
    if (!isEnabled || !workerReady || !isCameraEnabled) return;

    let stopped = false;
    const video = videoRef.current;
    if (!video) return;

    // Get camera stream for the hidden video element
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } })
      .then((stream) => {
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        video.srcObject = stream;
        video.play().catch(() => {/* autoplay ok */});
      })
      .catch((err) => setStatus("Camera error: " + String(err)));

    return () => {
      stopped = true;
      if (video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      }
    };
  }, [isEnabled, workerReady, isCameraEnabled]);

  /* ── Render / tracking loop ─────────────────────────── */
  useEffect(() => {
    if (!isEnabled || !workerReady) return;

    const worker = workerRef.current;
    const video = videoRef.current;
    const mgr = managerRef.current;
    if (!worker || !video || !mgr) return;

    // Listen for results from the worker
    let isWorkerBusy = false;
    let lastFrameTime = 0;

    const handler = (e: MessageEvent<WorkerResult>) => {
      if (e.data.type !== "RESULTS") return;
      isWorkerBusy = false;
      if (e.data.blendshapes) mgr.updateBlendshapes(e.data.blendshapes);
      if (e.data.matrix) mgr.updateHeadRotation(e.data.matrix);
    };
    worker.addEventListener("message", handler);

    prevClockRef.current = performance.now();

    const loop = () => {
      if (!managerRef.current) return;

      const now = performance.now();
      const dt = (now - prevClockRef.current) / 1000;
      prevClockRef.current = now;

      // Update VRM independently of worker framerate
      mgr.update(dt);

      // Throttling logic + Busy lock
      // Only process max ~30fps to save resources (1000/30 = ~33.3ms)
      if (!isWorkerBusy && video.readyState >= 2 && now - lastFrameTime > 33) {
        isWorkerBusy = true;
        lastFrameTime = now;
        createImageBitmap(video)
          .then((bmp) => {
            worker.postMessage(
              { type: "PROCESS_FRAME", videoFrame: bmp, timestamp: now },
              [bmp],
            );
          })
          .catch(() => {
             isWorkerBusy = false;
          });
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      worker.removeEventListener("message", handler);
    };
  }, [isEnabled, workerReady]);

  /* ── Publish avatar stream to LiveKit ───────────────── */
  useEffect(() => {
    if (!isEnabled || !workerReady || !room) {
      cleanupTrack();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    let stopped = false;

    const publish = async () => {
      try {
        // Capture the Three.js canvas as a MediaStream
        const stream = canvas.captureStream(30);
        const [videoTrackSource] = stream.getVideoTracks();
        if (!videoTrackSource || stopped) return;

        avatarTrackRef.current = videoTrackSource;

        await room.localParticipant.publishTrack(videoTrackSource);
        setStatus("Avatar published to room");
      } catch (err) {
        console.error("[Avatar] publish error:", err);
        setStatus("Failed to publish avatar track");
      }
    };

    publish();

    return () => {
      stopped = true;
      cleanupTrack();
    };
  }, [isEnabled, workerReady, room, cleanupTrack]);

  /* ── Cleanup on unmount ─────────────────────────────── */
  useEffect(() => () => cleanupTrack(), [cleanupTrack]);

  /* ── UI ──────────────────────────────────────────────── */
  if (!isEnabled) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
      {/* Hidden video for camera capture */}
      <video
        ref={videoRef}
        style={{ display: "none" }}
        playsInline
        muted
        autoPlay
      />

      {/* Three.js canvas — visible */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="rounded-lg shadow-2xl"
        style={{ background: "#1a1a2e" }}
      />

      {/* Controls overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={onToggle}
          className="rounded-lg bg-red-600 px-4 py-2 text-white text-sm hover:bg-red-700 transition"
        >
          Exit Avatar
        </button>

        <button
          onClick={() => managerRef.current?.recalibrate()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm hover:bg-blue-700 transition"
        >
          Recalibrate
        </button>
      </div>

      {/* Model selector */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <label className="text-white text-sm">Model:</label>
        <select
          value={modelUrl}
          onChange={(e) => setModelUrl(e.target.value)}
          className="rounded bg-gray-800 text-white text-sm px-2 py-1"
        >
          {AVATAR_MODELS.map((m) => (
            <option key={m.label} value={m.url}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      {status && (
        <div className="absolute bottom-4 right-4 rounded bg-gray-900/90 px-3 py-1 text-white text-xs">
          {status}
        </div>
      )}
    </div>
  );
}
