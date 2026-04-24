/**
 * useAIAgent — Hook for controlling AI Agent in video chat
 * يتصل بالسيرفر المحلي (Express) لتشغيل/إيقاف الوكيل الذكي في الغرفة
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

import { UseAIAgentReturn } from '../types';

export function useAIAgent(): UseAIAgentReturn {
  const [agentActive, setAgentActive] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentMessage, setAgentMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRoomRef = useRef<string | null>(null);
  const activeIdentityRef = useRef<string | null>(null);
  // Cached auth token so unmount cleanup does not depend on an async call
  // (which would be dropped during page close / navigation).
  const authTokenRef = useRef<string | null>(null);

  // Reliable fire-and-forget stop used from unmount / pagehide.
  // Uses the cached token so it does NOT depend on an async supabase call
  // (which would be dropped during page close / navigation).
  const signalStopSync = (room: string, identity?: string | null) => {
    try {
      const token = authTokenRef.current;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      fetch('/api/agent/stop', {
        method: 'POST',
        headers,
        body: JSON.stringify({ roomName: room, identity }),
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // Ignore errors on unmount signal
    }
  };

  // Keep auth token refreshed while the hook is mounted.
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled) authTokenRef.current = session?.access_token ?? null;
      } catch {
        /* ignore */
      }
    };
    refresh();
    const sub = supabase.auth.onAuthStateChange((_evt, session) => {
      authTokenRef.current = session?.access_token ?? null;
    });
    return () => {
      cancelled = true;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handlePageHide = () => {
      if (activeRoomRef.current) {
        signalStopSync(activeRoomRef.current, activeIdentityRef.current);
      }
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      // Cleanup: stop in-flight fetches
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Prevent zombie agents on component unmount
      if (activeRoomRef.current) {
        signalStopSync(activeRoomRef.current, activeIdentityRef.current);
      }
    };
  }, []);

  /** Helper: get auth headers for Express server */
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (e) {
      console.warn('Failed to get auth session for agent:', e);
    }
    return headers;
  };

  const checkAgentStatus = useCallback(async (roomName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const identity = session?.user?.id;
      const headers = await getAuthHeaders();
      
      const params = new URLSearchParams({ roomName });
      if (identity) params.append('identity', identity);

      const response = await fetch(`/api/agent/status?${params.toString()}`, {
        headers,
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        setAgentActive(!!data.active);
        if (data.active) {
          activeRoomRef.current = roomName;
          activeIdentityRef.current = identity || null;
        } else {
          activeRoomRef.current = null;
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to sync agent status:', error);
    }
  }, []);

  const startAgent = useCallback(async (roomName: string, context?: Record<string, any>) => {
    try {
      setAgentLoading(true);
      setAgentError(null);
      setAgentMessage('');

      abortControllerRef.current = new AbortController();
      const headers = await getAuthHeaders();

      const { data: { session } } = await supabase.auth.getSession();
      const identity = session?.user?.id;

      const response = await fetch('/api/agent/start', {
        method: 'POST',
        headers,
        body: JSON.stringify({ roomName, identity, context }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) throw new Error('Server is busy');
        if (response.status === 409) throw new Error('Agent already running');
        throw new Error(data.message || data.error || 'Failed to start agent');
      }

      setAgentActive(true);
      activeRoomRef.current = roomName;
      activeIdentityRef.current = identity || null;
      setAgentMessage(data.message || 'Agent is now active');

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setAgentError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setAgentLoading(false);
    }
  }, []);

  const stopAgent = useCallback(async (roomName: string) => {
    try {
      setAgentLoading(true);
      setAgentError(null);

      if (abortControllerRef.current) abortControllerRef.current.abort();

      const headers = await getAuthHeaders();
      const { data: { session } } = await supabase.auth.getSession();
      const identity = session?.user?.id;

      const response = await fetch('/api/agent/stop', {
        method: 'POST',
        headers,
        body: JSON.stringify({ roomName, identity }),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok && response.status !== 404) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to stop agent');
      }

      setAgentActive(false);
      activeRoomRef.current = null;
      setAgentMessage('');

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setAgentActive(false);
        activeRoomRef.current = null;
      } else {
        setAgentError(error instanceof Error ? error.message : 'Unknown error');
      }
    } finally {
      setAgentLoading(false);
    }
  }, []);

  return {
    agentActive,
    agentLoading,
    agentError,
    agentMessage,
    isStreaming,
    startAgent,
    stopAgent,
    checkAgentStatus
  };
}
