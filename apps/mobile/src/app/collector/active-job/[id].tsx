import { useState } from "react";
import { Alert, Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft, MapPin, Trash2, User, Clock, Navigation, Camera,
  CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useRequest, useBins, useCollectors, useUserName } from "@/lib/hooks/queries";
import { useCompleteJob } from "@/lib/hooks/mutations";
import { useDataStore } from "@/lib/store/data-store";
import { Button, Card, CardContent, CardHeader, CardTitle, Label, Textarea } from "@/components/ui";
import { WASTAGE_META, WASTAGE_TYPES } from "@/lib/constants";
import { calcPoints } from "@/lib/points";
import { uploadPickupPhoto } from "@/lib/supabase-data";
import type { WastageType } from "@/types";
import { fmtFillPct } from "@/lib/dates";

type VerificationOption = "match" | "mismatch" | "invalid";

export default function ActiveJob() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: request } = useRequest(id);
  const { data: bins = [] } = useBins();
  const { data: collectors = [] } = useCollectors();
  const completeJob = useCompleteJob();
  const settings = useDataStore((s) => s.settings);
  const insets = useSafeAreaInsets();

  const [showVerification, setShowVerification] = useState(false);
  const [option, setOption] = useState<VerificationOption>("match");
  const [observedFill, setObservedFill] = useState(80);
  const [actualType, setActualType] = useState<WastageType>("Plastic");
  const [comment, setComment] = useState("");
  const [photoRef, setPhotoRef] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const bin = request ? bins.find((b) => b.id === request.binId) : undefined;
  const collector = request?.collectorId
    ? collectors.find((c) => c.id === request.collectorId)
    : undefined;
  const citizenName = useUserName(request?.citizenId);

  if (!request || !bin) {
    return (
      <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="p-4">
        <View className="items-center gap-4 py-20">
          <Text className="text-muted-foreground">Job not found.</Text>
          <Button variant="outline" onPress={() => router.replace("/collector/dashboard")}>
            <Text className="text-sm font-medium text-foreground">Back to Map</Text>
          </Button>
        </View>
      </ScrollView>
    );
  }

  const pickPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoRef("captured");
    }
  };

  const canComplete = () => {
    if (option === "match") return true;
    return comment.trim().length > 0 && !!photoRef;
  };

  const handleComplete = async () => {
    if (option !== "match" && !comment.trim()) return;
    if (option !== "match" && !photoRef) return;

    setUploading(true);
    const photoUrl = photoUri ? await uploadPickupPhoto(photoUri, request.id) : null;
    setUploading(false);
    // Evidence is mandatory for flagged pickups — a failed upload must block
    // completion, not silently complete without proof.
    if (option !== "match" && !photoUrl) {
      Alert.alert("Photo upload failed", "Check your connection and try again — flagged pickups need photo evidence.");
      return;
    }

    const result = calcPoints({
      binSizeL: bin.sizeL,
      fillPct: observedFill,
      wastageType: request.wastageType,
      settings,
      override: option === "invalid" ? "invalid" : option === "mismatch" ? "mismatch" : undefined,
      actualWastageType: option === "mismatch" ? actualType : undefined,
    });

    completeJob(request.id, {
      observedFillPct: observedFill,
      actualWastageType: option === "mismatch" ? actualType : undefined,
      driverComment: comment || undefined,
      photoRef: photoUrl || undefined,
      pointsAwarded: result.points,
      mismatchFlag: option === "mismatch",
      invalidFlag: option === "invalid",
    });

    setShowVerification(false);
    router.replace("/collector/dashboard");
  };

  const optionCards: { key: VerificationOption; title: string; sub: string; Icon: typeof CheckCircle2; activeColor: string }[] = [
    { key: "match", title: "Matches Registration", sub: "Waste matches the registered type", Icon: CheckCircle2, activeColor: "#0099FF" },
    { key: "mismatch", title: "Wastage Mismatch", sub: "Different material found — points recalculated", Icon: AlertTriangle, activeColor: "#f59e0b" },
    { key: "invalid", title: "Invalid / Contaminated", sub: "Penalty applied — 0 points awarded", Icon: XCircle, activeColor: "#dc2626" },
  ];

  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <Pressable onPress={() => router.back()} className="mb-4 flex-row items-center gap-1">
        <ArrowLeft size={16} color="#8fa3b8" />
        <Text className="text-sm text-muted-foreground">Back to Map</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-foreground">Active Job</Text>
      <Text className="mb-4 text-muted-foreground">Navigate to the location and verify the collection.</Text>

      <Card>
        <CardHeader>
          <View className="flex-row items-center gap-2">
            <Navigation size={18} color="#0099FF" />
            <CardTitle>Navigation Details</CardTitle>
          </View>
        </CardHeader>
        <CardContent className="gap-2">
          <View className="flex-row items-center gap-2">
            <MapPin size={16} color="#8fa3b8" />
            <Text className="font-medium text-foreground">{bin.label}</Text>
          </View>
          <Text className="pl-6 text-sm text-muted-foreground">{bin.address}</Text>
          <View className="flex-row items-center gap-2">
            <User size={16} color="#8fa3b8" />
            <Text className="text-sm text-foreground">Citizen: {citizenName}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Clock size={16} color="#8fa3b8" />
            <Text className="text-sm text-foreground">Preferred slot: {request.preferredSlot}</Text>
          </View>
          {collector && (
            <View className="flex-row items-center gap-2">
              <User size={16} color="#8fa3b8" />
              <Text className="text-sm text-foreground">Assigned to: {collector.name}</Text>
            </View>
          )}
          <Button
            size="lg"
            className="mt-2 bg-sapphire-500"
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${bin.lat},${bin.lng}&travelmode=driving`
              )
            }
          >
            <Navigation size={18} color="#ffffff" />
            <Text className="text-base font-semibold text-white">Start Turn-by-Turn Navigation</Text>
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <View className="flex-row items-center gap-2">
            <Trash2 size={18} color="#0099FF" />
            <CardTitle>Registered Wastage</CardTitle>
          </View>
        </CardHeader>
        <CardContent>
          <View className="flex-row items-center justify-between rounded-xl border border-border p-4">
            <View className="flex-row items-center gap-3">
              <Text className="text-3xl">{WASTAGE_META[request.wastageType].icon}</Text>
              <View>
                <Text className="font-medium text-foreground">{request.wastageType}</Text>
                <Text className="text-sm text-muted-foreground">Bin: {bin.sizeL}L • Fill: {fmtFillPct(bin.fillPct)}</Text>
              </View>
            </View>
            <View className="rounded-full border border-border px-2.5 py-1">
              <Text className="text-xs text-muted-foreground">{settings.multipliers[request.wastageType]}x</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      <Button size="lg" className="mt-4 bg-sapphire-500" onPress={() => {
        if (bin.fillPct >= 0) setObservedFill(bin.fillPct);
        setShowVerification(true);
      }}>
        <CheckCircle2 size={20} color="#ffffff" />
        <Text className="text-base font-semibold text-white">Inspect & Confirm Collection</Text>
      </Button>

      <Modal visible={showVerification} transparent animationType="fade" onRequestClose={() => setShowVerification(false)}>
        <View className="flex-1 justify-center bg-black/60 px-4" style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
          <ScrollView className="max-h-[85%] rounded-2xl bg-card" contentContainerClassName="p-5">
            <Text className="text-base font-semibold text-foreground">Verify Collection</Text>
            <Text className="mt-0.5 text-sm text-muted-foreground">Inspect the waste and confirm the details.</Text>

            <View className="mt-4 gap-2">
              <Label>Inspection Result</Label>
              {optionCards.map(({ key, title, sub, Icon, activeColor }) => (
                <Pressable
                  key={key}
                  onPress={() => setOption(key)}
                  className={`flex-row items-center gap-3 rounded-xl border-2 p-3 ${
                    option === key ? "border-sapphire-500 bg-sapphire-500/5" : "border-border"
                  }`}
                >
                  <Icon size={20} color={option === key ? activeColor : "#8fa3b8"} />
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground">{title}</Text>
                    <Text className="text-xs text-muted-foreground">{sub}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {option !== "invalid" && (
              <View className="mt-4 gap-2">
                <Label>Observed Fill Percentage: {observedFill}%</Label>
                <View className="flex-row items-center gap-2">
                  {[0, 25, 50, 75, 100].map((v) => (
                    <Pressable
                      key={v}
                      onPress={() => setObservedFill(v)}
                      className={`flex-1 items-center rounded-lg border py-2 ${observedFill === v ? "border-sapphire-500 bg-sapphire-500/10" : "border-border"}`}
                    >
                      <Text className={`text-xs ${observedFill === v ? "font-semibold text-sapphire-500" : "text-muted-foreground"}`}>{v}%</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {option === "mismatch" && (
              <View className="mt-4 gap-2">
                <Label>Actual Material Found</Label>
                <View className="flex-row flex-wrap gap-1">
                  {WASTAGE_TYPES.map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setActualType(t)}
                      className={`rounded-lg border px-2.5 py-1.5 ${actualType === t ? "border-sapphire-500 bg-sapphire-500/10" : "border-border"}`}
                    >
                      <Text className={`text-xs ${actualType === t ? "font-semibold text-sapphire-500" : "text-muted-foreground"}`}>
                        {WASTAGE_META[t].icon} {t}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {option !== "match" && (
              <View className="mt-4 gap-2">
                <Label>Driver Comment (Required) *</Label>
                <Textarea
                  value={comment}
                  onChangeText={setComment}
                  placeholder={option === "invalid" ? "Explain the contamination/penalty reason…" : "Explain the mismatch reason…"}
                />
              </View>
            )}

            {option !== "match" && (
              <View className="mt-4 gap-2">
                <Label>Photo Evidence (Required) *</Label>
                <Pressable
                  onPress={pickPhoto}
                  className="items-center justify-center rounded-xl border-2 border-dashed border-border p-4 active:bg-muted"
                >
                  <View className="flex-row items-center gap-2">
                    <Camera size={18} color="#8fa3b8" />
                    <Text className="text-sm text-muted-foreground">
                      {photoRef ? "Photo captured ✓" : "Take Photo"}
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}

            {option !== "invalid" ? (
              <View className="mt-4 rounded-xl border border-border bg-muted/50 p-3">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted-foreground">Estimated Points</Text>
                  <Text className="font-bold text-sapphire-500">
                    {calcPoints({
                      binSizeL: bin.sizeL,
                      fillPct: observedFill,
                      wastageType: request.wastageType,
                      settings,
                      override: option === "mismatch" ? "mismatch" : undefined,
                      actualWastageType: option === "mismatch" ? actualType : undefined,
                    }).points} pts
                  </Text>
                </View>
              </View>
            ) : (
              <View className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <Text className="text-sm font-medium text-destructive">Points: 0 (Penalty Applied)</Text>
              </View>
            )}

            <View className="mt-5 flex-row gap-2">
              <Button variant="outline" className="flex-1" onPress={() => setShowVerification(false)}>
                <Text className="text-sm font-medium text-foreground">Cancel</Text>
              </Button>
              <Button className="flex-1 bg-sapphire-500" onPress={handleComplete} disabled={!canComplete() || uploading}>
                <CheckCircle2 size={16} color="#ffffff" />
                <Text className="text-sm font-semibold text-white">{uploading ? "Uploading…" : "Complete Pickup"}</Text>
              </Button>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}
