"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { getDashboardRoute } from "@/lib/access";

export default function Home() {
  const { user, status } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (status === "authed" && user) {
      router.replace(getDashboardRoute(user));
    } else if (status === "anon") {
      router.replace("/login");
    }
  }, [user, status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Loading…</p>
    </div>
  );
}
