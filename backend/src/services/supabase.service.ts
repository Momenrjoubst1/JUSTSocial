import { supabase } from '../config/supabase.config.js';

export { supabase };

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
