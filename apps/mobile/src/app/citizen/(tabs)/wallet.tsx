import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Coins, Search, Gift, QrCode } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { useAuthStore } from "@/lib/store/auth-store";
import { useCitizenTransactions, useVouchers } from "@/lib/hooks/queries";
import { useRedeemVoucher } from "@/lib/hooks/mutations";
import { PointsBalanceCard } from "@/components/citizen/points-balance-card";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, IconInput } from "@/components/ui";
import { WASTAGE_META, WASTAGE_TYPES } from "@/lib/constants";
import { formatLKR, pointsToLKR } from "@/lib/currency";
import type { Voucher } from "@/types";
import { fmtDate } from "@/lib/dates";

export default function Wallet() {
  const user = useAuthStore((s) => s.user);
  const { data: transactions = [] } = useCitizenTransactions(user?.id || "");
  const { data: vouchers = [] } = useVouchers();
  const redeemVoucher = useRedeemVoucher();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  const totalPoints = transactions.reduce((sum, t) => sum + t.points, 0);
  const earnedPoints = transactions.filter((t) => t.points > 0).reduce((sum, t) => sum + t.points, 0);
  const redeemedPoints = transactions.filter((t) => t.points < 0).reduce((sum, t) => sum + Math.abs(t.points), 0);

  const filteredTxns = transactions.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      t.collectorName.toLowerCase().includes(q) ||
      t.wastageType.toLowerCase().includes(q) ||
      (t.voucherName?.toLowerCase().includes(q) ?? false);
    const matchesType = filterType === "all" || (t.kind !== "redeem" && t.wastageType === filterType);
    return matchesSearch && matchesType;
  });

  const handleRedeem = (voucher: Voucher) => {
    if (totalPoints < voucher.costPoints || voucher.stock === 0) return;
    redeemVoucher(voucher.id, user?.id || "");
    setSelectedVoucher(voucher);
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <Text className="text-2xl font-bold text-foreground">My Wallet</Text>
      <Text className="mb-4 text-muted-foreground">Track your points and redeem rewards.</Text>

      <PointsBalanceCard totalPoints={totalPoints} />

      <View className="mt-4 flex-row gap-3">
        <Card className="flex-1 border-sapphire-500/10">
          <CardContent className="flex-row items-center gap-2 p-4">
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-sapphire-500">
              <Coins size={16} color="#ffffff" />
            </View>
            <View>
              <Text className="text-xs text-muted-foreground">Total Earned</Text>
              <Text className="text-lg font-bold text-foreground">{Math.round(earnedPoints).toLocaleString()} pts</Text>
              <Text className="text-xs text-muted-foreground">≈ {formatLKR(pointsToLKR(earnedPoints))}</Text>
            </View>
          </CardContent>
        </Card>
        <Card className="flex-1 border-sapphire-500/10">
          <CardContent className="flex-row items-center gap-2 p-4">
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-sapphire-600">
              <Gift size={16} color="#ffffff" />
            </View>
            <View>
              <Text className="text-xs text-muted-foreground">Total Redeemed</Text>
              <Text className="text-lg font-bold text-foreground">{Math.round(redeemedPoints).toLocaleString()} pts</Text>
              <Text className="text-xs text-muted-foreground">≈ {formatLKR(pointsToLKR(redeemedPoints))}</Text>
            </View>
          </CardContent>
        </Card>
      </View>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All your recycling transactions</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <View className="flex-row gap-2">
            <View className="min-w-0 flex-1">
              <IconInput
                icon={<Search size={16} color="#8fa3b8" />}
                value={search}
                onChangeText={setSearch}
                placeholder="Search…"
              />
            </View>
            <Pressable
              onPress={() => setShowTypePicker(true)}
              className="h-11 justify-center rounded-xl border border-border bg-card px-3"
            >
              <Text className="text-sm text-foreground">{filterType === "all" ? "All Types" : filterType}</Text>
            </Pressable>
          </View>
          {showTypePicker && (
            <View className="rounded-xl border border-border">
              {["all", ...WASTAGE_TYPES].map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    setFilterType(t);
                    setShowTypePicker(false);
                  }}
                  className="border-b border-border p-3 last:border-b-0 active:bg-muted"
                >
                  <Text className="text-sm text-foreground">{t === "all" ? "All Types" : t}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {filteredTxns.length === 0 ? (
            <Text className="py-6 text-center text-muted-foreground">No transactions found.</Text>
          ) : (
            filteredTxns.map((txn) => (
              <View key={txn.id} className="flex-row items-center justify-between border-b border-border py-2.5 last:border-b-0">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground">
                    {txn.kind === "redeem" ? `🎁 ${txn.voucherName || "Voucher"}` : `${WASTAGE_META[txn.wastageType].icon} ${txn.wastageType}`}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {fmtDate(txn.date, "MMM d, yyyy")} • {txn.collectorName}
                    {txn.kind !== "redeem" ? ` • ${txn.fillPct}% fill` : ""}
                  </Text>
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

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Voucher Catalog</CardTitle>
          <CardDescription>Redeem your points for rewards</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          {vouchers.map((voucher) => {
            const canAfford = totalPoints >= voucher.costPoints;
            return (
              <Card key={voucher.id} className={canAfford ? "" : "opacity-60"}>
                <CardContent className="p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="font-medium text-foreground">{voucher.name}</Text>
                      <Badge variant="secondary" className="mt-1">{voucher.category}</Badge>
                    </View>
                    <Text className="text-xl">
                      {voucher.category === "Mobile Data" ? "📱" : voucher.category === "Supermarket" ? "🛒" : "⚡"}
                    </Text>
                  </View>
                  <View className="mt-3 flex-row items-center justify-between">
                    <View>
                      <Text className="font-bold text-sapphire-500">🪙 {voucher.costPoints} pts</Text>
                      <Text className="text-xs text-muted-foreground">≈ {formatLKR(pointsToLKR(voucher.costPoints))}</Text>
                    </View>
                    <Text className="text-xs text-muted-foreground">{voucher.stock} left</Text>
                  </View>
                  <Button
                    className={`mt-3 w-full ${canAfford && voucher.stock > 0 ? "bg-sapphire-500" : ""}`}
                    variant={canAfford && voucher.stock > 0 ? "default" : "outline"}
                    disabled={!canAfford || voucher.stock === 0}
                    onPress={() => handleRedeem(voucher)}
                  >
                    <QrCode size={16} color={canAfford && voucher.stock > 0 ? "#ffffff" : "#8fa3b8"} />
                    <Text className={`text-sm font-semibold ${canAfford && voucher.stock > 0 ? "text-white" : "text-muted-foreground"}`}>
                      {canAfford ? "Redeem" : "Not Enough Points"}
                    </Text>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <Modal visible={!!selectedVoucher} transparent animationType="fade" onRequestClose={() => setSelectedVoucher(null)}>
        <View className="flex-1 items-center justify-center bg-black/60 p-6" style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
          <View className="w-full max-w-sm rounded-2xl bg-card p-5">
            <Text className="text-center text-base font-semibold text-foreground">Voucher Redeemed!</Text>
            <Text className="mt-1 text-center text-sm text-muted-foreground">{selectedVoucher?.name}</Text>
            <View className="my-5 items-center rounded-xl bg-white p-4">
              {selectedVoucher && <QRCode value={selectedVoucher.qrPayload} size={200} />}
            </View>
            <Text className="text-center text-sm text-muted-foreground">
              Show this QR code at the partner outlet to claim your reward.
            </Text>
            <Button onPress={() => setSelectedVoucher(null)} className="mt-4 w-full bg-sapphire-500">
              <Text className="text-sm font-semibold text-white">Done</Text>
            </Button>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
