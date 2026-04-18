import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthRefresh } from "@/features/auth/hooks/useAuthRefresh";
import { CONFIG } from "@/pages/videochat/core/types";

export interface MatchAssignment {
  token: string;
  roomName: string;
  url: string;
}

export interface UseMatchmakingOptions {
  countryPreference?: string;
  fingerprint?: string | null;
}

export interface UseMatchmakingReturn {
  isRequesting: boolean;
  error: string | null;
  lastMatch: MatchAssignment | null;
  requestMatch: () => Promise<MatchAssignment | null>;
  cancelPending: () => void;
  clearMatch: () => void;
}

function isMatchAssignment(value: unknown): value is MatchAssignment {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<MatchAssignment>;
  return (
    typeof candidate.token === "string" &&
    typeof candidate.roomName === "string" &&
    typeof candidate.url === "string"
  );
}

export function useMatchmaking({ countryPreference, fingerprint }: UseMatchmakingOptions): UseMatchmakingReturn {
  const navigate = useNavigate();
  const { fetchWithAuth } = useAuthRefresh();
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMatch, setLastMatch] = useState<MatchAssignment | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancelPending = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const requestMatch = useCallback(async (): Promise<MatchAssignment | null> => {
    cancelPending();

    const controller = new AbortController();
    abortRef.current = controller;
    setIsRequesting(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      if (countryPreference) {
        query.set("country", countryPreference);
      }
      if (fingerprint) {
        query.set("fingerprint", fingerprint);
      }

      const suffix = query.toString();
      const endpoint = suffix ? `${CONFIG.TOKEN_API_URL}?${suffix}` : CONFIG.TOKEN_API_URL;

      const response = await fetchWithAuth(endpoint, {
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 403) {
          const body = (await response.json().catch(() => null)) as { banned?: boolean } | null;
          if (body?.banned) {
            navigate("/banned", { replace: true });
            return null;
          }
        }
        throw new Error(`Token API ${response.status}`);
      }

      const payload = (await response.json()) as unknown;
      if (!isMatchAssignment(payload)) {
        throw new Error("Invalid matchmaking payload");
      }

      setLastMatch(payload);
      return payload;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return null;
      }
      const message = err instanceof Error ? err.message : "Unable to request match";
      setError(message);
      throw err;
    } finally {
      setIsRequesting(false);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [cancelPending, countryPreference, fetchWithAuth, fingerprint]);

  const clearMatch = useCallback(() => {
    setLastMatch(null);
  }, []);

  useEffect(() => {
    return () => {
      cancelPending();
    };
  }, [cancelPending]);

  return {
    isRequesting,
    error,
    lastMatch,
    requestMatch,
    cancelPending,
    clearMatch,
  };
}
