import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase";

const TABLE_KEYS: [string, string][] = [
  ["bins", "bins"],
  ["pickup_requests", "requests"],
  ["transactions", "transactions"],
  ["vouchers", "vouchers"],
  ["collectors", "collectors"],
  ["settings", "settings"],
  ["app_users", "users"],
  ["announced_devices", "announcedDevices"],
];

/**
 * Push-based sync: when a row changes in Supabase (device telemetry, admin
 * actions, another user's request), invalidate the matching queries so
 * TanStack refetches immediately — the UI updates ~1s after the write lands
 * instead of waiting for the next poll.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const channel = sb.channel("live-data");
    for (const [table, key] of TABLE_KEYS) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () =>
        qc.invalidateQueries({ queryKey: [key] })
      );
    }
    channel.subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [qc]);
}
