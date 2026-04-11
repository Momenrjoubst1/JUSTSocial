/**
 * ════════════════════════════════════════════════════════════════════════════════
 * useTextChat — Text messaging via LiveKit data channel
 *
 * Manages:
 *  - Message list state
 *  - Sending & receiving text messages
 *  - Toast-style notifications with auto-hide
 *  - Chat-history toggle
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef } from "react";
import { Message } from "@/pages/videochat/core/types";

/* ─── Hook Return ───────────────────────────────────────────────────────── */
export interface UseTextChatReturn {
  messages: (Message & { _id: number })[];
  messageInput: string;
  setMessageInput: (v: string) => void;
  visibleMsgIds: Set<number>;
  showChatHistory: boolean;
  setShowChatHistory: (v: boolean) => void;
  sendMessage: () => void;
  /** Call from the parent data-received dispatcher for type "msg" */
  handleIncomingMessage: (parsed: any) => void;
  /** Reset messages (e.g. when a new peer connects) */
  clearMessages: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

/* ─── Hook ──────────────────────────────────────────────────────────────── */
export function useTextChat(
  sendData: (data: object) => void,
): UseTextChatReturn {
  const [messages, setMessages] = useState<(Message & { _id: number })[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [visibleMsgIds, setVisibleMsgIds] = useState<Set<number>>(new Set());
  const [showChatHistory, setShowChatHistory] = useState(false);
  const msgIdCounter = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /* ── Flash a message bubble then auto-hide ──────────────────────────── */
  const flashNotification = useCallback((id: number) => {
    setVisibleMsgIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setVisibleMsgIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 3000);
  }, []);

  /* ── Send ────────────────────────────────────────────────────────────── */
  const sendMessage = useCallback(() => {
    if (!messageInput.trim()) return;

    const id = msgIdCounter.current++;
    const message: Message & { _id: number } = {
      sender: "local",
      text: messageInput,
      time: new Date(),
      _id: id,
    };

    sendData({ type: "msg", message });
    setMessages((prev) => [...prev, message]);
    setMessageInput("");
    flashNotification(id);
  }, [messageInput, sendData, flashNotification]);

  /* ── Receive ─────────────────────────────────────────────────────────── */
  const handleIncomingMessage = useCallback(
    (parsed: any) => {
      const id = msgIdCounter.current++;
      let msg: Message & { _id: number };
      if (parsed.type === "msg") {
        msg = { ...parsed.message, _id: id, sender: "remote" };
      } else {
        msg = { ...parsed, _id: id, sender: "remote" };
      }
      msg.time = new Date(msg.time);
      msg._id = id;

      setMessages((prev) => [...prev, msg]);
      flashNotification(id);
    },
    [flashNotification],
  );

  /* ── Clear (on new peer) ─────────────────────────────────────────────── */
  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    messages,
    messageInput,
    setMessageInput,
    visibleMsgIds,
    showChatHistory,
    setShowChatHistory,
    sendMessage,
    handleIncomingMessage,
    clearMessages,
    messagesEndRef,
  };
}
