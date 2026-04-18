import { useCallback, useEffect } from "react";
import { useAIAgent as useSharedAIAgent } from "@/features/ai-agent";

const aiStartSound = new Audio('/assets/sounds/agent-start.wav');
aiStartSound.volume = 0.5; // Normal volume

export interface UseVideoPageAIAgentReturn {
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  message: string;
  isStreaming: boolean;
  startForRoom: (roomName: string | null | undefined) => Promise<void>;
  stopForRoom: (roomName: string | null | undefined) => Promise<void>;
  syncStatus: (roomName: string | null | undefined) => Promise<void>;
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
    checkAgentStatus,
  } = useSharedAIAgent();

  // Play sound when agent becomes active (to indicate it has started properly)
  useEffect(() => {
    if (agentActive) {
      aiStartSound.currentTime = 0;
      aiStartSound.play().catch(e => console.error("Audio playback error:", e));
    }
  }, [agentActive]);

  const syncStatus = useCallback(
    async (roomName: string | null | undefined) => {
        if (roomName) await checkAgentStatus(roomName);
    },
    [checkAgentStatus]
  );

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
    isActive: agentActive,
    isLoading: agentLoading,
    error: agentError,
    message: agentMessage,
    isStreaming,
    startForRoom,
    stopForRoom,
    syncStatus,
  };
}
