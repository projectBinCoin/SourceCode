import { Text, View } from "react-native";
import { Coins, TrendingUp } from "lucide-react-native";
import { getTierFromPoints } from "@/lib/constants";
import { formatLKR, pointsToLKR } from "@/lib/currency";
import type { Tier } from "@/types";

const tierStyles: Record<Tier, { bg: string; icon: string }> = {
  Bronze: { bg: "bg-amber-700", icon: "🥉" },
  Silver: { bg: "bg-slate-400", icon: "🥈" },
  Gold: { bg: "bg-yellow-500", icon: "🥇" },
  Platinum: { bg: "bg-sapphire-500", icon: "💎" },
};

export function PointsBalanceCard({ totalPoints }: { totalPoints: number }) {
  const tier = getTierFromPoints(totalPoints);
  const t = tierStyles[tier];

  return (
    <View className="rounded-2xl border border-sapphire-500/20 bg-card p-5">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <TrendingUp size={14} color="#8fa3b8" />
            <Text className="text-sm font-medium text-muted-foreground">Total Points Balance</Text>
          </View>
          <View className="mt-2 flex-row items-center gap-2">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-sapphire-500">
              <Coins size={20} color="#ffffff" />
            </View>
            <Text className="text-4xl font-bold text-foreground">{Math.round(totalPoints).toLocaleString()}</Text>
          </View>
          <Text className="mt-1.5 text-xs text-muted-foreground">
            ≈ {formatLKR(pointsToLKR(totalPoints))} • Earn more by recycling
          </Text>
        </View>
        <View className={`self-start rounded-full px-3 py-1.5 ${t.bg}`}>
          <Text className="text-xs font-semibold text-white">
            {t.icon} {tier} Tier
          </Text>
        </View>
      </View>
    </View>
  );
}
