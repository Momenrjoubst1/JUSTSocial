const requiredEnv = (key: string, backupKey?: string): string => {
  const value = process.env[key] || (backupKey ? process.env[backupKey] : undefined);
  if (!value) {
    throw new Error(`[Config Error] Missing required environment variable: ${key}${backupKey ? ` or ${backupKey}` : ''}`);
  }
  return value;
};

export const supabaseConfig = {
  url: requiredEnv('SUPABASE_URL', 'VITE_SUPABASE_URL'),
  serviceRoleKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
} as const;
