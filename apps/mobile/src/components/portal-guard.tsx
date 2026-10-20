import { useEffect, type ReactNode } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/lib/store/auth-store";
import { getDashboardRoute } from "@/lib/access";
import type { Role } from "@/types";

/**
 * Blocks a portal (tab group) unless the signed-in user's role is allowed.
 * Mirrors the web app's AuthGuard + RoleGuard behaviour.
 */
export function PortalGuard({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user, status } = useAuthStore();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "anon") {
      router.replace("/login");
      return;
    }
    if (!user) return;
    if (!allow.includes(user.role)) {
      router.replace(getDashboardRoute(user));
      return;
    }
    if (user.role === "collector" && user.collectorProfile?.status === "pending") {
      router.replace("/collector/pending-approval");
    }
  }, [user, status, allow]);

  if (status !== "authed" || !user || !allow.includes(user.role)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted-foreground">Loading…</Text>
      </View>
    );
  }

  return <>{children}</>;
}
