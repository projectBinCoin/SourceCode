import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser client — uses the PUBLIC anon key, which is safe to expose.
 * Returns null when Supabase is not configured yet (app falls back to the
 * local Zustand store), so the app keeps working without credentials.
 *
 * Stored on globalThis because bundlers can duplicate this module across
 * chunks; multiple GoTrueClients sharing one storage key misbehave.
 */
const globalForSupabase = globalThis as unknown as {
  __bincoinSupabase?: SupabaseClient | null;
  __BINCOIN_ENV__?: Record<string, string>;
};

export function getSupabaseBrowser(): SupabaseClient | null {
  if (globalForSupabase.__bincoinSupabase !== undefined) {
    return globalForSupabase.__bincoinSupabase;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  globalForSupabase.__bincoinSupabase = url && anonKey ? createClient(url, anonKey) : null;
  return globalForSupabase.__bincoinSupabase;
}

