import type { VideoChatPageProps } from "@/pages/videochat/core";
import { VideoCore, ChessWidget } from "./components";
import { useVideoChatPageController } from "./hooks/useVideoChatPageController";

export default function VideoChatPage(props: VideoChatPageProps) {
  const { ai, aiBubbles, chess, userBubbles, video } =
    useVideoChatPageController(props);

  return (
    <>
      <VideoCore
        {...video}
        chess={chess}
        ai={{ ...ai, isStreaming: aiBubbles.some((bubble) => !bubble.done) }}
        aiBubbles={aiBubbles}
        userBubbles={userBubbles}
      />

      <ChessWidget
        {...chess}
        onClose={chess.closeChess}
        onMove={chess.sendMove}
        localStream={video.localStreamRef.current}
        remoteStream={(video.remoteVideoRef.current?.srcObject as MediaStream) ?? null}
      />
    </>
  );
}
