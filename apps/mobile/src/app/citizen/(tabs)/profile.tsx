import { ScrollView, Text, View } from "react-native";
import { ClipboardList, Coins, History, Sparkles } from "lucide-react-native";
import { useAuthStore } from "@/lib/store/auth-store";
import { useCitizenTransactions, useRequests, useVouchers } from "@/lib/hooks/queries";
import { ProfileHeader } from "@/components/profile/profile-header";
import { AccountSection } from "@/components/profile/account-section";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@/components/ui";
import { WASTAGE_META } from "@/lib/constants";
import { pointsToLKR } from "@/lib/currency";
import { fmtDate } from "@/lib/dates";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/15",
  claimed: "bg-sapphire-500/15",
  collected: "bg-emerald-500/15",
  rejected: "bg-destructive/15",
};
const statusText: Record<string, string> = {
  pending: "text-amber-600",
  claimed: "text-sapphire-500",
  collected: "text-emerald-600",
  rejected: "text-destructive",
};

export default function CitizenProfile() {
  const user = useAuthStore((s) => s.user);
  const { data: transactions = [] } = useCitizenTransactions(user?.id || "");
  const { data: requests = [] } = useRequests();
  const { data: vouchers = [] } = useVouchers();

  const myRequests = requests.filter((r) => r.citizenId === user?.id);
  const totalPoints = transactions.reduce((s, t) => s + t.points, 0);
  const completedPickups = myRequests.filter((r) => r.status === "collected").length;
  const recentTxns = transactions.slice(0, 5);
  const recentRequests = [...myRequests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  if (!user) return null;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="gap-4 p-4 pb-8">
      <View>
        <Text className="text-2xl font-bold text-foreground">Profile</Text>
        <Text className="text-muted-foreground">Your account and recycling history</Text>
      </View>

      <ProfileHeader name={user.name} email={user.email} role="citizen" extra={user.tier ? `${user.tier} Tier` : undefined} />

      <View className="flex-row gap-3">
        {[
          { label: "Points", value: Math.round(totalPoints).toLocaleString(), sub: `≈ ${pointsToLKR(totalPoints)}` },
          { label: "Pickups", value: `${myRequests.length}`, sub: `${completedPickups} collected` },
          { label: "Vouchers", value: `${vouchers.length}`, sub: "available" },
        ].map((s) => (
          <View key={s.label} className="flex-1 items-center gap-1 rounded-2xl border border-border bg-card p-3">
            <Text className="text-lg font-bold text-foreground">{s.value}</Text>
            <Text className="text-xs font-medium text-muted-foreground">{s.label}</Text>
            <Text className="text-[10px] text-muted-foreground">{s.sub}</Text>
          </View>
        ))}
      </View>

      <Card>
        <CardHeader className="flex-row items-center gap-2 p-4 pb-2">
          <Coins size={18} color="#0099FF" />
          <View className="flex-1">
            <CardTitle>Points History</CardTitle>
            <CardDescription>Earned and redeemed points</CardDescription>
          </View>
        </CardHeader>
        <CardContent className="gap-2">
          {recentTxns.length === 0 ? (
            <View className="items-center py-6">
              <Sparkles size={24} color="#8fa3b8" />
              <Text className="mt-2 text-center text-sm text-muted-foreground">No points yet — book a pickup to earn!</Text>
            </View>
          ) : (
            recentTxns.map((t) => (
              <View key={t.id} className="flex-row items-center justify-between rounded-xl border border-border bg-card p-3">
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Text className="text-lg">{WASTAGE_META[t.wastageType]?.icon ?? "♻️"}</Text>
                  </View>
                  <View>
                    <Text className="text-sm font-medium text-foreground">
                      {t.kind === "redeem" ? `🎁 ${t.voucherName || "Voucher"}` : `${t.wastageType} • ${t.fillPct}% fill`}
                    </Text>
                    <Text className="text-xs text-muted-foreground">{fmtDate(t.date, "MMM d, yyyy")}</Text>
                  </View>
                </View>
                <Text className={`font-bold ${t.points > 0 ? "text-sapphire-500" : "text-destructive"}`}>
                  {t.points > 0 ? "+" : ""}{Math.round(t.points).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2 p-4 pb-2">
          <ClipboardList size={18} color="#0099FF" />
          <View className="flex-1">
            <CardTitle>Pickup History</CardTitle>
            <CardDescription>Your past pickup requests</CardDescription>
          </View>
        </CardHeader>
        <CardContent className="gap-2">
          {recentRequests.length === 0 ? (
            <View className="items-center py-6">
              <History size={24} color="#8fa3b8" />
              <Text className="mt-2 text-center text-sm text-muted-foreground">No pickups requested yet</Text>
            </View>
          ) : (
            recentRequests.map((r) => (
              <View key={r.id} className="flex-row items-center justify-between rounded-xl border border-border bg-card p-3">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground">{r.wastageType} pickup</Text>
                  <Text className="text-xs text-muted-foreground">
                    {fmtDate(r.createdAt, "MMM d, yyyy")}{r.pointsAwarded ? ` • +${Math.round(r.pointsAwarded)} pts` : ""}
                  </Text>
                </View>
                <Badge className={statusStyles[r.status] ?? ""}>
                  <Text className={`text-xs font-semibold capitalize ${statusText[r.status] ?? "text-muted-foreground"}`}>{r.status}</Text>
                </Badge>
              </View>
            ))
          )}
        </CardContent>
      </Card>

      <AccountSection />
    </ScrollView>
  );
}
