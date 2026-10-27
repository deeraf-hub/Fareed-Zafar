import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CLOUD_ENABLED, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config/env';

let client: SupabaseClient | null = null;

/**
 * Returns the browser Supabase client, or null when the app runs in local
 * mode. Only the public anon key is ever used here; Row Level Security on
 * the `projects` table is what protects user data.
 */
export function getSupabase(): SupabaseClient | null {
  if (!CLOUD_ENABLED) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
