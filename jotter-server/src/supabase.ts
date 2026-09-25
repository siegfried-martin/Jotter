import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Config } from './config';

// Server-side Supabase clients. There is deliberately NO service-role client: every data
// access runs as the calling user (their access token in the Authorization header), so
// Postgres RLS and the membership RPCs enforce exactly what that user can see and change.

const serverAuth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

/** An anonymous client, used only to validate access tokens with Supabase Auth. */
export function createAnonClient(config: Config): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: serverAuth });
}

/** A client that acts as the user who owns `accessToken`. */
export function createUserClient(config: Config, accessToken: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: serverAuth,
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
}
