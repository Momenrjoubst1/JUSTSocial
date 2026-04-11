import { useCallback, useMemo } from "react";
import { useChessGame as useChessFeature, type ChessMove } from "@/pages/videochat/features";

export function useChessGame(sendData: (data: any) => void) {
  const {
    isActive,
    peerMove,
    isWhite,
    sendMove,
    openChess,
    receiveOpen,
    receiveMove,
    reset,
    closeChess,
  } = useChessFeature(sendData);

  const handleChessMessage = useCallback((raw: any) => {
    if (raw.type === "chess-open") {
      receiveOpen();
      return true;
    }
    if (raw.type === "chess-move") {
      if (raw.move && typeof raw.move.from === "string") {
        receiveMove(raw.move as ChessMove);
      }
      return true;
    }
    return false;
  }, [receiveOpen, receiveMove]);

  return {
    isActive,
    peerMove,
    isWhite,
    sendMove,
    openChess,
    closeChess,
    reset,
    handleChessMessage,
  };
}
