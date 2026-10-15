"use client";

import { AuthGuard } from "@/components/guards/auth-guard";
import { RoleGuard } from "@/components/guards/role-guard";
import { PortalShell } from "@/components/shell/portal-shell";

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <RoleGuard allow={["citizen"]}>
        <PortalShell>{children}</PortalShell>
      </RoleGuard>
    </AuthGuard>
  );
}
