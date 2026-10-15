import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Plus, MapPin, Crosshair, Info, CheckCircle2, QrCode, X, ShieldCheck } from "lucide-react-native";
import MapView, { Marker } from "react-native-maps";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAuthStore } from "@/lib/store/auth-store";
import { useBins } from "@/lib/hooks/queries";
import { useSubmitBin } from "@/lib/hooks/mutations";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Badge } from "@/components/ui";
import { BIN_SIZES, MAP_CENTER, WASTAGE_TYPES, WASTAGE_META } from "@/lib/constants";
import type { BinSize, WastageType } from "@/types";
import * as Location from "expo-location";

/** QR stickers carry "BINCOIN|<deviceId>|<pairingCode>" — plain device IDs also accepted. */
function parseDeviceQr(raw: string): { deviceId: string; pairingCode: string } | null {
  const parts = raw.trim().split("|");
  if (parts[0] === "BINCOIN" && parts[1]) {
    return { deviceId: parts[1], pairingCode: parts[2] ?? "" };
  }
  if (/^ESP32-[0-9A-Fa-f]{6}$/.test(raw.trim())) return { deviceId: raw.trim().toUpperCase(), pairingCode: "" };
  return null;
}

export default function RegisterBin() {
  const user = useAuthStore((s) => s.user);
  const { data: bins = [] } = useBins();
  const submitBin = useSubmitBin();
  const mapRef = useRef<MapView>(null);

  const [deviceId, setDeviceId] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [label, setLabel] = useState("");
  const [sizeL, setSizeL] = useState<BinSize>(100);
  const [wasteType, setWasteType] = useState<WastageType>("Plastic");
  const [coords, setCoords] = useState({ lat: MAP_CENTER.lat, lng: MAP_CENTER.lng });
  const [address, setAddress] = useState("");
  const [region, setRegion] = useState("Colombo 07");
  const [deviceIdError, setDeviceIdError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [geo, setGeo] = useState<"idle" | "locating" | "granted" | "denied" | "unavailable">("idle");
  const [pinned, setPinned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const myBins = bins.filter((b) => b.submittedBy === user?.id);

  const pinMyLocation = async () => {
    setGeo("locating");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setGeo("denied");
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    setGeo("granted");
    setPinned(true);
    mapRef.current?.animateToRegion(
      { latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      400
    );
  };

  // Pin automatically when permission was already granted before.
  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status === "granted") void pinMyLocation();
      else setGeo("idle");
    });
  }, []);

  const handleSubmit = () => {
    if (!deviceId.trim()) {
      setDeviceIdError("Device ID is required");
      return;
    }
    if (bins.some((b) => b.deviceId === deviceId)) {
      setDeviceIdError("Device ID already exists in the system");
      return;
    }
    if (!label.trim() || !user) return;

    submitBin({
      deviceId,
      label,
      lat: coords.lat,
      lng: coords.lng,
      address: address || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
      sizeL,
      fillPct: 0,
      isPublic: true,
      region,
      wasteType,
      submittedBy: user.id,
      ...(pairingCode ? { pairingCode } : {}),
    });

    setSubmitted(true);
    setDeviceId("");
    setPairingCode("");
    setLabel("");
    setAddress("");
    setWasteType("Plastic");
    setDeviceIdError("");
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <>
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <Text className="text-2xl font-bold text-foreground">Register a Smart Bin</Text>
      <Text className="mb-4 text-muted-foreground">
        Submit a new smart bin for admin approval. Pin the location on the map or use your current position.
      </Text>

      {submitted && (
        <View className="mb-4 flex-row items-center gap-3 rounded-xl border border-sapphire-500/30 bg-sapphire-500/10 p-4">
          <CheckCircle2 size={20} color="#0099FF" />
          <View className="flex-1">
            <Text className="font-medium text-foreground">Bin submitted for approval!</Text>
            <Text className="text-sm text-muted-foreground">
              An admin will review your registration.
            </Text>
          </View>
        </View>
      )}

      <Card>
        <CardHeader>
          <View className="flex-row items-center gap-2">
            <Plus size={18} color="#0099FF" />
            <CardTitle>Bin Details</CardTitle>
          </View>
          <CardDescription>Fill in the ESP32 device info and bin specifications</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          {(geo === "idle" || geo === "denied" || geo === "unavailable") && (
            <View className="rounded-xl border border-sapphire-500/25 bg-sapphire-500/5 p-3">
              <View className="flex-row items-center gap-2">
                <Crosshair size={16} color="#0099FF" />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground">
                    {geo === "denied" ? "Location access blocked" : "Pin your bin at your current location"}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {geo === "denied"
                      ? "Allow location in your device settings, or set coordinates manually."
                      : "Allow location access and we'll pin it for you."}
                  </Text>
                </View>
                <Button size="sm" variant="outline" onPress={pinMyLocation}>
                  <Text className="text-sm font-medium text-foreground">Enable</Text>
                </Button>
              </View>
            </View>
          )}
          {geo === "granted" && pinned && (
            <View className="flex-row items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3">
              <CheckCircle2 size={16} color="#16a34a" />
              <Text className="flex-1 text-sm text-green-700 dark:text-green-400">
                Pinned to your current location — adjust on the map below.
              </Text>
            </View>
          )}

          <View className="gap-2">
            <Label>ESP32 Device ID *</Label>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input value={deviceId} onChangeText={(t) => { setDeviceId(t); setDeviceIdError(""); }} placeholder="ESP32-XXXXXX" autoCapitalize="characters" />
              </View>
              <Button
                variant="outline"
                onPress={async () => {
                  if (!cameraPermission?.granted) {
                    const res = await requestCameraPermission();
                    if (!res.granted) return;
                  }
                  setScanning(true);
                }}
              >
                <QrCode size={16} color="#0099FF" />
                <Text className="text-sm font-medium text-foreground">Scan QR</Text>
              </Button>
            </View>
            {deviceIdError ? <Text className="text-xs text-destructive">{deviceIdError}</Text> : null}
            {pairingCode ? (
              <View className="flex-row items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-2">
                <ShieldCheck size={14} color="#16a34a" />
                <Text className="text-xs text-green-700 dark:text-green-400">
                  Paired — this bin telemetry is locked to your registration
                </Text>
              </View>
            ) : null}
          </View>

          <View className="gap-2">
            <Label>Bin Label *</Label>
            <Input value={label} onChangeText={setLabel} placeholder="e.g., Home Plastic Bin" />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-2">
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
          </View>

          <View className="gap-2">
            <Label>Waste Type</Label>
            <View className="flex-row flex-wrap gap-2">
              {WASTAGE_TYPES.map((wt) => (
                <Pressable
                  key={wt}
                  onPress={() => setWasteType(wt)}
                  className={`w-[48%] flex-row items-center gap-2 rounded-xl border-2 p-3 ${
                    wasteType === wt ? "border-sapphire-500 bg-sapphire-500/10" : "border-border"
                  }`}
                >
                  <Text className="text-lg">{WASTAGE_META[wt].icon}</Text>
                  <Text className={`text-sm ${wasteType === wt ? "font-semibold text-sapphire-500" : "text-foreground"}`}>
                    {wt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Label>Address (optional)</Label>
            <Input value={address} onChangeText={setAddress} placeholder="Street address — defaults to coordinates" />
          </View>

          <View className="gap-2">
            <Label>Region</Label>
            <Input value={region} onChangeText={setRegion} placeholder="Colombo 07" />
          </View>

          <Button onPress={handleSubmit} size="lg" className="bg-sapphire-500">
            <Plus size={18} color="#ffffff" />
            <Text className="text-base font-semibold text-white">Submit for Approval</Text>
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <View className="flex-row items-center gap-2">
            <MapPin size={18} color="#0099FF" />
            <CardTitle>Pin Bin Location</CardTitle>
          </View>
          <CardDescription>Tap the map to set the bin&apos;s GPS coordinates</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <View className="overflow-hidden rounded-xl border border-border">
            <MapView
              ref={mapRef}
              style={{ height: 250, width: "100%" }}
              initialRegion={{ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
              onPress={(e) => {
                setCoords({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude });
                setPinned(true);
              }}
              showsUserLocation
            >
              {pinned && <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} pinColor="#0099FF" />}
            </MapView>
          </View>
          <Button variant="outline" onPress={pinMyLocation} disabled={geo === "locating"}>
            <Crosshair size={16} color="#8fa3b8" />
            <Text className="text-sm font-medium text-foreground">
              {geo === "locating" ? "Locating…" : "Use My Current Location"}
            </Text>
          </Button>
          <View className="flex-row items-center gap-2">
            <Info size={14} color="#0099FF" />
            <Text className="text-sm text-muted-foreground">
              Selected: <Text className="font-mono font-medium text-foreground">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</Text>
            </Text>
          </View>
        </CardContent>
      </Card>

      {myBins.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>My Submitted Bins</CardTitle>
            <CardDescription>Track the approval status of your bin registrations</CardDescription>
          </CardHeader>
          <CardContent className="gap-2">
            {myBins.map((bin) => (
              <View key={bin.id} className="flex-row items-center justify-between gap-2 rounded-xl border border-border p-3">
                <View className="flex-1 flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin size={16} color="#0099FF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground">{bin.label}</Text>
                    <Text className="text-xs text-muted-foreground">
                      {bin.deviceId} • {bin.sizeL}L • {bin.region}
                    </Text>
                  </View>
                </View>
                {bin.approvalStatus === "pending" && (
                  <Badge variant="outline" className="border-amber-500/40">
                    <Text className="text-xs text-amber-600 dark:text-amber-400">⏳ Pending</Text>
                  </Badge>
                )}
                {bin.approvalStatus === "approved" && (
                  <Badge variant="outline" className="border-green-500/40">
                    <Text className="text-xs text-green-600 dark:text-green-400">✓ Approved</Text>
                  </Badge>
                )}
                {bin.approvalStatus === "rejected" && (
                  <Badge variant="outline" className="border-red-500/40">
                    <Text className="text-xs text-destructive">Rejected</Text>
                  </Badge>
                )}
              </View>
            ))}
          </CardContent>
        </Card>
      )}
    </ScrollView>

      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
        <View className="flex-1 bg-black">
          <View className="flex-row items-center justify-between px-4 pt-14 pb-3">
            <View>
              <Text className="text-lg font-semibold text-white">Scan the bin QR sticker</Text>
              <Text className="text-xs text-white/60">Fills the device ID and pairing code</Text>
            </View>
            <Pressable onPress={() => setScanning(false)} className="rounded-full bg-white/10 p-2">
              <X size={20} color="#ffffff" />
            </Pressable>
          </View>
          {cameraPermission?.granted ? (
            <CameraView
              style={{ flex: 1 }}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={({ data }) => {
                const parsed = parseDeviceQr(data);
                if (!parsed) return;
                setDeviceId(parsed.deviceId);
                setPairingCode(parsed.pairingCode);
                setDeviceIdError("");
                setScanning(false);
              }}
            />
          ) : (
            <View className="flex-1 items-center justify-center p-6">
              <Text className="text-center text-sm text-white/70">Camera permission is needed to scan the bin sticker.</Text>
              <Button className="mt-3" onPress={() => requestCameraPermission()}>
                <Text className="text-sm font-semibold text-white">Allow Camera</Text>
              </Button>
            </View>
          )}
          <View className="items-center px-6 pb-10 pt-3">
            <Text className="text-center text-xs text-white/50">
              The sticker looks like: BINCOIN|ESP32-A1B2C3|PAIR-XXXXXX — point the camera at the bin QR.
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}
