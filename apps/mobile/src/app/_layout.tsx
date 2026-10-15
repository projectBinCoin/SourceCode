import "react-native-url-polyfill/auto";
import "../global.css";
import { useEffect, type ReactNode } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/lib/store/auth-store";
import { getSupabase } from "@/lib/supabase";

function AuthProvider({ children }: { children: ReactNode }) {
  const init = useAuthStore((s) => s.init);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  useEffect(() => {
    void init();
    const sb = getSupabase();
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

export default function RootLayout() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="citizen" />
          <Stack.Screen name="collector" />
          <Stack.Screen name="admin" />
        </Stack>
      </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
