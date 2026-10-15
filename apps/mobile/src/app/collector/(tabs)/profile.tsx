import { ScrollView, Text, View } from "react-native";
import { History, Star, Truck } from "lucide-react-native";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRequests } from "@/lib/hooks/queries";
import { ProfileHeader } from "@/components/profile/profile-header";
import { AccountSection } from "@/components/profile/account-section";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@/components/ui";
import { WASTAGE_META } from "@/lib/constants";
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

export default function CollectorProfile() {
  const user = useAuthStore((s) => s.user);
  const { data: requests = [] } = useRequests();

  const collector = user?.collectorProfile;
  const myJobs = requests.filter((r) => r.collectorId === collector?.id);
  const completed = myJobs.filter((r) => r.status === "collected");
  const activeJobs = myJobs.filter((r) => r.status === "claimed").length;
  const recentJobs = [...myJobs]
    .sort((a, b) => new Date(b.claimedAt ?? b.createdAt).getTime() - new Date(a.claimedAt ?? a.createdAt).getTime())
    .slice(0, 8);

  if (!user) return null;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="gap-4 p-4 pb-8">
      <View>
        <Text className="text-2xl font-bold text-foreground">Profile</Text>
        <Text className="text-muted-foreground">Your collector account and job history</Text>
      </View>

      <ProfileHeader
        name={user.name}
        email={user.email}
        role="collector"
        extra={collector?.status === "approved" ? "Approved" : collector?.status === "pending" ? "Pending approval" : "Suspended"}
      />

      <View className="flex-row gap-3">
        {[
          { label: "Total Jobs", value: `${collector?.totalJobs ?? completed.length}`, sub: "lifetime" },
          { label: "Active", value: `${activeJobs}`, sub: "in progress" },
          { label: "Penalties", value: `${collector?.penaltyCount ?? 0}`, sub: "flags" },
        ].map((s) => (
          <View key={s.label} className="flex-1 items-center gap-1 rounded-2xl border border-border bg-card p-3">
            <Text className="text-lg font-bold text-foreground">{s.value}</Text>
            <Text className="text-xs font-medium text-muted-foreground">{s.label}</Text>
            <Text className="text-[10px] text-muted-foreground">{s.sub}</Text>
          </View>
        ))}
      </View>

      {collector ? (
        <Card>
          <CardHeader className="flex-row items-center gap-2 p-4 pb-2">
            <Truck size={18} color="#0099FF" />
            <CardTitle>Collector Details</CardTitle>
          </CardHeader>
          <CardContent className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted-foreground">Member since</Text>
              <Text className="text-sm font-medium text-foreground">{fmtDate(collector.joinedAt, "MMM d, yyyy")}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted-foreground">Status</Text>
              <Badge className={collector.status === "approved" ? "bg-emerald-500/15" : "bg-amber-500/15"}>
                <Text className={`text-xs font-semibold capitalize ${collector.status === "approved" ? "text-emerald-600" : "text-amber-600"}`}>
                  {collector.status}
                </Text>
              </Badge>
            </View>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center gap-2 p-4 pb-2">
          <Star size={18} color="#0099FF" />
          <View className="flex-1">
            <CardTitle>Job History</CardTitle>
            <CardDescription>Your claimed and completed pickups</CardDescription>
          </View>
        </CardHeader>
        <CardContent className="gap-2">
          {recentJobs.length === 0 ? (
            <View className="items-center py-6">
              <History size={24} color="#8fa3b8" />
              <Text className="mt-2 text-center text-sm text-muted-foreground">No jobs claimed yet — grab one from the Map!</Text>
            </View>
          ) : (
            recentJobs.map((r) => (
              <View key={r.id} className="flex-row items-center justify-between rounded-xl border border-border bg-card p-3">
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Text className="text-lg">{WASTAGE_META[r.wastageType]?.icon ?? "♻️"}</Text>
                  </View>
                  <View>
                    <Text className="text-sm font-medium text-foreground">{r.wastageType} pickup</Text>
                    <Text className="text-xs text-muted-foreground">
                      {fmtDate(r.claimedAt ?? r.createdAt, "MMM d, yyyy")}
                      {r.pointsAwarded ? ` • +${Math.round(r.pointsAwarded)} pts awarded` : ""}
                    </Text>
                  </View>
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
