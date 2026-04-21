"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shadcn } from "./shadcn/Shadcn";
import { useRuntime } from "./ui/runtime";

export const AssistantApp = () => {
  const runtime = useRuntime();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AssistantRuntimeProvider runtime={runtime}>
        <TooltipProvider>
          <Shadcn />
        </TooltipProvider>
      </AssistantRuntimeProvider>
    </div>
  );
};
