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
  auth: {
    url: process.env.AUTH_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "http://localhost:54321",
    serviceRoleKey: process.env.AUTH_SUPABASE_SERVICE_ROLE_KEY || "dummy",
  },
  knowledge: {
    url: process.env.KNOWLEDGE_SUPABASE_URL || process.env.SUPABASE_URL || "http://localhost:54321",
    serviceRoleKey: process.env.KNOWLEDGE_SUPABASE_SERVICE_ROLE_KEY || "dummy",
  }
} as const;

// Auth Client (Main Project - Users/Auth)
export const supabase = createClient(
  supabaseConfig.auth.url,
  supabaseConfig.auth.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Knowledge Client (Secondary Project - RAG/Sessions)
export const knowledgeSupabase = createClient(
  supabaseConfig.knowledge.url,
  supabaseConfig.knowledge.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
