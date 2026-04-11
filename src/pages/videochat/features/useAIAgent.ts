import { useCallback } from "react";
import { useAIAgent as useSharedAIAgent } from "@/features/ai-agent";

export interface UseVideoPageAIAgentReturn {
  agentActive: boolean;
  agentLoading: boolean;
  agentError: string | null;
  agentMessage: string;
  isStreaming: boolean;
  startForRoom: (roomName: string | null | undefined) => Promise<void>;
  stopForRoom: (roomName: string | null | undefined) => Promise<void>;
}

export function useAIAgent(): UseVideoPageAIAgentReturn {
  const {
    agentActive,
    agentLoading,
    agentError,
    agentMessage,
    isStreaming,
    startAgent,
    stopAgent,
  } = useSharedAIAgent();

  const startForRoom = useCallback(
    async (roomName: string | null | undefined) => {
          try {

                if (!roomName) {
                  return;
                }
                await startAgent(roomName);
              
          } catch (error) {
            console.error('[useAIAgent.ts] [anonymous_function]:', error);
          }
      },
    [startAgent],
  );

  const stopForRoom = useCallback(
    async (roomName: string | null | undefined) => {
          try {

                if (!roomName) {
                  return;
                }
                await stopAgent(roomName);
              
          } catch (error) {
            console.error('[useAIAgent.ts] [anonymous_function]:', error);
          }
      },
    [stopAgent],
  );

  return {
    agentActive,
    agentLoading,
    agentError,
    agentMessage,
    isStreaming,
    startForRoom,
    stopForRoom,
  };
}
