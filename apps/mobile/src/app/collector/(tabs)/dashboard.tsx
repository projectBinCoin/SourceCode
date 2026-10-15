import { useEffect, useRef, useState } from "react";
import { Linking, Modal, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapPin, Trash2, Hand, Navigation, ShieldAlert, LocateFixed } from "lucide-react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRequests, useBins, useCollectors, useUserName } from "@/lib/hooks/queries";
import { useClaimJob } from "@/lib/hooks/mutations";
import { Button, Card, CardContent } from "@/components/ui";
import { WASTAGE_META, COLLECTOR_RADIUS_KM, HIGH_FILL_THRESHOLD, MAP_CENTER } from "@/lib/constants";
import { haversineKm } from "@/lib/points";
import type { Bin, PickupRequest } from "@/types";

type Selection = { type: "job" | "bin"; req?: PickupRequest; bin?: Bin } | null;

export default function CollectorDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: requests = [] } = useRequests();
  const { data: bins = [] } = useBins();
  const { data: collectors = [] } = useCollectors();
  const claimJob = useClaimJob();

  const insets = useSafeAreaInsets();
  const collector = collectors.find((c) => c.userId === user?.id);

  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geo, setGeo] = useState<"requesting" | "tracking" | "denied" | "unavailable">("requesting");
  const [selected, setSelected] = useState<Selection>(null);
  const mapRef = useRef<MapView>(null);
  const centeredRef = useRef(false);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGeo("denied");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setGeo("tracking");
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (p) => setLiveLocation({ lat: p.coords.latitude, lng: p.coords.longitude })
      );
    })();
    return () => subscription?.remove();
  }, []);

  // Animate to the live position once — after that the user pans freely.
  useEffect(() => {
    if (!liveLocation || centeredRef.current) return;
    centeredRef.current = true;
    mapRef.current?.animateToRegion(
      { latitude: liveLocation.lat, longitude: liveLocation.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 },
      800
    );
  }, [liveLocation]);

  const center = liveLocation ?? {
    lat: collector?.lat || MAP_CENTER.lat,
    lng: collector?.lng || MAP_CENTER.lng,
  };

  const availableJobs = requests.filter((r) => r.status === "pending");
  const highFillBins = bins.filter((b) => b.isPublic && b.fillPct >= HIGH_FILL_THRESHOLD);

  const visibleBins = bins.filter(
    (b) => haversineKm(center.lat, center.lng, b.lat, b.lng) <= COLLECTOR_RADIUS_KM
  );
  const visibleJobs = availableJobs.filter((r) => {
    const bin = bins.find((b) => b.id === r.binId);
    return bin && haversineKm(center.lat, center.lng, bin.lat, bin.lng) <= COLLECTOR_RADIUS_KM;
  });

  const selectedBin = selected?.type === "bin" ? selected.bin : selected?.req ? bins.find((b) => b.id === selected.req!.binId) : undefined;
  const citizenName = useUserName(selected?.req?.citizenId);

  const handleClaim = (req: PickupRequest) => {
    if (!collector) return;
    claimJob(req.id, collector.id);
    setSelected(null);
    router.push(`/collector/active-job/${req.id}`);
  };

  const navigate = (lat: number, lng: number) =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`);

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between gap-2 px-4 pt-3">
        <View className="flex-1">
          <Text className="text-xl font-bold text-foreground">Collector Dashboard</Text>
          <Text className="text-xs text-muted-foreground">Nearby pickup requests and high-fill bins</Text>
        </View>
        {geo === "tracking" ? (
          <View className="flex-row items-center gap-1.5 rounded-full border border-green-500/40 px-2.5 py-1">
            <View className="h-2 w-2 rounded-full bg-green-500" />
            <Text className="text-xs font-medium text-green-600 dark:text-green-400">Live</Text>
          </View>
        ) : (
          <Pressable onPress={async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === "granted") setGeo("requesting");
          }} className="flex-row items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5">
            <LocateFixed size={14} color="#8fa3b8" />
            <Text className="text-xs text-muted-foreground">{geo === "denied" ? "Location Blocked" : "Enable Location"}</Text>
          </Pressable>
        )}
      </View>

      {geo === "denied" && (
        <View className="mx-4 mt-2 flex-row items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-2.5">
          <ShieldAlert size={14} color="#d97706" />
          <Text className="flex-1 text-xs text-amber-700 dark:text-amber-400">
            Location access is blocked — allow it in device settings to see jobs near you as you move.
          </Text>
        </View>
      )}

      <View className="mt-2 flex-row gap-2 px-4">
        {[
          { label: "Available Jobs", value: availableJobs.length },
          { label: "Critical Bins", value: highFillBins.length },
          { label: "In Radius", value: visibleJobs.length + visibleBins.length },
        ].map((s) => (
          <Card key={s.label} className="flex-1">
            <CardContent className="p-3">
              <Text className="text-xl font-bold text-foreground">{s.value}</Text>
              <Text className="text-[10px] text-muted-foreground">{s.label}</Text>
            </CardContent>
          </Card>
        ))}
      </View>

      <View className="mx-4 mt-2 flex-1 overflow-hidden rounded-xl border border-border">
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
          showsUserLocation
          followsUserLocation={false}
        >
          <Circle
            center={{ latitude: center.lat, longitude: center.lng }}
            radius={COLLECTOR_RADIUS_KM * 1000}
            strokeColor="rgba(0,153,255,0.4)"
            fillColor="rgba(0,153,255,0.08)"
            strokeWidth={2}
          />
          {visibleBins.map((bin) => (
            <Marker
              key={bin.id}
              coordinate={{ latitude: bin.lat, longitude: bin.lng }}
              pinColor={bin.fillPct >= 80 ? "#ef4444" : bin.fillPct >= 50 ? "#eab308" : "#22c55e"}
              title={bin.label}
              description={`${bin.fillPct}% full • ${bin.wasteType}`}
              onPress={() => setSelected({ type: "bin", bin })}
            />
          ))}
          {visibleJobs.map((req) => {
            const bin = bins.find((b) => b.id === req.binId);
            if (!bin) return null;
            return (
              <Marker
                key={req.id}
                coordinate={{ latitude: bin.lat, longitude: bin.lng }}
                pinColor="#f97316"
                title={`Job: ${bin.label}`}
                description={`${req.wastageType} • ${req.preferredSlot}`}
                onPress={() => setSelected({ type: "job", req })}
              />
            );
          })}
        </MapView>
      </View>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable className="flex-1 justify-end bg-black/50" onPress={() => setSelected(null)}>
          <Pressable className="rounded-t-3xl bg-card p-5" style={{ paddingBottom: 20 + insets.bottom }} onPress={(e) => e.stopPropagation()}>
            {selected?.type === "job" && selectedBin && (
              <>
                <View className="flex-row items-center gap-2">
                  <Trash2 size={20} color="#f97316" />
                  <Text className="text-base font-semibold text-foreground">Pickup Job</Text>
                </View>
                <Text className="mt-0.5 text-sm text-muted-foreground">Review and claim this collection job</Text>
                <View className="mt-4 gap-1.5">
                  <View className="flex-row items-center gap-2">
                    <MapPin size={14} color="#8fa3b8" />
                    <Text className="font-medium text-foreground">{selectedBin.label}</Text>
                  </View>
                  <Text className="pl-6 text-sm text-muted-foreground">{selectedBin.address}</Text>
                  <Text className="pl-6 text-sm text-muted-foreground">
                    {WASTAGE_META[selected.req!.wastageType].icon} {selected.req!.wastageType}
                  </Text>
                  <Text className="pl-6 text-sm text-muted-foreground">Preferred: {selected.req!.preferredSlot}</Text>
                  <Text className="pl-6 text-sm text-muted-foreground">Citizen: {citizenName}</Text>
                </View>
                <View className="mt-3 rounded-xl border border-border p-3">
                  {[
                    ["Bin Size", `${selectedBin.sizeL}L`],
                    ["Fill Level", `${selectedBin.fillPct}%`],
                    ["Distance", `${haversineKm(center.lat, center.lng, selectedBin.lat, selectedBin.lng).toFixed(2)} km`],
                  ].map(([k, v]) => (
                    <View key={k} className="flex-row justify-between py-0.5">
                      <Text className="text-sm text-muted-foreground">{k}</Text>
                      <Text className="text-sm font-medium text-foreground">{v}</Text>
                    </View>
                  ))}
                </View>
                <View className="mt-3 flex-row gap-2">
                  <Button variant="outline" className="flex-1" onPress={() => navigate(selectedBin.lat, selectedBin.lng)}>
                    <Navigation size={16} color="#8fa3b8" />
                    <Text className="text-sm font-medium text-foreground">Navigate</Text>
                  </Button>
                  <Button className="flex-1 bg-sapphire-500" onPress={() => handleClaim(selected.req!)}>
                    <Hand size={16} color="#ffffff" />
                    <Text className="text-sm font-semibold text-white">Claim Job</Text>
                  </Button>
                </View>
              </>
            )}
            {selected?.type === "bin" && selectedBin && (
              <>
                <View className="flex-row items-center gap-2">
                  <MapPin size={20} color="#ef4444" />
                  <Text className="text-base font-semibold text-foreground">High-Fill Smart Bin</Text>
                </View>
                <Text className="mt-0.5 text-sm text-muted-foreground">This bin needs urgent collection</Text>
                <View className="mt-4">
                  <Text className="font-medium text-foreground">{selectedBin.label}</Text>
                  <Text className="text-sm text-muted-foreground">{selectedBin.address}</Text>
                </View>
                <View className="mt-3 rounded-xl border border-border p-3">
                  {[
                    ["Fill Level", `${selectedBin.fillPct}% Full`],
                    ["Bin Size", `${selectedBin.sizeL}L`],
                    ["Device ID", selectedBin.deviceId],
                    ["Distance", `${haversineKm(center.lat, center.lng, selectedBin.lat, selectedBin.lng).toFixed(2)} km`],
                  ].map(([k, v]) => (
                    <View key={k} className="flex-row justify-between py-0.5">
                      <Text className="text-sm text-muted-foreground">{k}</Text>
                      <Text className="text-sm font-medium text-foreground">{v}</Text>
                    </View>
                  ))}
                </View>
                <Button variant="outline" className="mt-3" onPress={() => navigate(selectedBin.lat, selectedBin.lng)}>
                  <Navigation size={16} color="#8fa3b8" />
                  <Text className="text-sm font-medium text-foreground">Navigate to Bin</Text>
                </Button>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
