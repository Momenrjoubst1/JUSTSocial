import { useEffect, useMemo, useState } from "react";

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
  on: (eventName: string, listener: (...args: unknown[]) => void) => void;
  off?: (eventName: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (eventName: string, listener: (...args: unknown[]) => void) => void;
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
      return () => {
        // No room listeners to clean when disconnected.
      };
    }

    const room = roomRef.current as RoomLike | null;
    if (!room || typeof room.on !== "function") {
      setParticipants([]);
      setRemoteCameraMuted(false);
      return () => {
        // No room available.
      };
    }

    const sync = () => {
      const current = collectParticipants(room);
      setParticipants(current);

      const firstRemote = room.remoteParticipants
        ? Array.from(room.remoteParticipants.values())[0]
        : undefined;
      setRemoteCameraMuted(!hasRemoteVideoTrack(firstRemote));
    };

    const onParticipantConnected = () => {
      sync();
    };

    const onParticipantDisconnected = () => {
      sync();
    };

    const onTrackMuted = (publication: unknown) => {
      const cast = publication as TrackPublicationLike | undefined;
      if (cast?.kind === "video" || cast?.track?.kind === "video") {
        setRemoteCameraMuted(true);
      }
    };

    const onTrackUnmuted = (publication: unknown) => {
      const cast = publication as TrackPublicationLike | undefined;
      if (cast?.kind === "video" || cast?.track?.kind === "video") {
        setRemoteCameraMuted(false);
      }
    };

    const onTrackPublished = (publication: unknown) => {
      const cast = publication as TrackPublicationLike | undefined;
      if (cast?.kind === "video" || cast?.track?.kind === "video") {
        setRemoteCameraMuted(false);
      }
    };

    const onTrackUnpublished = (publication: unknown) => {
      const cast = publication as TrackPublicationLike | undefined;
      if (cast?.kind === "video" || cast?.track?.kind === "video") {
        setRemoteCameraMuted(true);
      }
    };

    room.on("participantConnected", onParticipantConnected);
    room.on("participantDisconnected", onParticipantDisconnected);
    room.on("trackMuted", onTrackMuted);
    room.on("trackUnmuted", onTrackUnmuted);
    room.on("trackPublished", onTrackPublished);
    room.on("trackUnpublished", onTrackUnpublished);

    sync();

    return () => {
      if (room.off) {
        room.off("participantConnected", onParticipantConnected);
        room.off("participantDisconnected", onParticipantDisconnected);
        room.off("trackMuted", onTrackMuted);
        room.off("trackUnmuted", onTrackUnmuted);
        room.off("trackPublished", onTrackPublished);
        room.off("trackUnpublished", onTrackUnpublished);
      } else if (room.removeListener) {
        room.removeListener("participantConnected", onParticipantConnected);
        room.removeListener("participantDisconnected", onParticipantDisconnected);
        room.removeListener("trackMuted", onTrackMuted);
        room.removeListener("trackUnmuted", onTrackUnmuted);
        room.removeListener("trackPublished", onTrackPublished);
        room.removeListener("trackUnpublished", onTrackUnpublished);
      }
    };
  }, [connected, roomRef]);

  const remotePeerIdentity = useMemo(() => {
    return participants.length > 0 ? participants[0].identity : null;
  }, [participants]);

  return {
    participants,
    remotePeerIdentity,
    remoteCameraMuted,
  };
}
