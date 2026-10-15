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

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Server-only client — uses the SERVICE ROLE secret, which bypasses Row Level
 * Security. NEVER import this from client components ("use client") or anything
 * that ends up in the browser bundle. The env var intentionally has no
 * NEXT_PUBLIC_ prefix so Next.js keeps it out of client bundles.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server only)"
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
