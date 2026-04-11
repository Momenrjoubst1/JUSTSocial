export type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export interface ChessPiece {
    type: PieceType;
    color: PieceColor;
}

export interface ChessMove {
    from: string;
    to: string;
    promotion?: string;
}

export interface ChessGameProps {
    onMove: (move: ChessMove) => void;
    peerMove: ChessMove | null;
    onClose: () => void;
    isWhite: boolean;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
}
