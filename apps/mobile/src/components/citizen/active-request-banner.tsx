import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { MapPin, Trash2, ArrowRight } from "lucide-react-native";
import type { Bin, PickupRequest } from "@/types";

const statusConfig: Record<PickupRequest["status"], { label: string; bg: string; text: string }> = {
  pending: { label: "Pending Nearby Collectors", bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  claimed: { label: "Claimed by Driver", bg: "bg-sapphire-500", text: "text-sapphire-500" },
  collected: { label: "Collected & Points Awarded", bg: "bg-green-500", text: "text-green-600 dark:text-green-400" },
  rejected: { label: "Rejected", bg: "bg-red-500", text: "text-destructive" },
};

export function ActiveRequestBanner({ request, bin }: { request: PickupRequest; bin?: Bin }) {
  const config = statusConfig[request.status];

  return (
    <View className="rounded-2xl border border-sapphire-500/20 bg-card p-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 flex-row items-center gap-3">
          <View className={`h-10 w-10 items-center justify-center rounded-xl ${config.bg}`}>
            <Trash2 size={20} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground">Active Pickup Request</Text>
            <View className="mt-1 flex-row flex-wrap items-center gap-2">
              <View className={`rounded-full border border-border px-2 py-0.5 ${config.text}`}>
                <Text className={`text-xs font-medium ${config.text}`}>{config.label}</Text>
              </View>
              {bin && (
                <View className="flex-row items-center gap-1">
                  <MapPin size={12} color="#8fa3b8" />
                  <Text className="text-xs text-muted-foreground">{bin.label}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <Pressable
          onPress={() => router.push(`/citizen/request-status/${request.id}`)}
          className="rounded-lg px-2 py-2 active:bg-muted"
        >
          <View className="flex-row items-center gap-1">
            <Text className="text-sm font-medium text-sapphire-500">Track</Text>
            <ArrowRight size={16} color="#0099FF" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
