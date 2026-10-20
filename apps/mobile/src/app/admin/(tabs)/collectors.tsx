import { useState } from "react";
import {Alert, Image, Pressable, ScrollView, Text, View, useColorScheme } from "react-native";
import { Check, X, Clock, Briefcase, AlertTriangle } from "lucide-react-native";
import { useCollectors, useRequests } from "@/lib/hooks/queries";
import {
  useApproveCollector, useRejectCollector, useSuspendCollector, useReactivateCollector,
} from "@/lib/hooks/mutations";
import { Card, CardContent } from "@/components/ui";
import type { Collector } from "@/types";
import { fmtDate } from "@/lib/dates";

export default function AdminCollectors() {
  const dark = useColorScheme() === "dark";
  const { data: collectors = [] } = useCollectors();
  const { data: requests = [] } = useRequests();
  const approveCollector = useApproveCollector();
  const rejectCollector = useRejectCollector();
  const suspendCollector = useSuspendCollector();
  const reactivateCollector = useReactivateCollector();

  const [tab, setTab] = useState<"pending" | "active">("pending");

  const pending = collectors.filter((c) => c.status === "pending");
  const active = collectors.filter((c) => c.status === "approved" || c.status === "suspended");

  const getCollectorJobs = (collectorId: string) =>
    requests.filter((r) => r.collectorId === collectorId && r.status === "collected");

  const confirmReject = (collector: Collector) => {
    Alert.alert("Reject Application", `Reject ${collector.name}'s collector application?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Reject", style: "destructive", onPress: () => rejectCollector(collector.id) },
    ]);
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <Text className="text-2xl font-bold text-foreground">Collector Management</Text>
      <Text className="mb-4 text-muted-foreground">Approve, monitor, and manage field collectors</Text>

      <View className="flex-row rounded-xl bg-muted p-1">
        {(["pending", "active"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2" style={tab === t ? { backgroundColor: dark ? "#0b1d3a" : "#ffffff", elevation: 2 } : undefined}>
            <Text className={`text-sm font-medium ${tab === t ? "text-foreground" : "text-muted-foreground"}`}>
              {t === "pending" ? "Pending Approvals" : "Active Collectors"}
            </Text>
            {t === "pending" && pending.length > 0 && (
              <View className="rounded-full bg-destructive px-1.5">
                <Text className="text-xs font-semibold text-white">{pending.length}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <View className="mt-4 gap-3">
        {tab === "pending" && pending.length === 0 && (
          <Card>
            <CardContent className="items-center py-12">
              <Clock size={36} color="#8fa3b8" />
              <Text className="mt-2 text-muted-foreground">No pending approvals.</Text>
            </CardContent>
          </Card>
        )}
        {tab === "pending" && pending.map((collector) => (
          <Card key={collector.id}>
            <CardContent className="p-4">
              <View className="flex-row items-center gap-3">
                <Image source={{ uri: collector.avatarUrl }} className="h-12 w-12 rounded-full bg-muted" />
                <View className="flex-1">
                  <Text className="font-medium text-foreground">{collector.name}</Text>
                  <Text className="text-sm text-muted-foreground">{collector.email}</Text>
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    Applied {fmtDate(collector.joinedAt, "MMM d, yyyy")}
                  </Text>
                </View>
              </View>
              <View className="mt-3 flex-row gap-2">
                <Pressable
                  onPress={() => approveCollector(collector.id)}
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-sapphire-500 py-2.5 active:opacity-80"
                >
                  <Check size={16} color="#ffffff" />
                  <Text className="text-sm font-semibold text-white">Approve</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmReject(collector)}
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-destructive py-2.5 active:opacity-80"
                >
                  <X size={16} color="#ffffff" />
                  <Text className="text-sm font-semibold text-white">Reject</Text>
                </Pressable>
              </View>
            </CardContent>
          </Card>
        ))}

        {tab === "active" && active.length === 0 && (
          <Card>
            <CardContent className="items-center py-12">
              <Text className="text-muted-foreground">No active collectors.</Text>
            </CardContent>
          </Card>
        )}
        {tab === "active" && active.map((collector) => {
          const jobs = getCollectorJobs(collector.id);
          const penalties = jobs.filter((j) => j.invalidFlag).length;
          return (
            <Card key={collector.id}>
              <CardContent className="p-4">
                <View className="flex-row items-center gap-3">
                  <Image source={{ uri: collector.avatarUrl }} className="h-12 w-12 rounded-full bg-muted" />
                  <View className="flex-1">
                    <Text className="font-medium text-foreground">{collector.name}</Text>
                    <Text className="text-sm text-muted-foreground">{collector.email}</Text>
                    <View className="mt-1 flex-row flex-wrap items-center gap-2">
                      <View className={`rounded-full px-2 py-0.5 ${collector.status === "approved" ? "bg-sapphire-500/10" : "bg-secondary"}`}>
                        <Text className={`text-xs font-medium ${collector.status === "approved" ? "text-sapphire-500" : "text-secondary-foreground"}`}>
                          {collector.status}
                        </Text>
                      </View>
                      <Text className="text-xs text-muted-foreground">
                        Joined {fmtDate(collector.joinedAt, "MMM d, yyyy")}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <View className="flex-row items-center gap-2">
                      <View className="flex-row items-center gap-1">
                        <Briefcase size={12} color="#8fa3b8" />
                        <Text className="text-sm text-foreground">{collector.totalJobs}</Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <AlertTriangle size={12} color="#dc2626" />
                        <Text className="text-sm text-destructive">{penalties}</Text>
                      </View>
                    </View>
                    <Text className="mt-0.5 text-[10px] text-muted-foreground">jobs / penalties</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() =>
                    collector.status === "approved"
                      ? suspendCollector(collector.id)
                      : reactivateCollector(collector.id)
                  }
                  className="mt-3 flex-row items-center justify-center rounded-xl border border-border py-2.5 active:bg-muted"
                >
                  <Text className="text-sm font-medium text-foreground">
                    {collector.status === "approved" ? "Suspend Collector" : "Reactivate Collector"}
                  </Text>
                </Pressable>
              </CardContent>
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}
