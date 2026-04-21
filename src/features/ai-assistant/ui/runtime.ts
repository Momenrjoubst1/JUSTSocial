"use client";

import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";

export const useRuntime = () =>
  useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });