import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Browser/device client — uses the PUBLIC anon key, which is safe to expose.
 * Returns null when Supabase is not configured yet (app shows a setup notice),
 * so the app keeps working without credentials.
 */
const globalForSupabase = globalThis as unknown as {
  __bincoinSupabase?: SupabaseClient | null;
};

export function getSupabase(): SupabaseClient | null {
  if (globalForSupabase.__bincoinSupabase !== undefined) {
    return globalForSupabase.__bincoinSupabase;
  }
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  globalForSupabase.__bincoinSupabase =
    url && anonKey
      ? createClient(url, anonKey, {
          auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true },
        })
      : null;
  return globalForSupabase.__bincoinSupabase;
}

export const isSupabaseConfigured =
  !!process.env.EXPO_PUBLIC_SUPABASE_URL && !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
