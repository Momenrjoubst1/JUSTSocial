import React, { lazy, Suspense } from "react";
import type { ChessMove } from "@/pages/videochat/features";

const ChessGame = lazy(() => import("@/features/chess").then((module) => ({ default: module.ChessGame })));

export interface ChessWidgetProps {
  isActive: boolean;
  isWhite: boolean;
  peerMove: ChessMove | null;
  onClose: () => void;
  onMove: (move: ChessMove) => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

export function ChessWidget({
  isActive,
  isWhite,
  peerMove,
  onClose,
  onMove,
  localStream,
  remoteStream,
}: ChessWidgetProps) {
  if (!isActive) return null;

  return (
    <Suspense fallback={null}>
      <ChessGame
        isWhite={isWhite}
        peerMove={peerMove}
        onClose={onClose}
        onMove={onMove}
        localStream={localStream}
        remoteStream={remoteStream}
      />
    </Suspense>
  );
}
