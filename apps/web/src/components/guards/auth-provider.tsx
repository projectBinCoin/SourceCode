"use client";

import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import { getSupabaseBrowser } from "@/lib/supabase";

/**
 * Boots the Supabase session once and keeps the auth store in sync with
 * auth state changes (sign-in, sign-out, token refresh).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const init = useAuthStore((s) => s.init);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

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

  return <>{children}</>;
}
