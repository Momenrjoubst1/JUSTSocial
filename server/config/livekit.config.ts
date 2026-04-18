const isTest = process.env.NODE_ENV === 'test';

const requiredEnv = (key: string, backupKey?: string): string => {
  const value = process.env[key] || (backupKey ? process.env[backupKey] : undefined);
  if (value) return value;

  if (isTest) {
    if (key === 'LIVEKIT_API_KEY') return 'vitest-livekit-api-key';
    if (key === 'LIVEKIT_API_SECRET') {
      return 'vitest-livekit-api-secret-at-least-32-characters!!';
    }
    if (key === 'LIVEKIT_URL') return 'wss://vitest.invalid';
  }

  throw new Error(`[Config Error] Missing required environment variable: ${key}${backupKey ? ` or ${backupKey}` : ''}`);
};

export const livekitConfig = {
  apiKey: requiredEnv('LIVEKIT_API_KEY'),
  apiSecret: requiredEnv('LIVEKIT_API_SECRET'),
  url: requiredEnv('LIVEKIT_URL', 'VITE_LIVEKIT_URL'),
} as const;
