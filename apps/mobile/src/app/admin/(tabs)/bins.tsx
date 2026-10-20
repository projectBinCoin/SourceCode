import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {Modal, Pressable, ScrollView, Text, View, useColorScheme } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Plus, MapPin, Check, X, Clock, X as CloseIcon, ShieldCheck, Pencil } from "lucide-react-native";
import { router } from "expo-router";
import { useBins } from "@/lib/hooks/queries";
import { useAddBin, useApproveBin, useRejectBin, useRequestRecalibration } from "@/lib/hooks/mutations";
import { Button, Card, CardContent, Input, Label } from "@/components/ui";
import { BIN_SIZES, MAP_CENTER, WASTAGE_TYPES, WASTAGE_META, getFillColor } from "@/lib/constants";
import type { BinSize, WastageType } from "@/types";
import { fmtDate, fmtFillPct } from "@/lib/dates";

export default function AdminBins() {
  const dark = useColorScheme() === "dark";
  const { data: bins = [] } = useBins();
  const addBin = useAddBin();
  const requestRecalibration = useRequestRecalibration();
  const approveBin = useApproveBin();
  const insets = useSafeAreaInsets();
  const rejectBin = useRejectBin();

  const [tab, setTab] = useState<"approved" | "pending">("approved");
  const [showForm, setShowForm] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [label, setLabel] = useState("");
  const [sizeL, setSizeL] = useState<BinSize>(100);
  const [wasteType, setWasteType] = useState<WastageType>("Plastic");
  const [coords, setCoords] = useState(MAP_CENTER);
  const [address, setAddress] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [region, setRegion] = useState("Colombo 07");
  const [deviceIdError, setDeviceIdError] = useState("");

  const pendingBins = bins.filter((b) => b.approvalStatus === "pending");
  const approvedBins = bins.filter((b) => b.approvalStatus === "approved" || !b.approvalStatus);

  const resetForm = () => {
    setDeviceId("");
    setLabel("");
    setSizeL(100);
    setWasteType("Plastic");
    setCoords(MAP_CENTER);
    setAddress("");
    setIsPublic(true);
    setRegion("Colombo 07");
    setDeviceIdError("");
  };

  const handleSubmit = () => {
    if (!deviceId.trim()) {
      setDeviceIdError("Device ID is required");
      return;
    }
    if (bins.some((b) => b.deviceId === deviceId)) {
      setDeviceIdError("Device ID already exists");
      return;
    }
    if (!label.trim()) return;

    addBin({
      deviceId,
      label,
      lat: coords.lat,
      lng: coords.lng,
      address: address || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
      sizeL,
      fillPct: 0,
      isPublic,
      region,
      wasteType,
    });

    resetForm();
    setShowForm(false);
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-foreground">Smart Bin Registry</Text>
          <Text className="text-xs text-muted-foreground">Register, approve, and manage all bins</Text>
        </View>
        <Button size="sm" className="bg-sapphire-500" onPress={() => setShowForm(true)}>
          <Plus size={16} color="#ffffff" />
          <Text className="text-sm font-semibold text-white">New Bin</Text>
        </Button>
      </View>

      <View className="mt-3 flex-row rounded-xl bg-muted p-1">
        {(["approved", "pending"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2" style={tab === t ? { backgroundColor: dark ? "#0b1d3a" : "#ffffff", elevation: 2 } : undefined}>
            <Text className={`text-sm font-medium ${tab === t ? "text-foreground" : "text-muted-foreground"}`}>
              {t === "approved" ? `Approved (${approvedBins.length})` : "Pending Approval"}
            </Text>
            {t === "pending" && pendingBins.length > 0 && (
              <View className="rounded-full bg-destructive px-1.5">
                <Text className="text-xs font-semibold text-white">{pendingBins.length}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {tab === "approved" && (
        <View className="mt-4 gap-2">
          {approvedBins.length === 0 ? (
            <Card>
              <CardContent className="items-center py-12">
                <Text className="text-muted-foreground">No registered bins yet.</Text>
              </CardContent>
            </Card>
          ) : (
            approvedBins.map((bin) => (
              <Card key={bin.id}>
                <CardContent className="p-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text>{(WASTAGE_META[bin.wasteType] || WASTAGE_META.Plastic).icon}</Text>
                        <Text className="font-medium text-foreground">{bin.label}</Text>
                      </View>
                      <Text className="text-xs font-mono text-muted-foreground">{bin.deviceId}</Text>
                      <Text className="text-xs text-muted-foreground">
                        {bin.sizeL}L • {bin.isPublic ? "Public" : "Private"} • {bin.region}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-bold" style={{ color: getFillColor(bin.fillPct) }}>
                        {fmtFillPct(bin.fillPct)}
                      </Text>
                      <Text className={`text-xs ${bin.batteryPct < 30 ? "text-red-500" : "text-muted-foreground"}`}>
                        🔋 {bin.batteryPct}%
                      </Text>
                      <Text className="text-[10px] text-muted-foreground">
                        {fmtDate(bin.lastPingAt, "MMM d, HH:mm")}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-2 flex-row items-center justify-between">
                    <Text className="text-[11px] text-muted-foreground">
                      {bin.binHeightCm ? `Height ${Math.round(bin.binHeightCm)} cm (sensor-measured)` : "Height uncalibrated"}
                    </Text>
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => requestRecalibration(bin.id)}
                        className="rounded-lg border border-border px-2 py-1 active:bg-muted"
                      >
                        <Text className="text-[11px] font-medium text-muted-foreground">
                          {bin.recalibrateRequested ? "Recalibration queued…" : "Recalibrate"}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => router.push(`/admin/edit-bin/${bin.id}`)}
                        className="flex-row items-center gap-1 rounded-lg border border-border px-2 py-1 active:bg-muted"
                      >
                        <Pencil size={11} color="#8fa3b8" />
                        <Text className="text-[11px] font-medium text-muted-foreground">Edit</Text>
                      </Pressable>
                    </View>
                  </View>
                </CardContent>
              </Card>
            ))
          )}
        </View>
      )}

      {tab === "pending" && (
        <View className="mt-4 gap-3">
          {pendingBins.length === 0 ? (
            <Card>
              <CardContent className="items-center py-12">
                <Clock size={36} color="#8fa3b8" />
                <Text className="mt-2 text-muted-foreground">No pending bin registrations.</Text>
              </CardContent>
            </Card>
          ) : (
            pendingBins.map((bin) => (
              <Card key={bin.id} className="border-amber-500/20">
                <CardContent className="p-4">
                  <View className="flex-row items-start gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                      <MapPin size={20} color="#d97706" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-medium text-foreground">{bin.label}</Text>
                      <Text className="text-xs font-mono text-muted-foreground">{bin.deviceId}</Text>
                      <Text className="mt-0.5 text-xs text-muted-foreground">
                        {(WASTAGE_META[bin.wasteType] || WASTAGE_META.Plastic).icon} {bin.wasteType} • {bin.sizeL}L • {bin.region}
                      </Text>
                      {bin.submittedAt && (
                        <Text className="mt-0.5 text-xs text-muted-foreground">
                          Submitted {fmtDate(bin.submittedAt, "MMM d, yyyy 'at' HH:mm")}
                        </Text>
                      )}
                      <View className={`mt-2 flex-row items-center gap-1.5 rounded-lg p-2 ${bin.binHeightCm ? "bg-green-500/10" : "bg-amber-500/10"}`}>
                        {bin.binHeightCm ? (
                          <>
                            <ShieldCheck size={13} color="#16a34a" />
                            <Text className="flex-1 text-[11px] text-green-700 dark:text-green-400">
                              Sensor self-calibrated — inside height {Math.round(bin.binHeightCm)} cm
                              {bin.calibratedAt ? ` (${fmtDate(bin.calibratedAt, "MMM d, HH:mm")})` : ""}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Clock size={13} color="#d97706" />
                            <Text className="flex-1 text-[11px] text-amber-700 dark:text-amber-400">
                              No sensor calibration yet — the bin proves its own height during setup
                            </Text>
                          </>
                        )}
                      </View>
                      {bin.pairingCode ? (
                        <Text className="mt-1 text-[10px] text-muted-foreground">🔒 Paired — only this device can report</Text>
                      ) : null}
                    </View>
                  </View>
                  <View className="mt-3 flex-row gap-2">
                    <Pressable
                      onPress={() => router.push(`/admin/edit-bin/${bin.id}`)}
                      className="flex-row items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 active:bg-muted"
                    >
                      <Pencil size={14} color="#8fa3b8" />
                      <Text className="text-sm font-semibold text-foreground">Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => approveBin(bin.id)}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-sapphire-500 py-2.5 active:opacity-80"
                    >
                      <Check size={16} color="#ffffff" />
                      <Text className="text-sm font-semibold text-white">Approve</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => rejectBin(bin.id)}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-destructive py-2.5 active:opacity-80"
                    >
                      <X size={16} color="#ffffff" />
                      <Text className="text-sm font-semibold text-white">Reject</Text>
                    </Pressable>
                  </View>
                </CardContent>
              </Card>
            ))
          )}
        </View>
      )}

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => { setShowForm(false); resetForm(); }}>
        <View className="flex-1 justify-end bg-black/60">
          <ScrollView className="max-h-[90%] rounded-t-3xl bg-card" contentContainerClassName="p-5" style={{ paddingBottom: 32 + insets.bottom }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-foreground">Register New Smart Bin</Text>
              <Pressable onPress={() => { setShowForm(false); resetForm(); }} className="rounded-lg p-1 active:bg-muted">
                <CloseIcon size={20} color="#8fa3b8" />
              </Pressable>
            </View>
            <Text className="mt-0.5 text-sm text-muted-foreground">
              Add a new ESP32-connected bin. Tap the map to set GPS coordinates.
            </Text>

            <View className="mt-4 gap-3">
              <View className="gap-2">
                <Label>ESP32 Device ID *</Label>
                <Input value={deviceId} onChangeText={(t) => { setDeviceId(t); setDeviceIdError(""); }} placeholder="ESP32-XXXXXX" autoCapitalize="characters" />
                {deviceIdError ? <Text className="text-xs text-destructive">{deviceIdError}</Text> : null}
              </View>
              <View className="gap-2">
                <Label>Bin Label *</Label>
                <Input value={label} onChangeText={setLabel} placeholder="e.g., Cinnamon Gardens Bin #13" />
              </View>
              <View className="gap-2">
                <Label>Bin Size</Label>
                <View className="flex-row gap-1">
                  {BIN_SIZES.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setSizeL(s)}
                      className={`flex-1 items-center rounded-lg border py-2 ${sizeL === s ? "border-sapphire-500 bg-sapphire-500/10" : "border-border"}`}
                    >
                      <Text className={`text-sm ${sizeL === s ? "font-semibold text-sapphire-500" : "text-muted-foreground"}`}>{s}L</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View className="gap-2">
                <Label>Waste Type</Label>
                <View className="flex-row flex-wrap gap-1">
                  {WASTAGE_TYPES.map((wt) => (
                    <Pressable
                      key={wt}
                      onPress={() => setWasteType(wt)}
                      className={`rounded-lg border px-2.5 py-1.5 ${wasteType === wt ? "border-sapphire-500 bg-sapphire-500/10" : "border-border"}`}
                    >
                      <Text className={`text-xs ${wasteType === wt ? "font-semibold text-sapphire-500" : "text-muted-foreground"}`}>
                        {WASTAGE_META[wt].icon} {wt}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View className="gap-2">
                <Label>Region</Label>
                <Input value={region} onChangeText={setRegion} placeholder="e.g., Colombo 07" />
              </View>
              <View className="gap-2">
                <Label>Address (optional)</Label>
                <Input value={address} onChangeText={setAddress} placeholder="Defaults to coordinates" />
              </View>
              <View className="gap-2">
                <Label>Tap map to set GPS coordinates</Label>
                <View className="overflow-hidden rounded-xl border border-border">
                  <MapView
                    style={{ height: 220, width: "100%" }}
                    initialRegion={{ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
                    onPress={(e) => setCoords({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
                  >
                    <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} pinColor="#0099FF" />
                  </MapView>
                </View>
                <Text className="text-xs text-muted-foreground">
                  Selected: <Text className="font-mono text-foreground">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</Text>
                </Text>
              </View>
              <View className="gap-2">
                <Label>Bin Type</Label>
                <View className="flex-row gap-1">
                  {[
                    { v: true, label: "Public" },
                    { v: false, label: "Private" },
                  ].map(({ v, label: l }) => (
                    <Pressable
                      key={l}
                      onPress={() => setIsPublic(v)}
                      className={`flex-1 items-center rounded-lg border py-2 ${isPublic === v ? "border-sapphire-500 bg-sapphire-500/10" : "border-border"}`}
                    >
                      <Text className={`text-sm ${isPublic === v ? "font-semibold text-sapphire-500" : "text-muted-foreground"}`}>{l}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <Button size="lg" className="mt-5 bg-sapphire-500" onPress={handleSubmit}>
              <Plus size={18} color="#ffffff" />
              <Text className="text-base font-semibold text-white">Register Bin</Text>
            </Button>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}
