/**
 * ════════════════════════════════════════════════════════════════════════════════
 * useScreenShare — Screen sharing toggle
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useRef, useState } from "react";
import type { Room } from "livekit-client";

interface LocalTrackPublicationLike {
  source?: string;
  track?: {
    mediaStreamTrack?: MediaStreamTrack;
  } | null;
}

export interface UseScreenShareReturn {
  isScreenSharing: boolean;
  handleScreenShare: () => Promise<void>;
  /** Call on exit to clean up screen stream */
  cleanupScreenShare: () => void;
  screenStreamRef: React.MutableRefObject<MediaStream | null>;
}

export function useScreenShare(
  roomRef: React.MutableRefObject<Room | null>,
  localVideoRef: React.RefObject<HTMLVideoElement | null>,
  localStreamRef: React.MutableRefObject<MediaStream | null>,
): UseScreenShareReturn {
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const isTogglingRef = useRef(false);
  // Guard to prevent the localTrackPublished listener from firing multiple times
  const trackPublishedHandlerAttachedRef = useRef(false);
  // Ref to hold the current handler so it can be removed during cleanup
  const trackPublishedHandlerRef = useRef<((pub: any) => void) | null>(null);

  const handleScreenShare = useCallback(async () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;

    try {
      // ── Stop sharing ────────────────────────────────────────────────────
      // Relying on screenStreamRef instead of isScreenSharing prevents stale closures 
      // and allows us to safely omit isScreenSharing from the dependency array.
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;

        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        try {
          if (roomRef.current) {
            await roomRef.current.localParticipant.setScreenShareEnabled(false);
          }
        } catch (err) {
          // Room may be disconnected; still need to reset local state.
          console.warn("Failed to disable screen share on room (may be disconnected):", err);
        } finally {
          setIsScreenSharing(false);
        }
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

        // Listen for the track to be actually published instead of assuming it's available immediately
        const handleTrackPublished = (pub: any) => {
          // Guard: prevent the listener from firing multiple times
          if (!trackPublishedHandlerAttachedRef.current) return;
          trackPublishedHandlerAttachedRef.current = false;

          if (pub.source !== "screen_share" || !pub.track) return;

          const mediaTrack = pub.track.mediaStreamTrack;
          if (!mediaTrack) return;

          // Show screen share in local preview
          const stream = new MediaStream([mediaTrack]);
          screenStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          setIsScreenSharing(true);

          // Handle native "Stop sharing" click
          mediaTrack.onended = () => {
            if (localVideoRef.current && localStreamRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
            if (roomRef.current) {
              roomRef.current.localParticipant.setScreenShareEnabled(false);
            }
            screenStreamRef.current = null;
            setIsScreenSharing(false);
          };

          localP.off("localTrackPublished", handleTrackPublished);
          trackPublishedHandlerRef.current = null;
        };

        trackPublishedHandlerRef.current = handleTrackPublished;

        // Check if it's already published before attaching the listener
        let alreadyPublished = false;
        for (const pub of localP.videoTrackPublications.values()) {
          if (pub.source === "screen_share" && pub.track) {
            alreadyPublished = true;
            handleTrackPublished(pub);
            break;
          }
        }

        if (!alreadyPublished) {
          trackPublishedHandlerAttachedRef.current = true;
          localP.on("localTrackPublished", handleTrackPublished);
        }

      } catch (err) {
        console.warn("Screen sharing cancelled or failed:", err);
      } finally {
        isTogglingRef.current = false;
      }
    } catch (err) {
      // Outer catch for any unexpected errors
      console.error("Screen share error:", err);
      isTogglingRef.current = false;
    }
  }, [roomRef, localVideoRef, localStreamRef]); // eslint-disable-line react-hooks/exhaustive-deps

  const cleanupScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    // Remove the event listener if it was registered
    const handler = trackPublishedHandlerRef.current;
    if (handler && roomRef.current) {
      roomRef.current.localParticipant.off("localTrackPublished", handler);
      trackPublishedHandlerRef.current = null;
    }
    trackPublishedHandlerAttachedRef.current = false;
    setIsScreenSharing(false);
  }, [roomRef]);

  return { isScreenSharing, handleScreenShare, cleanupScreenShare, screenStreamRef };
}
