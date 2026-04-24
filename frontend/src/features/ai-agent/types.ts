export interface AgentStreamData {
    done?: boolean;
    text?: string;
}

export type AgentMessage =
    | { type: "ai_token"; text: string; stream_id?: string }
    | { type: "ai_done"; stream_id?: string }
    | { type: "user_msg_stream"; text: string; is_final: boolean; stream_id?: string }
    | { type: "user_msg"; text: string }
    | { type: "interrupt"; reason?: "user_speaking" | "new_prompt" | "skip" }
    | { type: "tts_start"; text?: string; stream_id?: string }
    | { type: "tts_end"; stream_id?: string }
    | { type: "audio_start" }
    | { type: "audio_end" }
    | { type: "error"; message: string; code?: string };

export function isAgentMessage(obj: unknown): obj is AgentMessage {
    if (!obj || typeof obj !== "object") return false;
    const msg = obj as { type?: string };
    return msg.type === "ai_token" ||
           msg.type === "ai_done" ||
           msg.type === "user_msg_stream" ||
           msg.type === "user_msg" ||
           msg.type === "interrupt" ||
           msg.type === "tts_start" ||
           msg.type === "tts_end" ||
           msg.type === "audio_start" ||
           msg.type === "audio_end" ||
           msg.type === "error";
}

export interface UseAIAgentReturn {
    agentActive: boolean;
    agentLoading: boolean;
    agentError: string | null;
    agentMessage: string;
    isStreaming: boolean;
    startAgent: (roomName: string, context?: Record<string, any>) => Promise<void>;
    stopAgent: (roomName: string) => Promise<void>;
    checkAgentStatus: (roomName: string) => Promise<void>;
}
