import { useCallback, useState } from "react";

export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
}

export interface UseChessGameReturn {
  isActive: boolean;
  peerMove: ChessMove | null;
  isWhite: boolean;
  openChess: () => void;
  sendMove: (move: ChessMove) => void;
  receiveOpen: () => void;
  receiveMove: (move: ChessMove) => void;
  reset: () => void;
  closeChess: () => void;
}

export function useChessGame(sendData: (data: object) => void): UseChessGameReturn {
  const [isChessMode, setIsChessMode] = useState(false);
  const [chessPeerMove, setChessPeerMove] = useState<ChessMove | null>(null);
  const [isWhiteChessPlayer, setIsWhiteChessPlayer] = useState(true);

  const openChess = useCallback(() => {
    setIsChessMode(true);
    setIsWhiteChessPlayer(true);
    sendData({ type: "chess-open" });
  }, [sendData]);

  const sendMove = useCallback(
    (move: ChessMove) => {
      sendData({ type: "chess-move", move });
    },
    [sendData],
  );

  const receiveOpen = useCallback(() => {
    setIsChessMode(true);
    setIsWhiteChessPlayer(false);
  }, []);

  const receiveMove = useCallback((move: ChessMove) => {
    setChessPeerMove(move);
  }, []);

  const reset = useCallback(() => {
    setIsChessMode(false);
    setChessPeerMove(null);
    setIsWhiteChessPlayer(true);
  }, []);

  const closeChess = useCallback(() => {
    setIsChessMode(false);
  }, []);

  return {
    isActive: isChessMode,
    peerMove: chessPeerMove,
    isWhite: isWhiteChessPlayer,
    openChess,
    sendMove,
    receiveOpen,
    receiveMove,
    reset,
    closeChess,
  };
}
