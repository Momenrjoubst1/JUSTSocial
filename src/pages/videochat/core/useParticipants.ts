import { useEffect, useState } from "react";

interface TrackLike {
  kind?: string;
}

interface TrackPublicationLike {
  kind?: string;
  track?: TrackLike | null;
}

interface RemoteParticipantLike {
  identity?: string;
  videoTrackPublications?: Iterable<TrackPublicationLike> | Map<string, TrackPublicationLike>;
}

interface RoomLike {
  remoteParticipants?: Map<string, RemoteParticipantLike>;
}

export interface ParticipantState {
  identity: string;
}

export interface UseParticipantsOptions {
  roomRef: React.MutableRefObject<unknown>;
  connected: boolean;
}

export interface UseParticipantsReturn {
  participants: ParticipantState[];
  remotePeerIdentity: string | null;
  remoteCameraMuted: boolean;
}

function collectParticipants(room: RoomLike | null): ParticipantState[] {
  if (!room?.remoteParticipants) {
    return [];
  }

  const result: ParticipantState[] = [];
  for (const participant of room.remoteParticipants.values()) {
    if (participant?.identity) {
      result.push({ identity: participant.identity });
    }
  }
  return result;
}

function hasRemoteVideoTrack(participant: RemoteParticipantLike | undefined): boolean {
  if (!participant?.videoTrackPublications) {
    return false;
  }

  const publications = participant.videoTrackPublications;
  const iterable =
    publications instanceof Map ? publications.values() : publications;

  for (const publication of iterable) {
    const pubKind = publication?.kind;
    const trackKind = publication?.track?.kind;
    if (pubKind === "video" || trackKind === "video") {
      return true;
    }
  }

  return false;
}

export function useParticipants({ roomRef, connected }: UseParticipantsOptions): UseParticipantsReturn {
  const [participants, setParticipants] = useState<ParticipantState[]>([]);
  const [remoteCameraMuted, setRemoteCameraMuted] = useState(false);

  useEffect(() => {
    if (!connected) {
      setParticipants([]);
      setRemoteCameraMuted(false);
      return;
    }

    let cancelled = false;
    let rafId: number | null = null;
    let prevParticipants: ParticipantState[] | null = null;
    let prevCameraMuted = false;

    const poll = () => {
      if (cancelled) return;

      const room = roomRef.current as RoomLike | null;
      const current = collectParticipants(room);
      const firstRemote = room?.remoteParticipants
        ? Array.from(room.remoteParticipants.values())[0]
        : undefined;
      const currentCameraMuted = !hasRemoteVideoTrack(firstRemote);

      // Use identity comparison instead of expensive JSON.stringify
      if (prevParticipants !== current) {
        setParticipants(current);
        prevParticipants = current;
      }
      if (prevCameraMuted !== currentCameraMuted) {
        setRemoteCameraMuted(currentCameraMuted);
        prevCameraMuted = currentCameraMuted;
      }

      rafId = requestAnimationFrame(poll);
    };

    rafId = requestAnimationFrame(poll);

    return () => {
      cancelled = true;
      if (rafId != null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [connected, roomRef]);

  const remotePeerIdentity = participants.length > 0 ? participants[0].identity : null;

  return {
    participants,
    remotePeerIdentity,
    remoteCameraMuted,
  };
}
