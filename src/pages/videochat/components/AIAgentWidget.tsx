import React from "react";
import TextType from "@/components/ui/TextType";
import GlassSurface from "@/components/ui/GlassSurface";
import "./AIAgentWidget.css";

export interface AIAgentWidgetProps {
  isActive: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  message: string;
  onStop: () => void;
}

export function AIAgentWidget({
  isActive,
  isLoading,
  isStreaming,
  message,
  onStop,
}: AIAgentWidgetProps) {
  if (!isActive) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[30] w-full max-w-lg px-4 pointer-events-none">
      <GlassSurface
        width="100%"
        height="auto"
        borderRadius={24}
        displace={15}
        distortionScale={-150}
        redOffset={5}
        greenOffset={15}
        blueOffset={25}
        className="pointer-events-auto shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
      >
        <div className="ai-glass-panel p-4 flex flex-col items-center text-center w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white font-bold text-sm tracking-wide ai-glass-text-chromatic">الذكاء الاصطناعي (Sigma)</span>
            {isStreaming && (
              <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </div>

        {isLoading && !message && (
          <div className="flex space-x-1.5 items-center justify-center p-2" dir="ltr">
            <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}

        {message && (
          <TextType
            className="text-white font-medium text-sm md:text-base leading-relaxed tracking-wide mix-blend-screen drop-shadow-md"
            text={message}
            typingSpeed={50}
            loop={false}
            showCursor={isStreaming}
          />
        )}

        <button
          onClick={onStop}
          className="mt-4 pointer-events-auto bg-red-500/20 hover:bg-red-500/80 border border-red-500/50 text-red-100 hover:text-white text-xs px-4 py-1.5 rounded-full"
        >
          إيقاف المحادثة
        </button>
        </div>
      </GlassSurface>
    </div>
  );
}
