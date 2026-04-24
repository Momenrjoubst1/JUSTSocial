import { useEffect, useRef, useState } from "react";
import { loadElevenLabsTTS } from "@/services/elevenlabs-tts.loader";
import { useAIAgent, useChessGame, useVideoPageState } from "@/pages/videochat/hooks";
import type { VideoChatPageProps } from "@/pages/videochat/core";

type Bubble = {
  id: string;
  text: string;
  done?: boolean;
  createdAt?: number;
};

type UserBubble = {
  id: string;
  text: string;
  done: boolean;
  createdAt?: number;
};

function isAgentStream(raw: any) {
  return typeof raw?.type === "string" && (raw.type.startsWith("ai_") || raw.type.startsWith("user_"));
}

export function useVideoChatPageController(props: VideoChatPageProps) {
  const [aiBubbles, setAiBubbles] = useState<Bubble[]>([]);
  const [userBubbles, setUserBubbles] = useState<UserBubble[]>([]);
  const spokenBubblesRef = useRef<Set<string>>(new Set());

  const ai = useAIAgent();

  useEffect(() => {
    if (!ai.isActive) {
      spokenBubblesRef.current.clear();
    }
  }, [ai.isActive]);

  useEffect(() => {
    if (props.roomName) {
      ai.syncStatus(props.roomName);
    }
  }, [ai, props.roomName]);

  const chess = useChessGame((data) => video.sendData(data));

  const video = useVideoPageState({
    ...props,
    aiActive: ai.isActive,
    onExtraDataReceived: (raw) => {
      if (isAgentStream(raw)) {
        console.log(`[Agent Data] ${raw.type}:`, raw);
      }

      if (raw.type === "ai_token") {
        const streamId = raw.stream_id || "ai_stream";
        const text = raw.text || "";

        setAiBubbles((prev) => {
          const index = prev.findIndex((bubble) => bubble.id === streamId);
          if (index === -1) {
            return [...prev, { id: streamId, text, done: false, createdAt: Date.now() }].slice(-50);
          }

          const updated = [...prev];
          updated[index] = { ...updated[index], text: updated[index].text + text };
          return updated;
        });
        return;
      }

      if (raw.type === "ai_done") {
        const streamId = raw.stream_id || "ai_stream";

        setAiBubbles((prev) => {
          const index = prev.findIndex((bubble) => bubble.id === streamId);
          if (index === -1) {
            return prev;
          }

          const updated = [...prev];
          updated[index] = { ...updated[index], done: true };

          const bubble = updated[index];
          if (bubble.text && !spokenBubblesRef.current.has(streamId)) {
            spokenBubblesRef.current.add(streamId);
            loadElevenLabsTTS()
              .then((tts) => tts.speak(bubble.text))
              .catch((error) => console.error("[TTS] Speech failed:", error));
          }

          return updated;
        });
        return;
        }

        if (raw.type === "ai_cancelled") {
          const streamId = raw.stream_id || "ai_stream";

          setAiBubbles((prev) => {
            const index = prev.findIndex((bubble) => bubble.id === streamId);
            if (index === -1) {
              return prev;
            }

            const updated = [...prev];
            updated[index] = { ...updated[index], done: true };
            return updated;
          });
          return;
        }

        if (raw.type === "user_partial") {
        const streamId = "user_live";
        const text = raw.text || "";

        setUserBubbles((prev) => {
          const index = prev.findIndex((bubble) => bubble.id === streamId);
          if (index === -1) {
            return [...prev, { id: streamId, text, done: false, createdAt: Date.now() }].slice(-50);
          }

          const updated = [...prev];
          updated[index] = { ...updated[index], text };
          return updated;
        });
        return;
      }

      if (raw.type === "user_final") {
        const streamId = "user_live";
        const text = raw.text || "";

        setUserBubbles((prev) => {
          const index = prev.findIndex((bubble) => bubble.id === streamId);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = { ...updated[index], text, done: true };
            return updated;
          }

          return [...prev, { id: streamId, text, done: true, createdAt: Date.now() }].slice(-50);
        });
        return;
      }

      if (raw.type === "user_msg_stream") {
        const streamId = raw.stream_id || "user_live";
        const text = raw.text || "";
        const isFinal = raw.is_final;

        setUserBubbles((prev) => {
          const index = prev.findIndex((bubble) => bubble.id === streamId);

          if (isFinal) {
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = { ...updated[index], text, done: true };
              return updated;
            }
            return [...prev, { id: streamId, text, done: true, createdAt: Date.now() }].slice(-50);
          }

          if (index === -1) {
            return [...prev, { id: streamId, text, done: false, createdAt: Date.now() }].slice(-50);
          }

          const updated = [...prev];
          updated[index] = { ...updated[index], text };
          return updated;
        });
        return;
      }

      if (raw.type === "user_msg") {
        return;
      }

      if (raw.type === "ai_msg" || raw.type === "ai_msg_stream") {
        console.warn("⚠️ Received legacy AI protocol (ai_msg/ai_msg_stream), update backend to use ai_token/ai_done");
        return;
      }

      chess.handleChessMessage(raw);
    },
  });

  return {
    ai,
    aiBubbles,
    chess,
    userBubbles,
    video,
  };
}
