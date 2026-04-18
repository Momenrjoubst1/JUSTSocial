import React, { memo } from "react";

type AgentBubble = {
  id: string;
  text: string;
  done?: boolean;
  createdAt?: number;
};

type SpeechBubble = {
  id: string;
  text: string;
  done: boolean;
  createdAt?: number;
};

interface AgentConversationOverlayProps {
  aiActive?: boolean;
  connected: boolean;
  aiBubbles: AgentBubble[];
  userBubbles?: SpeechBubble[];
  localLabel: string;
  agentLabel?: string;
  audioMuted?: boolean;
  sendData?: (data: object) => void;
}

const MAX_LOCAL_BUBBLES = 50;

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const TypewriterText = memo(function TypewriterText({
  text,
  speedMs,
}: {
  text: string;
  speedMs: number;
}) {
  const [visible, setVisible] = React.useState("");
  const targetTextRef = React.useRef("");

  React.useEffect(() => {
    targetTextRef.current = text;
    setVisible((prev) => {
      if (!text) return "";
      if (text.startsWith(prev)) return prev;
      return text;
    });
  }, [text]);

  React.useEffect(() => {
    if (visible.length >= targetTextRef.current.length) return;

    const timer = window.setTimeout(() => {
      setVisible((prev) => {
        const target = targetTextRef.current;
        if (!target.startsWith(prev)) return target;
        const nextLength = Math.min(target.length, prev.length + 1);
        return target.slice(0, nextLength);
      });
    }, speedMs);

    return () => window.clearTimeout(timer);
  }, [visible, speedMs]);

  return <>{visible}</>;
});

export const AgentConversationOverlay = memo(function AgentConversationOverlay({
  aiActive,
  connected,
  aiBubbles,
  userBubbles = [],
  localLabel,
  agentLabel = "Sigma",
  audioMuted = false,
  sendData,
}: AgentConversationOverlayProps) {
  // ── Browser Speech Recognition (primary input for user speech) ──────────
  const [localSpeechBubbles, setLocalSpeechBubbles] = React.useState<SpeechBubble[]>([]);
  const displayLocalBubbles = localSpeechBubbles.length > 0 ? localSpeechBubbles : userBubbles;
  const recognitionRef = React.useRef<any>(null);
  const activeRef = React.useRef(false);
  const sendDataRef = React.useRef(sendData);
  React.useEffect(() => { sendDataRef.current = sendData; });

  React.useEffect(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    if (!aiActive || !connected || audioMuted) {
      activeRef.current = false;
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { console.warn("[AgentOverlay] SpeechRecognition not supported"); return; }

    activeRef.current = true;
    let streamId = createId("speech");
    const recognition = new SR();
    recognition.lang = "ar";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;
      const sid = streamId;
      setLocalSpeechBubbles((prev) => {
        const idx = prev.findIndex((b) => b.id === sid);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], text: transcript, done: isFinal };
          return next;
        }
        return [...prev.slice(-(MAX_LOCAL_BUBBLES - 1)), { id: sid, text: transcript, done: isFinal, createdAt: Date.now() }];
      });
      if (isFinal && transcript.trim()) {
        sendDataRef.current?.({ type: "ai_prompt", text: transcript.trim() });
        streamId = createId("speech");
      }
    };
    recognition.onerror = (e: any) => {
      if (e.error !== "aborted" && e.error !== "no-speech") console.warn("[Speech]", e.error);
    };
    recognition.onend = () => {
      if (activeRef.current) setTimeout(() => {
        if (activeRef.current) try { recognition.start(); } catch {}
      }, 300);
    };
    try { recognition.start(); recognitionRef.current = recognition; } catch {}
    return () => { activeRef.current = false; try { recognition.abort(); } catch {}; recognitionRef.current = null; };
  }, [aiActive, connected, audioMuted]);

  // No auto-clearing logic anymore so user can scroll back.
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const animationFrameRef = React.useRef<number>(0);

  const prevAiActiveRef = React.useRef(false);
  React.useEffect(() => {
    prevAiActiveRef.current = !!aiActive;
  }, [aiActive, connected]);


  React.useEffect(() => {
    if (!aiActive || !connected || audioMuted) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.2; // لجعل الاستجابة أسرع وأوضح بكثير للصوت

        const microphone = audioCtx.createMediaStreamSource(stream);
        microphone.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          let peak = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
            if (dataArray[i] > peak) peak = dataArray[i];
          }
          const average = sum / dataArray.length;
          // دمج المتوسط المرتفع والقمة العالية ليعطي تفاعل قوي جدًا مثل موج البحر
          const combined = (average * 0.4 + peak * 0.6) / 80;
          const normalized = Math.min(1, Math.max(0, Math.pow(combined, 1.4)));

          if (overlayRef.current) {
            overlayRef.current.style.setProperty("--mic-volume", normalized.toFixed(3));
          }

          animationFrameRef.current = requestAnimationFrame(updateVolume);
        };

        updateVolume();
      }).catch((err) => {
        console.warn("Could not get mic for volume overlay:", err);
      });
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [aiActive, connected, audioMuted]);

  // Merge and sort bubbles
  const combinedBubbles = React.useMemo(() => {
    const all = [
      ...displayLocalBubbles.map((b) => ({ ...b, isLocal: true, time: b.createdAt || 0 })),
      ...aiBubbles.map((b) => ({ ...b, isLocal: false, time: b.createdAt || 0 })),
    ].sort((a, b) => a.time - b.time);
    return all.slice(-50);
  }, [displayLocalBubbles, aiBubbles]);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [combinedBubbles]);

  if (combinedBubbles.length === 0 || !aiActive) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      style={{
        position: "absolute",
        inset: "70px 10px 150px 10px",
        zIndex: 14,
        pointerEvents: "none",
        overflow: "hidden", // Bounds for the mic volume shadow effect
      }}
    >
      <div 
         ref={scrollContainerRef}
         style={{
           position: "absolute",
           inset: 0,
           display: "flex",
           flexDirection: "column",
           gap: 16,
           padding: "0 8px 20px 8px",
           overflowY: "auto",
           pointerEvents: "auto", // Allow user to scroll
           scrollbarWidth: "none",
           msOverflowStyle: "none",
         }}
      >
        {combinedBubbles.map((bubble, index) => {
          const isLocal = bubble.isLocal;
          const align = isLocal ? "flex-end" : "flex-start";
          const textAlign = isLocal ? "right" : "left";
          const label = isLocal ? localLabel : agentLabel;
          const animClass = isLocal ? "bubble-slide-from-right" : "bubble-slide-from-left";

          return (
            <div key={bubble.id} style={{ display: "flex", flexDirection: "column", alignItems: align, width: "100%" }}>
              <div
                style={{
                  maxWidth: "85%",
                  padding: "10px 16px 11px",
                  borderRadius: 16,
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "linear-gradient(135deg, rgba(0,0,0,0.55), rgba(15,15,15,0.7))",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  boxShadow: bubble.done
                    ? "0 4px 20px rgba(2, 6, 23, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)"
                    : isLocal 
                      ? `0 4px 20px rgba(2, 6, 23, 0.3),
                         inset 0 1px 0 rgba(255, 255, 255, calc(0.15 + 0.4 * var(--mic-volume, 0))),
                         inset 0 0 calc(40px * var(--mic-volume, 0)) rgba(255, 255, 255, calc(0.4 * var(--mic-volume, 0))),
                         0 0 calc(90px * var(--mic-volume, 0)) calc(15px * var(--mic-volume, 0)) rgba(200, 200, 200, calc(0.3 * var(--mic-volume, 0))),
                         0 0 calc(140px * var(--mic-volume, 0)) calc(25px * var(--mic-volume, 0)) rgba(255, 255, 255, calc(0.15 * var(--mic-volume, 0)))`
                      : "0 4px 20px rgba(2, 6, 23, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                  transition: "box-shadow 0.08s ease-out",
                  animation: `${animClass} 300ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
                }}
              >
                <div
                  style={{
                    marginBottom: 4,
                    fontSize: 10,
                    color: "rgba(255, 255, 255, 0.85)",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    textAlign,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.42,
                    color: "rgba(255, 255, 255, 0.95)",
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                    textAlign,
                  }}
                >
                  {!isLocal ? (
                    <TypewriterText text={bubble.text || ""} speedMs={12} />
                  ) : (
                    bubble.text
                  )}
                  {!bubble.done && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 5,
                        height: 14,
                        marginLeft: 3,
                        borderRadius: 3,
                        background: "rgba(255, 255, 255, 0.85)",
                        verticalAlign: "text-bottom",
                        animation: "ai-cursor-blink 0.8s infinite",
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
