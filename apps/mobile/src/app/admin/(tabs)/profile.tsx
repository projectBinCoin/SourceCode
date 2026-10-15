import { ScrollView, Text, View } from "react-native";
import { ClipboardList, Recycle, Users, Wrench } from "lucide-react-native";
import { useAuthStore } from "@/lib/store/auth-store";
import { useBins, useCollectors, useRequests, useUsers } from "@/lib/hooks/queries";
import { ProfileHeader } from "@/components/profile/profile-header";
import { AccountSection } from "@/components/profile/account-section";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@/components/ui";

export default function AdminProfile() {
  const user = useAuthStore((s) => s.user);
  const { data: users = [] } = useUsers();
  const { data: collectors = [] } = useCollectors();
  const { data: bins = [] } = useBins();
  const { data: requests = [] } = useRequests();

  const pendingCollectors = collectors.filter((c) => c.status === "pending").length;
  const pendingRequests = requests.filter((r) => r.status === "pending").length;
  const pendingBins = bins.filter((b) => b.approvalStatus === "pending").length;

  if (!user) return null;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="gap-4 p-4 pb-8">
      <View>
        <Text className="text-2xl font-bold text-foreground">Profile</Text>
        <Text className="text-muted-foreground">Administrator account and platform overview</Text>
      </View>

      <ProfileHeader name={user.name} email={user.email} role="admin" extra="Full control" />

      <View className="flex-row gap-3">
        {[
          { label: "Users", value: `${users.length}`, icon: Users },
          { label: "Collectors", value: `${collectors.length}`, icon: ClipboardList },
          { label: "Bins", value: `${bins.length}`, icon: Recycle },
        ].map((s) => (
          <View key={s.label} className="flex-1 items-center gap-1 rounded-2xl border border-border bg-card p-3">
            <s.icon size={18} color="#0099FF" />
            <Text className="text-lg font-bold text-foreground">{s.value}</Text>
            <Text className="text-xs font-medium text-muted-foreground">{s.label}</Text>
          </View>
        ))}
      </View>

      <Card>
        <CardHeader className="flex-row items-center gap-2 p-4 pb-2">
          <Wrench size={18} color="#0099FF" />
          <View className="flex-1">
            <CardTitle>Needs Attention</CardTitle>
            <CardDescription>Items waiting for admin action</CardDescription>
          </View>
        </CardHeader>
        <CardContent className="gap-2">
          {[
            { label: "Pending collector approvals", count: pendingCollectors },
            { label: "Open pickup requests", count: pendingRequests },
            { label: "Bins awaiting approval", count: pendingBins },
          ].map((row) => (
            <View key={row.label} className="flex-row items-center justify-between rounded-xl border border-border bg-card p-3">
              <Text className="text-sm text-foreground">{row.label}</Text>
              <Badge className={row.count > 0 ? "bg-amber-500/15" : "bg-emerald-500/15"}>
                <Text className={`text-xs font-semibold ${row.count > 0 ? "text-amber-600" : "text-emerald-600"}`}>{row.count}</Text>
              </Badge>
            </View>
          ))}
        </CardContent>
      </Card>

      <AccountSection />
    </ScrollView>
  );
}
