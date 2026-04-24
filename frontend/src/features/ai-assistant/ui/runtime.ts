"use client";

import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useMemo, useCallback } from "react";
import { useChatHistory } from "../hooks/useChatHistory";
import { supabase } from "@/lib/supabaseClient";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3004";

async function getToken() {
  let { data: { session } } = await supabase.auth.getSession();
  if (session?.expires_at && session.expires_at * 1000 < Date.now() + 60_000) {
    const { data } = await supabase.auth.refreshSession();
    session = data.session;
  }
  return session?.access_token ?? null;
}

export const useRuntime = () => {
  const { activeThreadId, activeThreadMessages } = useChatHistory();

  const customFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const token = await getToken();
      const headers = new Headers(init.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

      // Inject threadId into the body
      let body = init.body;
      if (typeof body === "string") {
        try {
          const parsed = JSON.parse(body);
          parsed.threadId = activeThreadId;
          body = JSON.stringify(parsed);
        } catch { /* keep original body */ }
      }

      let res = await fetch(input, { ...init, headers, body });

      // Auto-retry once on 401 with a refreshed token
      if (res.status === 401) {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data.session?.access_token) {
          headers.set("Authorization", `Bearer ${data.session.access_token}`);
          res = await fetch(input, { ...init, headers, body });
        }
      }

      return res;
    },
    [activeThreadId],
  );

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: `${BACKEND_URL}/api/chat`,
        fetch: customFetch,
      }),
    [customFetch],
  );

  return useChatRuntime({
    transport,
    messages: activeThreadMessages.map((message) => ({
      id: message.id,
      role: message.role as "user" | "assistant" | "system",
      parts: [{ type: "text", text: message.content }],
    })),
  });
};
