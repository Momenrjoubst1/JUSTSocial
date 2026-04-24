import twilio from 'twilio';

interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

interface TurnCredentials {
  iceServers: IceServer[];
  expiresAt: number; // Unix timestamp
}

// Cache credentials to avoid hitting Twilio API on every request
let credentialsCache: TurnCredentials | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

const FALLBACK_ICE_SERVERS: IceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

async function fetchTwilioTurnCredentials(): Promise<TurnCredentials> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.warn('⚠️ Twilio credentials missing — using STUN only');
    return {
      iceServers: FALLBACK_ICE_SERVERS,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
  }

  const client = twilio(accountSid, authToken);
  const token = await client.tokens.create();

  return {
    iceServers: token.iceServers as IceServer[],
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

export async function getTurnCredentials(): Promise<IceServer[]> {
  try {
    // Return cached credentials if still valid
    if (credentialsCache && Date.now() < credentialsCache.expiresAt) {
      return credentialsCache.iceServers;
    }

    // Fetch fresh credentials
    credentialsCache = await fetchTwilioTurnCredentials();
    console.log('✅ TURN credentials refreshed');
    return credentialsCache.iceServers;

  } catch (err) {
    console.error('❌ Failed to fetch TURN credentials:', err);
    // Fallback to STUN only — better than nothing
    return FALLBACK_ICE_SERVERS;
  }
}
