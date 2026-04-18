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
  type VideoSessionMatch,
} from "@/pages/videochat/core/useVideoSession";
import { useMatchmaking } from "@/pages/videochat/core/useMatchmaking";
import { useParticipants } from "@/pages/videochat/core/useParticipants";

export interface UseVideoChatOptions {
  onExit: () => void;
  onDataReceived?: (parsed: unknown, participant: VideoSessionParticipant) => void;
  countryPreference?: string;
  fingerprint?: string | null;
  readyToConnect?: boolean;
  aiActive?: boolean;
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
  aiActive = false,
}: UseVideoChatOptions): UseVideoChatReturn {
  const matchmaking = useMatchmaking({
    countryPreference,
    fingerprint,
  });

  const { requestMatch: doRequestMatch } = matchmaking;

  const requestMatch = useCallback(async (): Promise<VideoSessionMatch | null> => {
    try {
      const m = await doRequestMatch();
      return m;
    } catch (error) {
      console.error('[useVideoChat.ts] [requestMatch]:', error);
      throw error; // Rethrow to let useVideoSession handle specific rate limit errors
    }
  }, [doRequestMatch]);

  const session = useVideoSession({
    onExit,
    onDataReceived,
    requestMatch,
    readyToConnect,
    aiActive,
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
