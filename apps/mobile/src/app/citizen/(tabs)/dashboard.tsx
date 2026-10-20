import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Recycle, ArrowRight, History, Plus, Sparkles } from "lucide-react-native";
import { useAuthStore } from "@/lib/store/auth-store";
import { useCitizenTransactions, useRequests, useBins } from "@/lib/hooks/queries";
import { PointsBalanceCard } from "@/components/citizen/points-balance-card";
import { ActiveRequestBanner } from "@/components/citizen/active-request-banner";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { WASTAGE_META } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";

export default function CitizenDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: transactions = [] } = useCitizenTransactions(user?.id || "");
  const { data: requests = [] } = useRequests();
  const { data: bins = [] } = useBins();

  const totalPoints = transactions.reduce((sum, t) => sum + t.points, 0);
  const activeRequest = requests.find(
    (r) => r.citizenId === user?.id && (r.status === "pending" || r.status === "claimed")
  );
  const activeBin = activeRequest ? bins.find((b) => b.id === activeRequest.binId) : undefined;
  const recentTransactions = transactions.slice(0, 5);

  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <View className="mb-4">
        <Text className="text-2xl font-bold text-foreground">Welcome back, {user?.name}!</Text>
        <Text className="text-muted-foreground">Manage your recyclable waste and earn rewards.</Text>
      </View>

      <PointsBalanceCard totalPoints={totalPoints} />

      {activeRequest && <View className="mt-4"><ActiveRequestBanner request={activeRequest} bin={activeBin} /></View>}

      <Card className="mt-4 border-sapphire-500/20">
        <CardContent className="flex-row items-center justify-between gap-3 p-4">
          <View className="min-w-0 flex-1 flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-sapphire-500">
              <Recycle size={24} color="#ffffff" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-semibold text-foreground">Request a Recyclable Pickup</Text>
              <Text className="text-sm text-muted-foreground">Turn your waste into reward points</Text>
            </View>
          </View>
          <Button onPress={() => router.push("/citizen/book-pickup")} className="bg-sapphire-500">
            <Plus size={16} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">Book</Text>
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between p-4 pb-2">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <History size={18} color="#0099FF" />
              <CardTitle>Recent Transactions</CardTitle>
            </View>
            <CardDescription>Your latest recycling rewards</CardDescription>
          </View>
          <Pressable onPress={() => router.push("/citizen/wallet")} className="rounded-lg px-2 py-1 active:bg-muted">
            <View className="flex-row items-center gap-1">
              <Text className="text-sm font-medium text-sapphire-500">View All</Text>
              <ArrowRight size={14} color="#0099FF" />
            </View>
          </Pressable>
        </CardHeader>
        <CardContent className="gap-2">
          {recentTransactions.length === 0 ? (
            <View className="items-center py-8">
              <Sparkles size={28} color="#8fa3b8" />
              <Text className="mt-2 text-center text-sm text-muted-foreground">
                No transactions yet. Book a pickup to start earning!
              </Text>
            </View>
          ) : (
            recentTransactions.map((txn) => (
              <View key={txn.id} className="flex-row items-center justify-between rounded-xl border border-border bg-card p-3">
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Text className="text-lg">{WASTAGE_META[txn.wastageType].icon}</Text>
                  </View>
                  <View>
                    <Text className="text-sm font-medium text-foreground">
                      {txn.kind === "redeem" ? `🎁 ${txn.voucherName || "Voucher"}` : `${txn.wastageType} • ${txn.fillPct}% fill`}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {fmtDate(txn.date, "MMM d, yyyy")} • {txn.collectorName}
                    </Text>
                  </View>
                </View>
                <Text className={`font-bold ${txn.points > 0 ? "text-sapphire-500" : "text-destructive"}`}>
                  {txn.points > 0 ? "+" : ""}
                  {Math.round(txn.points).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
}
