import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import { ArrowLeft, Ruler, Wifi, Info } from "lucide-react-native";
import { useEditBin, type BinEdit } from "@/lib/hooks/mutations";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { BIN_SIZES, WASTAGE_TYPES, WASTAGE_META } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import type { Bin, BinSize, WastageType } from "@/types";

/**
 * Bin edit form shared by citizen and admin screens. Owners' saves send the
 * bin back to admin review; admins are the reviewers, so theirs apply directly.
 */
export function EditBinForm({ bin, mode = "owner" }: { bin: Bin; mode?: "owner" | "admin" }) {
  const editBin = useEditBin();
  const review = mode === "owner";
  const [label, setLabel] = useState(bin.label);
  const [address, setAddress] = useState(bin.address);
  const [region, setRegion] = useState(bin.region);
  const [sizeL, setSizeL] = useState<BinSize>(bin.sizeL);
  const [wasteType, setWasteType] = useState<WastageType>(bin.wasteType || "Plastic");
  const [coords, setCoords] = useState({ lat: bin.lat, lng: bin.lng });
  const [saving, setSaving] = useState(false);

  const patch: BinEdit = {};
  if (label.trim() !== bin.label) patch.label = label.trim();
  if (address.trim() !== bin.address) patch.address = address.trim();
  if (region.trim() !== bin.region) patch.region = region.trim();
  if (sizeL !== bin.sizeL) patch.sizeL = sizeL;
  if (wasteType !== (bin.wasteType || "Plastic")) patch.wasteType = wasteType;
  if (coords.lat !== bin.lat) patch.lat = coords.lat;
  if (coords.lng !== bin.lng) patch.lng = coords.lng;
  const changed = Object.keys(patch).length > 0;
  const valid = label.trim().length > 0;

  const save = async () => {
    if (!changed || !valid) return;
    setSaving(true);
    const err = await editBin(bin.id, patch, { review });
    setSaving(false);
    if (err) return Alert.alert("Couldn't save", err);
    Alert.alert(
      review ? "Sent for review" : "Bin updated",
      review ? "An admin will re-approve your bin. It keeps reporting fill levels meanwhile." : "Changes applied."
    );
    router.back();
  };

  const remeasure = () =>
    Alert.alert(
      "Is the bin completely empty?",
      "The sensor measures whatever is below it on its next wake (within a minute).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes — re-measure",
          onPress: async () => {
            setSaving(true);
            const err = await editBin(bin.id, { recalibrateRequested: true }, { review });
            setSaving(false);
            Alert.alert(
              err ? "Couldn't queue re-measure" : "Re-measure queued",
              err ?? (review ? "The new height goes to admin review once measured." : "The bin measures itself on its next wake.")
            );
          },
        },
      ]
    );

  const suffix = bin.deviceId.replace(/^ESP32-/, "");

  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="gap-4 p-4 pb-8">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full border border-border bg-card">
          <ArrowLeft size={16} color="#8fa3b8" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-foreground">Edit bin</Text>
          <Text className="text-xs text-muted-foreground">
            {bin.deviceId} — {review ? "saving sends it back to admin review" : "admin edit, applies immediately"}
          </Text>
        </View>
      </View>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="gap-3">
          <View className="gap-1.5">
            <Label>Bin label *</Label>
            <Input value={label} onChangeText={setLabel} />
            {!valid && <Text className="text-xs text-destructive">Label is required</Text>}
          </View>
          <View className="gap-1.5">
            <Label>Bin size</Label>
            <View className="flex-row gap-2">
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
          <View className="gap-1.5">
            <Label>Waste type</Label>
            <View className="flex-row flex-wrap justify-between gap-y-2">
              {WASTAGE_TYPES.map((wt) => (
                <Pressable
                  key={wt}
                  onPress={() => setWasteType(wt)}
                  className={`w-[48%] flex-row items-center gap-2 rounded-xl border-2 p-3 ${wasteType === wt ? "border-sapphire-500 bg-sapphire-500/10" : "border-border"}`}
                >
                  <Text className="text-lg">{WASTAGE_META[wt].icon}</Text>
                  <Text className={`text-sm ${wasteType === wt ? "font-semibold text-sapphire-500" : "text-foreground"}`}>{wt}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View className="gap-1.5">
            <Label>Region</Label>
            <Input value={region} onChangeText={setRegion} />
          </View>
          <View className="gap-1.5">
            <Label>Address</Label>
            <Input value={address} onChangeText={setAddress} />
          </View>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle>Location</CardTitle>
          <CardDescription>Tap the map to move the pin</CardDescription>
        </CardHeader>
        <CardContent className="gap-2">
          <View className="overflow-hidden rounded-xl border border-border">
            <MapView
              style={{ height: 220, width: "100%" }}
              initialRegion={{ latitude: bin.lat, longitude: bin.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
              onPress={(e) => setCoords({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
            >
              <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} pinColor="#0099FF" />
            </MapView>
          </View>
          <Text className="text-xs text-muted-foreground">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</Text>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="gap-2 p-4">
          <View className="flex-row items-center gap-2">
            <Ruler size={16} color="#0099FF" />
            <Text className="font-semibold text-foreground">Empty bin height</Text>
          </View>
          <Text className="text-sm text-muted-foreground">
            {bin.binHeightCm ? `${Number(bin.binHeightCm).toFixed(1)} cm` : "Not measured yet"}
            {bin.calibratedAt ? ` · measured ${fmtDate(bin.calibratedAt, "MMM d, HH:mm")}` : ""}
          </Text>
          {bin.recalibrateRequested ? (
            <Text className="text-xs text-amber-500">Re-measure queued — happens on the bin&apos;s next wake.</Text>
          ) : (
            <Button variant="outline" onPress={remeasure} disabled={saving}>
              <Text className="text-sm font-medium text-foreground">Re-measure empty height</Text>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="gap-2 p-4">
          <View className="flex-row items-center gap-2">
            <Wifi size={16} color="#0099FF" />
            <Text className="font-semibold text-foreground">Change the bin&apos;s WiFi</Text>
          </View>
          {[
            "Press the RST button on the bin twice quickly (within ~4 s).",
            `Join BINCOIN-SETUP-${suffix} on this phone, or use the guided screen below.`,
            "Pick the new 2.4 GHz network, enter its password — the bin tests it before saving.",
          ].map((s, i) => (
            <View key={i} className="flex-row gap-2">
              <Text className="w-4 text-xs font-bold text-sapphire-500">{i + 1}.</Text>
              <Text className="flex-1 text-xs text-foreground">{s}</Text>
            </View>
          ))}
          {review ? (
            <Button
              variant="outline"
              onPress={() =>
                router.push({
                  pathname: "/citizen/provision",
                  params: { deviceId: bin.deviceId, pairingCode: bin.pairingCode ?? "", mode: "reconfigure" },
                })
              }
            >
              <Wifi size={16} color="#0099FF" />
              <Text className="text-sm font-semibold text-sapphire-500">Guided WiFi change</Text>
            </Button>
          ) : null}
          <View className="flex-row items-start gap-1.5">
            <Info size={12} color="#8fa3b8" />
            <Text className="flex-1 text-xs text-muted-foreground">
              {review
                ? "Calibration and registration are kept — no admin review needed for a WiFi change."
                : "Someone must be at the bin to do this — WiFi passwords never go through the server."}
            </Text>
          </View>
        </CardContent>
      </Card>

      <Button onPress={save} disabled={!changed || !valid || saving} size="lg" className="bg-sapphire-500">
        <Text className="text-base font-semibold text-white">{saving ? "Saving…" : review ? "Save & send for review" : "Save changes"}</Text>
      </Button>
    </ScrollView>
  );
}
