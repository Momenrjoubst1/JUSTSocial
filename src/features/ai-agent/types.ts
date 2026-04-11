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
    startAgent: (roomName: string) => Promise<void>;
    stopAgent: (roomName: string) => Promise<void>;
}
