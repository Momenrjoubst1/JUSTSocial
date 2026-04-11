import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/index.js';

// Use service role key on backend (bypasses RLS for admin operations)
export const supabase: SupabaseClient = createClient(
  supabaseConfig.url,
  supabaseConfig.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ── Typed query helpers ───────────────────────────────────────────────────

export async function getUserById(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function saveReport(report: {
  reporter_id: string;
  reported_user_id: string;
  room_name: string;
  reason: string;
  description?: string;
}) {
  const { data, error } = await supabase
    .from('reports')
    .insert(report)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getBanRecord(fingerprint: string, ip: string) {
  const { data, error } = await supabase
    .from('banned_users')
    .select('*')
    .or(`fingerprint.eq.${fingerprint},ip_address.eq.${ip}`)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createBan(ban: {
  fingerprint?: string;
  ip_address?: string;
  user_id?: string;
  reason: string;
  banned_by: string;
  metadata?: any;
}) {
  const { data, error } = await supabase
    .from('banned_users')
    .insert(ban)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeBan(fingerprint: string) {
  const { error } = await supabase
    .from('banned_users')
    .update({ is_active: false })
    .eq('fingerprint', fingerprint);
  if (error) throw error;
}
