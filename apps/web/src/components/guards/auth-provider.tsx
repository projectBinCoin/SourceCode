"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import { getSupabaseBrowser } from "@/lib/supabase";

/**
 * Boots the Supabase session once and keeps the auth store in sync with
 * auth state changes (sign-in, sign-out, token refresh).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const init = useAuthStore((s) => s.init);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  // env.js loads before app JS, so this is resolved by first render. Null =
  // no build-time env AND no runtime env.js — app serves cached demo data.
  // Make that failure loud instead of silent.
  const [demoMode] = useState(() => {
    const unconfigured = getSupabaseBrowser() === null;
    if (unconfigured) console.warn("[bincoin] Supabase not configured — running in demo mode");
    return unconfigured;
  });

  useEffect(() => {
    void init();
    const sb = getSupabaseBrowser();
    if (!sb) return;
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(() => {
      void refreshProfile();
    });
    return () => subscription.unsubscribe();
  }, [init, refreshProfile]);

  return (
    <>
      {demoMode && (
        <div className="fixed inset-x-0 top-0 z-[100] bg-amber-500 px-3 py-1.5 text-center text-xs font-medium text-black">
          Demo mode — backend not connected. Data shown is not live.
        </div>
      )}
      {children}
    </>
  );
}
