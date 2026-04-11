export type WhiteboardTool =
    | "select"
    | "pan"
    | "pen"
    | "highlighter"
    | "eraser"
    | "line"
    | "arrow"
    | "rectangle"
    | "circle"
    | "diamond"
    | "triangle"
    | "text"
    | "sticky"
    | "laser";

export interface WhiteboardPoint {
    x: number;
    y: number;
}

export interface DrawElement {
    id: string;
    tool: WhiteboardTool;
    points: WhiteboardPoint[];
    color: string;
    strokeWidth: number;
    opacity: number;
    fill: string;
    text?: string;
    /** For shapes: the bounding box */
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    /** Laser pointer fades out */
    createdAt?: number;
}

export interface WhiteboardOverlayProps {
    sendData: (data: object) => void;
    onClose: () => void;
    localStream?: MediaStream | null;
    remoteStream?: MediaStream | null;
    /** Pass the page-level remote <video> ref so we can poll its srcObject */
    pageRemoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
}
