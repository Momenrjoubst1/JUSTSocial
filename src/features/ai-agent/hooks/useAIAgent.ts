/**
 * useAIAgent — Hook for controlling AI Agent in video chat
 * للتحكم بالوكيل الذكي في الفيديو شات (مع دعم الـ Streaming الجديد)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthRefresh } from "@/features/auth/hooks/useAuthRefresh";

import { UseAIAgentReturn, AgentStreamData } from '../types';

export function useAIAgent(): UseAIAgentReturn {
  const { refreshIfNeeded, fetchWithAuth } = useAuthRefresh();
  const [agentActive, setAgentActive] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentMessage, setAgentMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // للإلغاء لاحقاً (AbortController) تحسباً لإيقاف الوكيل
  const abortControllerRef = useRef<AbortController | null>(null);

  // تنظيف (Cleanup) لمنع تسرب الذاكرة وإيقاف استهلاك الباندويث إذا خرج المستخدم من الصفحة
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /* === النسخة القديمة (Express Server) ===
  const startAgent = useCallback(async (roomName: string) => {
    try {
      setAgentLoading(true);
      ...
  });
  */

  // === النسخة الجديدة باستخدام Supabase Edge Functions (Streaming) ===
  const startAgent = useCallback(async (roomName: string) => {
    try {
      setAgentLoading(true);
      setAgentError(null);
      setAgentMessage('');
      setAgentActive(true);

      abortControllerRef.current = new AbortController();

      // استخدام الـ Edge Function החדשה الخاصة بالبث
      // يمكنك تبديل الرابط برابط Supabase Edge Function الحقيقي في الإنتاج (Production)
      const edgeFunctionUrl = import.meta.env.VITE_SUPABASE_URL
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-stream`
        : 'http://localhost:54321/functions/v1/chat-stream';

      // Ensure session is fresh and request stream with automatic retry logic
      const response = await fetchWithAuth(edgeFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start agent stream');
      }

      setAgentLoading(false); // تم الرد وبدأ التدفق
      setIsStreaming(true);

      // معالجة الـ ReadableStream داخل try-catch لالتقاط حالات انقطاع الإنترنت المفاجئ
      try {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkText = decoder.decode(value, { stream: true });
          // معالجة صيغة Server-Sent Events "data: {...}\n\n"
          const lines = chunkText.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.replace('data: ', '').trim()) as AgentStreamData;
                if (data.done) {
                  // انتهى تدفق الرسالة
                  break;
                }
                if (data.text) {
                  setAgentMessage(prev => prev + data.text);
                }
              } catch (e) {
                console.warn("Failed to parse SSE line", line, e);
              }
            }
          }
        }
      } catch (streamError: unknown) {
        if (streamError instanceof Error && streamError.name === 'AbortError') {
          console.log('⛔ Agent stream aborted during read');
        } else {
          console.error('❌ Network error during streaming:', streamError);
          setAgentError('انقطع الاتصال فجأة أثناء استلام الرسالة، الرجاء التحقق من الإنترنت.');
        }
      } finally {
        setIsStreaming(false);
      }

      // Collaboration initialized

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Aborted
      } else {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setAgentError(message);
        console.error('❌ Error starting agent:', message);
      }
    } finally {
      // لا نلغي `agentActive` هنا لأن الوكيل قد يبقى فعالاً في صمت
      setAgentLoading(false);
    }
  }, []);

  const stopAgent = useCallback(async (roomName: string) => {
    try {
      setAgentLoading(true);
      setAgentError(null);
      console.log(`Stopping agent in room: ${roomName}`);

      // إيقاف المتدفق لو كان يعمل
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // إذا كنت تريد مناداة السيرفر القديم أو إيقاف السيرفر للتوكن (يمكن إضافة Edge Function أخرى)
      /* 
      const response = await fetch('/api/agent/stop', {
        method: 'POST', ...
      });
      */

      // Agent stopped successfully
      setAgentActive(false);
      setAgentMessage('');

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setAgentError(message);
      console.error('❌ Error stopping agent:', message);
    } finally {
      setAgentLoading(false);
    }
  }, []);

  return {
    agentActive,
    agentLoading,
    agentError,
    agentMessage, // <- أضفنا الخاصية الجديدة هنا للتجاوب مع Tailwind
    isStreaming,  // للتحكم بالـ UI
    startAgent,
    stopAgent
  };
}
