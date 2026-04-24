"use client";

import { AssistantRuntimeProvider, Suggestions, useAui } from "@assistant-ui/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shadcn } from "./shadcn/Shadcn";
import { useRuntime } from "./ui/runtime";
import { useChatHistory, ChatHistoryProvider } from "./hooks/useChatHistory";

const WELCOME_SUGGESTIONS = [
  {
    title: "كيف أسجل المواد؟",
    label: "ساعدني في تنظيم جدولي الدراسي",
    prompt: "كيف يمكنني تسجيل المواد لهذا الفصل ومساعدتي في تنظيم جدولي؟",
  },
  {
    title: "عن جامعة JUST",
    label: "ما هي القوانين والأنظمة؟",
    prompt: "أخبرني عن أهم القوانين والأنظمة في جامعة العلوم والتكنولوجيا الأردنية",
  },
  {
    title: "مهارات التبادل",
    label: "كيف أجد شريكاً للتعلم؟",
    prompt: "كيف يمكنني استخدام منصة JUST Social لإيجاد شريك لتبادل المهارات؟",
  },
] as const;

const AssistantRuntimeShell = () => {
  const runtime = useRuntime();
  const aui = useAui({
    suggestions: Suggestions([...WELCOME_SUGGESTIONS]),
  });

  return (
    <div className="dark fixed inset-0 z-[100] flex flex-col bg-background text-foreground">
      <AssistantRuntimeProvider runtime={runtime} aui={aui}>
        <TooltipProvider>
          <Shadcn />
        </TooltipProvider>
      </AssistantRuntimeProvider>
    </div>
  );
};

const AssistantAppContent = () => {
  const { activeThreadId } = useChatHistory();

  return <AssistantRuntimeShell key={activeThreadId ?? "new-thread"} />;
};

export const AssistantApp = () => {
  return (
    <ChatHistoryProvider>
      <AssistantAppContent />
    </ChatHistoryProvider>
  );
};
