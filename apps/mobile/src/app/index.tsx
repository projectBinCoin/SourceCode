import { useEffect } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/lib/store/auth-store";
import { getDashboardRoute } from "@/lib/access";

export default function Index() {
  const { user, status } = useAuthStore();

  useEffect(() => {
    if (status === "authed" && user) {
      router.replace(getDashboardRoute(user));
    } else if (status === "anon") {
      router.replace("/login");
    }
  }, [user, status]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-muted-foreground">Loading…</Text>
    </View>
  );
}
