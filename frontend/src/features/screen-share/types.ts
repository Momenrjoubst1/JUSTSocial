export interface UseScreenShareReturn {
    isScreenSharing: boolean;
    handleScreenShare: () => Promise<void>;
    /** Call on exit to clean up screen stream */
    cleanupScreenShare: () => void;
    screenStreamRef: React.MutableRefObject<MediaStream | null>;
}
