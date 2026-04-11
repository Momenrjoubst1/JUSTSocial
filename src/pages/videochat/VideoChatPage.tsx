/**
 * التصنيف (Classification):
 * أ) منطق WebRTC/Livekit/Video الجوهري: useVideoPageState, VideoCore, ControlBar, StatusBar.
 * ب) منطق الشطرنج: useChessGame (hook), ChessWidget (JSX).
 * ج) منطق IDE/Code Editor: useCodeEditor (inside Core currently).
 * د) منطق AI Agent: useAIAgent (hook), AIAgentWidget (JSX).
 * هـ) State مشترك: الحالات الأساسية (userName), نظام Moderation، وواجهة sendData.
 */

import React from "react";
import type { VideoChatPageProps } from "@/pages/videochat/core";
import { VideoCore, ChessWidget, AIAgentWidget } from "./components";
import { useVideoPageState, useChessGame, useAIAgent } from "./hooks";

export default function VideoChatPage(props: VideoChatPageProps) {
  // 1. Core Video Hook (with multicast data listener)
  const video = useVideoPageState({
    ...props,
    onExtraDataReceived: (raw) => {
      chess.handleChessMessage(raw);
    },
  });

  // 2. AI Hook
  const ai = useAIAgent();

  // 3. Chess Hook
  const chess = useChessGame((data) => video.sendData(data));

  return (
    <>
      <VideoCore {...video} chess={chess} ai={ai} />
      
      {/* Chess Widget Component */}
      <ChessWidget
        {...chess}
        onClose={chess.closeChess}
        onMove={chess.sendMove}
        localStream={video.localStreamRef.current}
        remoteStream={(video.remoteVideoRef.current?.srcObject as MediaStream) ?? null}
      />

      {/* AI Agent Widget Component */}
      <AIAgentWidget
        {...ai}
        message={ai.agentMessage}
        onStop={() => {
          void ai.stopForRoom(video.roomRef.current?.name);
        }}
      />
    </>
  );
}
