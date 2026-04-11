import React from "react";

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
      <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col items-center text-center">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white font-semibold text-sm">الذكاء الاصطناعي (Sigma)</span>
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

        {message && <p className="text-white text-sm md:text-base leading-relaxed">{message}</p>}

        <button
          onClick={onStop}
          className="mt-4 pointer-events-auto bg-red-500/20 hover:bg-red-500/80 border border-red-500/50 text-red-100 hover:text-white text-xs px-4 py-1.5 rounded-full"
        >
          إيقاف المحادثة
        </button>
      </div>
    </div>
  );
}
