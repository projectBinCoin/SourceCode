import { ScrollView, Text, View } from "react-native";
import { History, MapPin, AlertTriangle, XCircle } from "lucide-react-native";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRequests, useBins, useCollectors } from "@/lib/hooks/queries";
import { Card, CardContent } from "@/components/ui";
import { WASTAGE_META } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";

export default function CollectorHistory() {
  const user = useAuthStore((s) => s.user);
  const { data: requests = [] } = useRequests();
  const { data: bins = [] } = useBins();
  const { data: collectors = [] } = useCollectors();

  const collector = collectors.find((c) => c.userId === user?.id);
  const myJobs = requests
    .filter((r) => r.collectorId === collector?.id && r.status === "collected")
    .sort((a, b) => new Date(b.collectedAt || "").getTime() - new Date(a.collectedAt || "").getTime());

  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <Text className="text-2xl font-bold text-foreground">Collection History</Text>
      <Text className="mb-4 text-muted-foreground">Your completed pickup jobs</Text>

      <View className="flex-row gap-3">
        <Card className="flex-1">
          <CardContent className="p-4">
            <Text className="text-2xl font-bold text-foreground">{myJobs.length}</Text>
            <Text className="text-xs text-muted-foreground">Total Jobs</Text>
          </CardContent>
        </Card>
        <Card className="flex-1 border-sapphire-500/10">
          <CardContent className="p-4">
            <Text className="text-2xl font-bold text-sapphire-500">
              {Math.round(myJobs.reduce((sum, r) => sum + (r.pointsAwarded || 0), 0)).toLocaleString()}
            </Text>
            <Text className="text-xs text-muted-foreground">Points Issued</Text>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-4">
            <Text className="text-2xl font-bold text-destructive">{myJobs.filter((r) => r.invalidFlag).length}</Text>
            <Text className="text-xs text-muted-foreground">Penalties</Text>
          </CardContent>
        </Card>
      </View>

      {myJobs.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="items-center py-12">
            <History size={36} color="#8fa3b8" />
            <Text className="mt-2 text-muted-foreground">No completed jobs yet.</Text>
          </CardContent>
        </Card>
      ) : (
        <View className="mt-4 gap-3">
          {myJobs.map((job) => {
            const bin = bins.find((b) => b.id === job.binId);
            return (
              <Card key={job.id}>
                <CardContent className="p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 gap-1">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="text-lg">{WASTAGE_META[job.wastageType].icon}</Text>
                        <Text className="font-medium text-foreground">{job.wastageType}</Text>
                        {job.mismatchFlag && (
                          <View className="flex-row items-center gap-1 rounded-full border border-amber-500 px-2 py-0.5">
                            <AlertTriangle size={10} color="#d97706" />
                            <Text className="text-xs text-amber-600 dark:text-amber-400">Mismatch</Text>
                          </View>
                        )}
                        {job.invalidFlag && (
                          <View className="flex-row items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5">
                            <XCircle size={10} color="#dc2626" />
                            <Text className="text-xs text-destructive">Invalid</Text>
                          </View>
                        )}
                      </View>
                      {bin && (
                        <View className="flex-row items-center gap-1">
                          <MapPin size={12} color="#8fa3b8" />
                          <Text className="text-sm text-muted-foreground">{bin.label}</Text>
                        </View>
                      )}
                      <Text className="text-xs text-muted-foreground">
                        {job.collectedAt && fmtDate(job.collectedAt, "MMM d, yyyy 'at' HH:mm")}
                      </Text>
                      {job.driverComment && (
                        <Text className="mt-1 text-sm text-muted-foreground">💬 {job.driverComment}</Text>
                      )}
                      {job.photoRef && (
                        <Text className="mt-1 text-xs text-muted-foreground">📷 Photo evidence captured</Text>
                      )}
                    </View>
                    <View className="items-end">
                      <Text className="text-xs text-muted-foreground">Fill: {job.observedFillPct}%</Text>
                      <Text className={`text-lg font-bold ${(job.pointsAwarded || 0) > 0 ? "text-sapphire-500" : "text-destructive"}`}>
                        {Math.round(job.pointsAwarded || 0)} pts
                      </Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
