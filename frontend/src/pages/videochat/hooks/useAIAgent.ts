/**
 * Re-export useAIAgent from features layer.
 * The features hook now returns the final property names directly:
 * { isActive, isLoading, error, message, isStreaming, startForRoom, stopForRoom }
 */
export { useAIAgent } from "@/pages/videochat/features";
