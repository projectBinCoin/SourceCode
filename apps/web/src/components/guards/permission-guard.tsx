"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import { hasPermission } from "@/lib/access";
import { useMounted } from "@/lib/hooks/use-mounted";
import type { Permission } from "@/lib/access";

interface PermissionGuardProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ permission, children, fallback }: PermissionGuardProps) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const mounted = useMounted();

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!hasPermission(user, permission)) {
      if (user.role === "citizen") router.replace("/citizen/dashboard");
      else if (user.role === "collector") router.replace("/collector/dashboard");
      else if (user.role === "admin") router.replace("/admin/dashboard");
    }
  }, [user, permission, router, mounted]);

  if (!mounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user || !hasPermission(user, permission)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Access denied…</p>
      </div>
    );
  }

  return <>{children}</>;
}
