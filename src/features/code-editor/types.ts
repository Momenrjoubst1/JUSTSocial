export interface EnhancedIDEProps {
    userEmail?: string;
    onClose: () => void;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
}

export type IDEMode = 'single' | 'dual';
export type LayoutMode = 'horizontal' | 'stacked';
