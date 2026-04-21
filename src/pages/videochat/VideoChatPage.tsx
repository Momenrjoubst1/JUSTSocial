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
import { elevenLabsTTS } from "@/services/elevenlabs-tts";

export default function VideoChatPage(props: VideoChatPageProps) {
  const [aiBubbles, setAiBubbles] = React.useState<{id: string; text: string; done?: boolean; createdAt?: number}[]>([]);
  const [userBubbles, setUserBubbles] = React.useState<{id: string; text: string; done: boolean; createdAt?: number}[]>([]);

  // Track which AI bubbles have already been spoken to avoid duplicates
  const spokenBubblesRef = React.useRef<Set<string>>(new Set());

  // 2. AI Hook (Defined first so we can use its state in Video Hook)
  const ai = useAIAgent();

  // Stop TTS only if explicitly needed, but let existing audio finish
  React.useEffect(() => {
    if (!ai.isActive) {
      // We no longer call elevenLabsTTS.stop() here so last messages can finish
      spokenBubblesRef.current.clear();
    }
  }, [ai.isActive]);

  // Sync agent status with backend on mount or when roomName changes
  React.useEffect(() => {
    if (props.roomName) {
      ai.syncStatus(props.roomName);
    }
  }, [props.roomName, ai.syncStatus]);

  // 1. Core Video Hook (with multicast data listener)
  const video = useVideoPageState({
    ...props,
    aiActive: ai.isActive,
    onExtraDataReceived: (raw) => {
      // Log all incoming messages for debugging
      if (raw.type && raw.type.startsWith("ai_") || raw.type.startsWith("user_")) {
        console.log(`[Agent Data] ${raw.type}:`, raw);
      }
      
      // Handle new protocol messages: ai_token, ai_done
      if (raw.type === "ai_token") {
        const streamId = raw.stream_id || "ai_stream";
        const text = raw.text || "";

        setAiBubbles((prev) => {
          const index = prev.findIndex((b) => b.id === streamId);
          if (index === -1) {
            // New bubble - create it
            return [...prev, { id: streamId, text: text, done: false, createdAt: Date.now() }].slice(-50);
          } else {
            // Append token to existing bubble
            const updated = [...prev];
            updated[index] = { ...updated[index], text: updated[index].text + text };
            return updated;
          }
        });
      } else if (raw.type === "ai_done") {
        const streamId = raw.stream_id || "ai_stream";

        setAiBubbles((prev) => {
          const index = prev.findIndex((b) => b.id === streamId);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = { ...updated[index], done: true };
            
            // 🔊 Speak the completed AI reply via ElevenLabs TTS
            const bubble = updated[index];
            if (bubble.text && !spokenBubblesRef.current.has(streamId)) {
              spokenBubblesRef.current.add(streamId);
              elevenLabsTTS.speak(bubble.text).catch((e) =>
                console.error("[TTS] Speech failed:", e)
              );
            }
            
            return updated;
          }
          return prev;
        });
      } else if (raw.type === "user_partial") {
        const text = raw.text || "";
        const streamId = "user_live";
        setUserBubbles((prev) => {
          const index = prev.findIndex((b) => b.id === streamId);
          if (index === -1) {
            return [...prev, { id: streamId, text, done: false, createdAt: Date.now() }].slice(-50);
          }
          const updated = [...prev];
          updated[index] = { ...updated[index], text };
          return updated;
        });
      } else if (raw.type === "user_final") {
        const text = raw.text || "";
        const streamId = "user_live";
        setUserBubbles((prev) => {
          const index = prev.findIndex((b) => b.id === streamId);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = { ...updated[index], text, done: true };
            return updated;
          }
          return [...prev, { id: streamId, text, done: true, createdAt: Date.now() }].slice(-50);
        });
      } else if (raw.type === "user_msg_stream") {
        const streamId = raw.stream_id || "user_live";
        const text = raw.text || "";
        const isFinal = raw.is_final;

        setUserBubbles((prev) => {
          const index = prev.findIndex((b) => b.id === streamId);
          if (isFinal) {
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = { ...updated[index], text, done: true };
              return updated;
            }
            return [...prev, { id: streamId, text: text, done: true, createdAt: Date.now() }].slice(-50);
          }
          
          if (index === -1) {
            return [...prev, { id: streamId, text: text, done: false, createdAt: Date.now() }].slice(-50);
          } else {
            const updated = [...prev];
            updated[index] = { ...updated[index], text: text };
            return updated;
          }
        });
      } else if (raw.type === "user_msg") {
        // Disabled: Rely on user_msg_stream is_final=true to prevent duplication
      } else if (raw.type === "ai_msg" || raw.type === "ai_msg_stream") {
        // Legacy protocol support - should not be used with new backend
        console.warn("⚠️ Received legacy AI protocol (ai_msg/ai_msg_stream), update backend to use ai_token/ai_done");
      } else {
        chess.handleChessMessage(raw);
      }
    },
  });

  // 3. Chess Hook
  const chess = useChessGame((data) => video.sendData(data));

  return (
    <>
      <VideoCore {...video} chess={chess} ai={{...ai, isStreaming: aiBubbles.some(b => !b.done)}} aiBubbles={aiBubbles} userBubbles={userBubbles} />

      {/* Chess Widget Component */}
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
