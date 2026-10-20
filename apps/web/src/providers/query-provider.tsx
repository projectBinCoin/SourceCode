"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { useRealtimeSync } from "@/lib/hooks/realtime";

function RealtimeBridge() {
  useRealtimeSync();
  return null;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <RealtimeBridge />
      {children}
    </QueryClientProvider>
  );
}
