/**
 * ════════════════════════════════════════════════════════════════════════════════
 * Core Video Chat Types & Configuration
 * Pure video chat types — no feature-specific types here.
 * ════════════════════════════════════════════════════════════════════════════════
 */

/* ─── Status ────────────────────────────────────────────────────────────── */
export type Status =
  | "init"
  | "connecting"
  | "looking"
  | "connected"
  | "reconnecting"
  | "error-camera"
  | "error-peer";

export interface ReconnectionState {
  isReconnecting: boolean;
  attempt: number;          // current attempt number (1, 2, 3...)
  maxAttempts: number;      // give up after this many attempts
  lastRoomName: string | null;  // room to reconnect to
  lastToken: string | null;     // token for that room
  lastUrl: string | null;       // LiveKit URL
}

export const INITIAL_RECONNECTION_STATE: ReconnectionState = {
  isReconnecting: false,
  attempt: 0,
  maxAttempts: 3,
  lastRoomName: null,
  lastToken: null,
  lastUrl: null,
};

/* ─── Chat Message ──────────────────────────────────────────────────────── */
export interface Message {
  sender: "local" | "remote";
  text: string;
  time: Date;
  _id?: number;
}

/* ─── Component Props ───────────────────────────────────────────────────── */
export interface VideoChatPageProps {
  onExit: () => void;
  userEmail?: string;
}

const rawTokenApiUrl = import.meta.env.DEV
  ? "/api/livekit-token" // Use Vite proxy in development to fix LAN connection issues
  : (import.meta.env.VITE_LIVEKIT_TOKEN_API || "/api/livekit-token");

const buildApiUrl = (tokenApiUrl: string, endpoint: string) => {
  const clean = tokenApiUrl.replace(/\/+$/, "");

  if (/\/api\/livekit-token$/i.test(clean)) {
    return clean.replace(/\/api\/livekit-token$/i, `/api/${endpoint}`);
  }

  if (/\/livekit-token$/i.test(clean)) {
    return clean.replace(/\/livekit-token$/i, `/${endpoint}`);
  }

  return `/api/${endpoint}`;
};

export const CONFIG = {
  TOKEN_API_URL: rawTokenApiUrl,
  ICE_SERVERS_API_URL: buildApiUrl(rawTokenApiUrl, "ice-servers"),
  LEAVE_API_URL: buildApiUrl(rawTokenApiUrl, "leave"),
  MODERATION_API_URL: buildApiUrl(rawTokenApiUrl, "moderation"),
  RETRY_DELAY: 2000,
  CONNECTION_TIMEOUT_MS: 15000,
  PEER_SEARCH_TIMEOUT_MS: 15000,
  PEER_POLL_INTERVAL_MS: 2000,
  RECONNECT_DELAYS_MS: [1000, 2000, 4000],
};
