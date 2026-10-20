import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { Search, AlertTriangle, XCircle, Camera, MessageSquare } from "lucide-react-native";
import { useRequests, useBins, useCollectors } from "@/lib/hooks/queries";
import { Card, CardContent, IconInput } from "@/components/ui";
import { WASTAGE_META, WASTAGE_TYPES } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";

export default function AdminAuditLog() {
  const { data: requests = [] } = useRequests();
  const { data: bins = [] } = useBins();
  const { data: collectors = [] } = useCollectors();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterFlag, setFilterFlag] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const completedRequests = requests
    .filter((r) => r.status === "collected")
    .sort((a, b) => new Date(b.collectedAt || "").getTime() - new Date(a.collectedAt || "").getTime());

  const filtered = completedRequests.filter((r) => {
    const bin = bins.find((b) => b.id === r.binId);
    const collector = collectors.find((c) => c.id === r.collectorId);
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      bin?.label.toLowerCase().includes(q) ||
      collector?.name.toLowerCase().includes(q) ||
      r.driverComment?.toLowerCase().includes(q);
    const matchesType = filterType === "all" || r.wastageType === filterType;
    const matchesFlag =
      filterFlag === "all" ||
      (filterFlag === "mismatch" && r.mismatchFlag) ||
      (filterFlag === "invalid" && r.invalidFlag) ||
      (filterFlag === "clean" && !r.mismatchFlag && !r.invalidFlag);
    return matchesSearch && matchesType && matchesFlag;
  });

  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <Text className="text-2xl font-bold text-foreground">Audit Log</Text>
      <Text className="mb-4 text-muted-foreground">Master record of all completed collections</Text>

      <Card>
        <CardContent className="gap-3 p-4">
          <IconInput
            icon={<Search size={16} color="#8fa3b8" />}
            value={search}
            onChangeText={setSearch}
            placeholder="Search bin, collector, comment…"
          />
          <View className="flex-row flex-wrap gap-1">
            {["all", ...WASTAGE_TYPES].map((t) => (
              <Pressable
                key={t}
                onPress={() => setFilterType(t)}
                className={`rounded-lg border px-2.5 py-1.5 ${filterType === t ? "border-sapphire-500 bg-sapphire-500/10" : "border-border"}`}
              >
                <Text className={`text-xs ${filterType === t ? "font-semibold text-sapphire-500" : "text-muted-foreground"}`}>
                  {t === "all" ? "All Types" : t}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="flex-row flex-wrap gap-1">
            {[
              ["all", "All Records"],
              ["clean", "Clean"],
              ["mismatch", "Mismatched"],
              ["invalid", "Invalid/Contaminated"],
            ].map(([v, label]) => (
              <Pressable
                key={v}
                onPress={() => setFilterFlag(v)}
                className={`rounded-lg border px-2.5 py-1.5 ${filterFlag === v ? "border-sapphire-500 bg-sapphire-500/10" : "border-border"}`}
              >
                <Text className={`text-xs ${filterFlag === v ? "font-semibold text-sapphire-500" : "text-muted-foreground"}`}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-xs text-muted-foreground">{filtered.length} completed collections</Text>

          {filtered.length === 0 ? (
            <Text className="py-6 text-center text-muted-foreground">No records found.</Text>
          ) : (
            filtered.map((req) => {
              const bin = bins.find((b) => b.id === req.binId);
              const collector = collectors.find((c) => c.id === req.collectorId);
              const isExpanded = expandedId === req.id;
              return (
                <View key={req.id} className="rounded-xl border border-border">
                  <Pressable onPress={() => setExpandedId(isExpanded ? null : req.id)} className="p-3 active:bg-muted">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-sm text-muted-foreground">
                          {req.collectedAt && fmtDate(req.collectedAt, "MMM d, yyyy")}
                        </Text>
                        <View className="flex-row flex-wrap items-center gap-1.5">
                          <Text className="text-sm">{WASTAGE_META[req.wastageType].icon}</Text>
                          <Text className="text-sm font-medium text-foreground">{bin?.label || "Unknown"}</Text>
                          {req.mismatchFlag && (
                            <View className="flex-row items-center gap-0.5 rounded-full border border-amber-500 px-1.5">
                              <AlertTriangle size={9} color="#d97706" />
                              <Text className="text-[10px] text-amber-600 dark:text-amber-400">Mismatch</Text>
                            </View>
                          )}
                          {req.invalidFlag && (
                            <View className="flex-row items-center gap-0.5 rounded-full bg-destructive/10 px-1.5">
                              <XCircle size={9} color="#dc2626" />
                              <Text className="text-[10px] text-destructive">Invalid</Text>
                            </View>
                          )}
                          {!req.mismatchFlag && !req.invalidFlag && (
                            <View className="rounded-full border border-green-500 px-1.5">
                              <Text className="text-[10px] text-green-600 dark:text-green-400">Clean</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-muted-foreground">{collector?.name || "Unknown"}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-xs text-muted-foreground">{req.observedFillPct}%</Text>
                        <Text className={`font-bold ${(req.pointsAwarded || 0) > 0 ? "text-sapphire-500" : "text-destructive"}`}>
                          {Math.round(req.pointsAwarded || 0)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                  {isExpanded && (
                    <View className="gap-1.5 border-t border-border bg-muted/30 p-3">
                      {req.actualWastageType && req.actualWastageType !== req.wastageType && (
                        <Text className="text-sm text-foreground">
                          Actual material: {WASTAGE_META[req.actualWastageType].icon} {req.actualWastageType}
                        </Text>
                      )}
                      {req.driverComment && (
                        <View className="flex-row items-start gap-1">
                          <MessageSquare size={12} color="#8fa3b8" />
                          <Text className="flex-1 text-sm text-muted-foreground">Driver comment: {req.driverComment}</Text>
                        </View>
                      )}
                      {req.photoRef && (
                        <View className="flex-row items-center gap-1">
                          {req.photoRef.startsWith("http") ? (
                            <>
                              <Image source={{ uri: req.photoRef }} style={{ width: 64, height: 64, borderRadius: 6 }} />
                              <Text className="text-xs text-sapphire-500">Photo evidence</Text>
                            </>
                          ) : (
                            <>
                              <Camera size={12} color="#8fa3b8" />
                              <Text className="text-xs text-muted-foreground">Photo ref: {req.photoRef}</Text>
                            </>
                          )}
                        </View>
                      )}
                      <Text className="text-xs text-muted-foreground">Request ID: {req.id}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
}
