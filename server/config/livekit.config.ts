const requiredEnv = (key: string, backupKey?: string): string => {
  const value = process.env[key] || (backupKey ? process.env[backupKey] : undefined);
  if (!value) {
    throw new Error(`[Config Error] Missing required environment variable: ${key}${backupKey ? ` or ${backupKey}` : ''}`);
  }
  return value;
};

export const livekitConfig = {
  apiKey: requiredEnv('LIVEKIT_API_KEY'),
  apiSecret: requiredEnv('LIVEKIT_API_SECRET'),
  url: requiredEnv('LIVEKIT_URL', 'VITE_LIVEKIT_URL'),
} as const;
