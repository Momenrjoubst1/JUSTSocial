"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useRuntime } from "./runtime";
import { AssistantModal } from "./assistant-modal";

export const FloatingAssistant = () => {
  const runtime = useRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <TooltipProvider>
        <AssistantModal />
      </TooltipProvider>
    </AssistantRuntimeProvider>
  );
};
