import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { assistantFetch } from "../utils/authFetch";

export interface ChatThread {
  id: string;
  title: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "data";
  content: string;
  is_pinned: boolean;
  created_at: string;
}

interface ChatHistoryContextType {
  threads: ChatThread[];
  activeThreadId: string | null;
  setActiveThreadId: (id: string | null) => void;
  isLoadingThreads: boolean;
  activeThreadMessages: ChatMessage[];
  isLoadingMessages: boolean;
  refreshThreads: () => void;
  createNewThread: () => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextType | undefined>(undefined);

export const ChatHistoryProvider = ({ children }: { children: ReactNode }) => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThreadMessages, setActiveThreadMessages] = useState<ChatMessage[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3004";

  const fetchThreads = async () => {
    setIsLoadingThreads(true);
    try {
      const res = await assistantFetch(`${backendUrl}/api/chat/threads`);
      if (res.ok) {
        const data = await res.json();
        setThreads(data);
      } else if (res.status === 401) {
        setThreads([]);
      }
    } catch (err) {
      console.error("Failed to fetch threads", err);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const fetchMessages = async (threadId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await assistantFetch(`${backendUrl}/api/chat/threads/${threadId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveThreadMessages(data);
      } else if (res.status === 401) {
        setActiveThreadMessages([]);
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchThreads();
      if (activeThreadId) {
        fetchMessages(activeThreadId);
      }
    });

    return () => subscription.unsubscribe();
  }, [activeThreadId]);

  useEffect(() => {
    if (activeThreadId) {
      fetchMessages(activeThreadId);
    } else {
      setActiveThreadMessages([]);
    }
  }, [activeThreadId]);

  const createNewThread = () => {
    setActiveThreadId(null);
    setActiveThreadMessages([]);
    // We don't need to post anything yet, backend creates it on first message
  };

  return (
    <ChatHistoryContext.Provider
      value={{
        threads,
        activeThreadId,
        setActiveThreadId,
        isLoadingThreads,
        activeThreadMessages,
        isLoadingMessages,
        refreshThreads: fetchThreads,
        createNewThread,
      }}
    >
      {children}
    </ChatHistoryContext.Provider>
  );
};

export const useChatHistory = () => {
  const ctx = useContext(ChatHistoryContext);
  if (!ctx) throw new Error("useChatHistory must be used within ChatHistoryProvider");
  return ctx;
};
