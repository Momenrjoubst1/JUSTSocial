export interface WatchVideoResult {
    videoId: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration: number;
}

export interface WatchSyncMessage {
    type?: string;
    action: 'play' | 'pause' | 'seek' | 'watch';
    time?: number;
    videoId?: string;
}

export interface WatchModeOverlayProps {
    sendData: (data: WatchSyncMessage) => void;
    localStream: MediaStream | null;
    remoteVideoSrcObject: MediaStream | MediaSource | null;
    onClose: () => void;
    externalVideoId?: string | null;
    pageRemoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
    pageLocalVideoRef?: React.RefObject<HTMLVideoElement | null>;
    localCameraMuted?: boolean;
    remoteCameraMuted?: boolean;
    /** Incoming sync message from peer */
    syncMessage?: WatchSyncMessage | null;
}
