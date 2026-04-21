import { createClient } from '@supabase/supabase-js';

const isTest = process.env.NODE_ENV === 'test';

const requiredEnv = (key: string, backupKey?: string): string => {
  const value = process.env[key] || (backupKey ? process.env[backupKey] : undefined);
  if (value) return value;

  if (isTest) {
    if (key === 'SUPABASE_URL') return 'http://vitest.supabase.local';
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'vitest-service-role-jwt-placeholder';
  }

  console.warn(`⚠️ [Config Warning] Missing optional environment variable: ${key}. Using dummy value for startup.`);
  return "http://localhost:54321"; // Dummy fallback for URL, key can be any string
};


export const supabaseConfig = {
  url: requiredEnv('SUPABASE_URL', 'VITE_SUPABASE_URL'),
  serviceRoleKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
} as const;

export const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
