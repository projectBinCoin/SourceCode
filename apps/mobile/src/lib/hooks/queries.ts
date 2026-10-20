"use client";

import { useQuery } from "@tanstack/react-query";
import { useDataStore } from "@/lib/store/data-store";
import { queryKeys } from "@/lib/query/keys";
import {
  fetchBins,
  fetchRequests,
  fetchRequest,
  fetchCitizenTransactions,
  fetchVouchers,
  fetchCollectors,
  fetchSettings,
  fetchUsers,
  fetchAnnouncedDevices,
  type AnnouncedDevice,
} from "@/lib/supabase-data";
import type { User } from "@/types";

/**
 * Reads prefer Supabase (shared backend) and fall back to the local Zustand
 * store when Supabase is unconfigured, unreachable, or not yet seeded.
 */
export function useBins() {
  const bins = useDataStore((s) => s.bins);
  return useQuery({
    queryKey: queryKeys.bins(),
    queryFn: async () => (await fetchBins()) ?? bins,
    initialData: bins,
    refetchInterval: 15000,   // devices report per wake — keep fill levels fresh
  });
}

export function useRequests() {
  const requests = useDataStore((s) => s.requests);
  return useQuery({
    queryKey: queryKeys.requests(),
    queryFn: async () => (await fetchRequests()) ?? requests,
    initialData: requests,
    
  });
}

export function useRequest(id: string) {
  const requests = useDataStore((s) => s.requests);
  return useQuery({
    queryKey: queryKeys.request(id),
    queryFn: async () => (await fetchRequest(id)) ?? requests.find((r) => r.id === id),
    initialData: requests.find((r) => r.id === id),
    
  });
}

export function useCitizenTransactions(citizenId: string) {
  const transactions = useDataStore((s) => s.transactions);
  const local = transactions.filter((t) => t.citizenId === citizenId);
  return useQuery({
    queryKey: queryKeys.citizenTransactions(citizenId),
    queryFn: async () => (await fetchCitizenTransactions(citizenId)) ?? local,
    initialData: local,
    
  });
}

export function useVouchers() {
  const vouchers = useDataStore((s) => s.vouchers);
  return useQuery({
    queryKey: queryKeys.vouchers(),
    queryFn: async () => (await fetchVouchers()) ?? vouchers,
    initialData: vouchers,
    
  });
}

export function useCollectors() {
  const collectors = useDataStore((s) => s.collectors);
  return useQuery({
    queryKey: queryKeys.collectors(),
    queryFn: async () => (await fetchCollectors()) ?? collectors,
    initialData: collectors,
    
  });
}

export function useSettings() {
  const settings = useDataStore((s) => s.settings);
  return useQuery({
    queryKey: queryKeys.settings(),
    queryFn: async () => (await fetchSettings()) ?? settings,
    initialData: settings,
    
  });
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users(),
    queryFn: async () => (await fetchUsers()) ?? [],
    initialData: [] as User[],
    
  });
}

/** Devices that announced themselves over WiFi but haven't been claimed yet. */
export function useAnnouncedDevices() {
  return useQuery({
    queryKey: queryKeys.announcedDevices(),
    queryFn: async () => (await fetchAnnouncedDevices()) ?? [],
    initialData: [] as AnnouncedDevice[],
    refetchInterval: 15000,
  });
}

/** Resolve a user id (e.g. a request's citizenId) to a display name. */
export function useUserName(userId: string | null | undefined): string {
  const { data: users } = useUsers();
  if (!userId) return "Unknown";
  return users.find((u) => u.id === userId)?.name || userId;
}
