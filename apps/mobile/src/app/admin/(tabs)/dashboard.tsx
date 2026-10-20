import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Battery, Gauge, Clock, MapPin, Activity, X } from "lucide-react-native";
import { useBins } from "@/lib/hooks/queries";
import { Card, CardContent } from "@/components/ui";
import { getFillColor, getFillLevel, MAP_CENTER } from "@/lib/constants";
import type { Bin } from "@/types";
import { fmtDate, fmtFillPct } from "@/lib/dates";

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { data: bins = [] } = useBins();
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);

  const greenCount = bins.filter((b) => b.fillPct < 50).length;
  const yellowCount = bins.filter((b) => b.fillPct >= 50 && b.fillPct < 80).length;
  const redCount = bins.filter((b) => b.fillPct >= 80).length;

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-3">
        <Text className="text-xl font-bold text-foreground">Operations Map</Text>
        <Text className="text-xs text-muted-foreground">Monitor all municipal smart bins in real-time</Text>
      </View>

      <View className="mt-2 flex-row gap-2 px-4">
        {[
          { label: "Total Bins", value: bins.length, dot: "#0099FF" },
          { label: "Low", value: greenCount, dot: "#22c55e" },
          { label: "High", value: yellowCount, dot: "#eab308" },
          { label: "Critical", value: redCount, dot: "#ef4444" },
        ].map((s) => (
          <Card key={s.label} className="flex-1">
            <CardContent className="p-2.5">
              <View className="flex-row items-center gap-1.5">
                <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.dot }} />
                <Text className="text-base font-bold text-foreground">{s.value}</Text>
              </View>
              <Text className="text-[10px] text-muted-foreground">{s.label}</Text>
            </CardContent>
          </Card>
        ))}
      </View>

      <View className="mx-4 mt-2 flex-1 overflow-hidden rounded-xl border border-border">
        <MapView
          style={{ flex: 1 }}
          initialRegion={{ latitude: MAP_CENTER.lat, longitude: MAP_CENTER.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        >
          {bins.map((bin) => (
            <Marker
              key={bin.id}
              coordinate={{ latitude: bin.lat, longitude: bin.lng }}
              pinColor={getFillColor(bin.fillPct)}
              title={bin.label}
              description={`${fmtFillPct(bin.fillPct)} full • ${bin.wasteType}`}
              onPress={() => setSelectedBin(bin)}
            />
          ))}
        </MapView>
      </View>

      <Modal visible={!!selectedBin} transparent animationType="slide" onRequestClose={() => setSelectedBin(null)}>
        <Pressable className="flex-1 justify-end bg-black/50" onPress={() => setSelectedBin(null)}>
          <ScrollView className="max-h-[80%] rounded-t-3xl bg-card" contentContainerClassName="p-5" style={{ paddingBottom: insets.bottom }}>
            {selectedBin && (
              <>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="h-3 w-3 rounded-full" style={{ backgroundColor: getFillColor(selectedBin.fillPct) }} />
                    <Text className="text-base font-semibold text-foreground">{selectedBin.label}</Text>
                  </View>
                  <Pressable onPress={() => setSelectedBin(null)} className="rounded-lg p-1 active:bg-muted">
                    <X size={20} color="#8fa3b8" />
                  </Pressable>
                </View>
                <Text className="mt-0.5 text-sm text-muted-foreground">JSN-SR04T Sensor Telemetry</Text>

                <View className="mt-4 rounded-xl border border-border p-3">
                  <View className="flex-row items-center gap-1">
                    <MapPin size={12} color="#8fa3b8" />
                    <Text className="flex-1 text-sm text-muted-foreground">{selectedBin.address}</Text>
                  </View>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    Device: <Text className="font-mono">{selectedBin.deviceId}</Text>
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Size: {selectedBin.sizeL}L • {selectedBin.isPublic ? "Public" : "Private"} • {selectedBin.region}
                  </Text>
                </View>

                <View className="mt-3 flex-row flex-wrap gap-2">
                  {[
                    { Icon: Gauge, label: "Air Gap", value: `${selectedBin.airGapCm} cm` },
                    { Icon: Activity, label: "Fill Level", value: `${fmtFillPct(selectedBin.fillPct)} (${getFillLevel(selectedBin.fillPct)})` },
                    { Icon: Battery, label: "Battery", value: `${selectedBin.batteryPct}%` },
                    { Icon: Clock, label: "Last Ping", value: fmtDate(selectedBin.lastPingAt, "MMM d, HH:mm") },
                  ].map(({ Icon, label, value }) => (
                    <View key={label} className="min-w-[45%] flex-1 rounded-xl border border-border p-3">
                      <View className="flex-row items-center gap-1.5">
                        <Icon size={14} color="#0099FF" />
                        <Text className="text-xs text-muted-foreground">{label}</Text>
                      </View>
                      <Text className="mt-1 text-base font-bold text-foreground">{value}</Text>
                    </View>
                  ))}
                </View>

                <View className="mt-3 rounded-xl border border-sapphire-500/20 bg-sapphire-500/5 p-3">
                  <Text className="text-xs text-muted-foreground">
                    Live readings from the bin&apos;s JSN-SR04T ultrasonic sensor. Fill levels update as
                    collections are verified in the field and as devices ping.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </Pressable>
      </Modal>
    </View>
  );
}
