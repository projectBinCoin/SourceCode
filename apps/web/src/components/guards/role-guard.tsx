"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { hasRole, isPendingCollector } from "@/lib/access";
import { useMounted } from "@/lib/hooks/use-mounted";
import type { Role } from "@/types";

interface RoleGuardProps {
  allow: Role[];
  children: ReactNode;
}

function getSafeRoute(role: Role, isPending: boolean): string {
  if (role === "collector" && isPending) return "/collector/pending-approval";
  return `/${role}/dashboard`;
}

export function RoleGuard({ allow, children }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const mounted = useMounted();

  useEffect(() => {
    if (!mounted || !user) return;

    const pending = isPendingCollector(user);

    if (!allow.includes(user.role)) {
      router.replace(getSafeRoute(user.role, pending));
      return;
    }

    if (pending) {
      router.replace("/collector/pending-approval");
    }
  }, [user, allow, router, mounted]);

  if (!mounted || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const allowed = allow.some((r) => hasRole(user, r));

  if (!allowed || isPendingCollector(user)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  return <>{children}</>;
}
