"use client";

import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { useMounted } from "@/lib/hooks/use-mounted";

export function PortalShell({ children }: { children: ReactNode }) {
  // Wait until after mount: auth state comes from a persisted store that is
  // empty on the server, so rendering the shell early causes hydration errors.
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <AppHeader />
      <main className="w-full flex-1 pb-16 md:pb-0">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
