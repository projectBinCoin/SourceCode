"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { useMounted } from "@/lib/hooks/use-mounted";

export function AuthGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const mounted = useMounted();

  useEffect(() => {
    if (mounted && !user) {
      router.replace("/login");
    }
  }, [user, router, mounted]);

  if (!mounted || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
