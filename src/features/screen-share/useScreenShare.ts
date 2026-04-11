/**
 * ════════════════════════════════════════════════════════════════════════════════
 * useScreenShare — Screen sharing toggle
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useRef, useState } from "react";

interface LocalTrackPublicationLike {
  source?: string;
  track?: {
    mediaStreamTrack?: MediaStreamTrack;
  } | null;
}

interface RoomWithScreenShare {
  localParticipant: {
    setScreenShareEnabled: (enabled: boolean) => Promise<unknown>;
    videoTrackPublications: Map<string, LocalTrackPublicationLike>;
  };
}

export interface UseScreenShareReturn {
  isScreenSharing: boolean;
  handleScreenShare: () => Promise<void>;
  /** Call on exit to clean up screen stream */
  cleanupScreenShare: () => void;
  screenStreamRef: React.MutableRefObject<MediaStream | null>;
}

export function useScreenShare(
  roomRef: React.MutableRefObject<RoomWithScreenShare | null>,
  localVideoRef: React.RefObject<HTMLVideoElement | null>,
  localStreamRef: React.MutableRefObject<MediaStream | null>,
): UseScreenShareReturn {
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const handleScreenShare = useCallback(async () => {
    // ── Stop sharing ────────────────────────────────────────────────────
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      if (roomRef.current) {
        await roomRef.current.localParticipant.setScreenShareEnabled(false);
      }
      setIsScreenSharing(false);
      return;
    }

    // ── Start sharing ───────────────────────────────────────────────────
    // Use LiveKit's built-in screen share publication only.
    // This avoids the conflict of manually capturing via getDisplayMedia
    // AND also calling setScreenShareEnabled which captures its own track.
    try {
      if (!roomRef.current) return;

      // LiveKit handles getDisplayMedia internally
      const localP = roomRef.current.localParticipant;
      await localP.setScreenShareEnabled(true);

      // Find the screen-share track LiveKit just published
      let screenTrack: MediaStreamTrack | null = null;
      for (const pub of localP.videoTrackPublications.values()) {
        if (pub.source === "screen_share" && pub.track) {
          const mediaTrack = pub.track.mediaStreamTrack;
          if (mediaTrack) {
            screenTrack = mediaTrack;
            // Show screen share in local preview
            const stream = new MediaStream([mediaTrack]);
            screenStreamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          }
          break;
        }
      }

      setIsScreenSharing(true);

      // Handle native "Stop sharing" click
      if (screenTrack) {
        screenTrack.onended = () => {
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          if (roomRef.current) {
            roomRef.current.localParticipant.setScreenShareEnabled(false);
          }
          screenStreamRef.current = null;
          setIsScreenSharing(false);
        };
      }
    } catch (err) {
      console.warn("Screen sharing cancelled or failed:", err);
    }
  }, [isScreenSharing, roomRef, localVideoRef, localStreamRef]);

  const cleanupScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
  }, []);

  return { isScreenSharing, handleScreenShare, cleanupScreenShare, screenStreamRef };
}
