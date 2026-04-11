/**
 * useVideoChat — compatibility facade over the extracted core hooks.
 *
 * Composition:
 * - useMatchmaking: room/token assignment lifecycle
 * - useVideoSession: LiveKit connection + media lifecycle
 * - useParticipants: participant-derived state
 */

import { useCallback } from "react";
import {
  useVideoSession,
  type UseVideoSessionReturn,
  type VideoSessionParticipant,
} from "@/pages/videochat/core/useVideoSession";
import { useMatchmaking } from "@/pages/videochat/core/useMatchmaking";
import { useParticipants } from "@/pages/videochat/core/useParticipants";

export interface UseVideoChatOptions {
  onExit: () => void;
  onDataReceived?: (parsed: unknown, participant: VideoSessionParticipant) => void;
  countryPreference?: string;
  fingerprint?: string | null;
  readyToConnect?: boolean;
}

export interface UseVideoChatReturn extends Omit<UseVideoSessionReturn, "remoteCameraMuted" | "remotePeerIdentity"> {
  remoteCameraMuted: boolean;
  remotePeerIdentity: string | null;
}

export function useVideoChat({
  onExit,
  onDataReceived,
  countryPreference,
  fingerprint,
  readyToConnect = true,
}: UseVideoChatOptions): UseVideoChatReturn {
  const matchmaking = useMatchmaking({
    countryPreference,
    fingerprint,
  });

  const requestMatch = useCallback(async () => {
      try {

          return matchmaking.requestMatch();
        
      } catch (error) {
        console.error('[useVideoChat.ts] [anonymous_function]:', error);
      }
  }, [matchmaking]);

  const session = useVideoSession({
    onExit,
    onDataReceived,
    requestMatch,
    readyToConnect,
  });

  const participants = useParticipants({
    roomRef: session.roomRef,
    connected: session.connected,
  });

  return {
    ...session,
    remoteCameraMuted: participants.remoteCameraMuted,
    remotePeerIdentity: participants.remotePeerIdentity,
  };
}
