import { useCallback } from "react";
import { useAIAgent as useAIAgentFeature } from "@/pages/videochat/features";

export function useAIAgent() {
  const {
    agentActive,
    agentLoading,
    agentError,
    agentMessage,
    isStreaming,
    startForRoom,
    stopForRoom,
  } = useAIAgentFeature();

  return {
    isActive: agentActive,
    isLoading: agentLoading,
    error: agentError,
    message: agentMessage,
    isStreaming,
    startForRoom,
    stopForRoom,
  };
}
