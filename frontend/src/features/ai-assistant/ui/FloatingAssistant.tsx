"use client";

import { BotIcon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export const FloatingAssistant = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show the button if we're already on the assistant page
  if (location.pathname === "/assistant") return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/assistant")}
      className="fixed right-4 bottom-4 z-[9999] flex size-13 items-center justify-center rounded-full border border-white/10 bg-[#0b0b0b] text-white shadow-[0_18px_48px_rgba(0,0,0,0.45)] backdrop-blur transition-all duration-300 hover:scale-105 hover:bg-[#151515] active:scale-95"
      aria-label="Open Assistant"
    >
      <BotIcon className="size-6" />
    </button>
  );
};
