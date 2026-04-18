export interface AgentStreamData {
    done?: boolean;
    text?: string;
}

export interface UseAIAgentReturn {
    agentActive: boolean;
    agentLoading: boolean;
    agentError: string | null;
    agentMessage: string;
    isStreaming: boolean;
    setIsStreaming: (streaming: boolean) => void;
    startAgent: (roomName: string, context?: Record<string, any>) => Promise<void>;
    stopAgent: (roomName: string) => Promise<void>;
    checkAgentStatus: (roomName: string) => Promise<void>;
}
