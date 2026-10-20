import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { MapPin, Calendar, Trash2, Check, ChevronRight, ChevronLeft, AlertCircle } from "lucide-react-native";
import { useAuthStore } from "@/lib/store/auth-store";
import { useBins } from "@/lib/hooks/queries";
import { useCreateRequest } from "@/lib/hooks/mutations";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, IconInput, Input, Label } from "@/components/ui";
import { WASTAGE_TYPES, WASTAGE_META, TIME_SLOTS, MIN_FILL_FOR_PICKUP } from "@/lib/constants";
import type { WastageType } from "@/types";
import { fmtFillPct } from "@/lib/dates";

const STEPS = [
  { num: 1, label: "Bin Location", icon: MapPin },
  { num: 2, label: "Waste Type", icon: Trash2 },
  { num: 3, label: "Date & Time", icon: Calendar },
  { num: 4, label: "Review", icon: Check },
];

export default function BookPickup() {
  const user = useAuthStore((s) => s.user);
  const { data: allBins = [] } = useBins();
  const createRequest = useCreateRequest();

  const citizenBins = allBins.filter((b) => b.citizenId === user?.id);
  const publicBins = allBins.filter((b) => b.isPublic && b.citizenId !== user?.id);
  const availableBins = [...citizenBins, ...publicBins];

  const [step, setStep] = useState(1);
  const [selectedBinId, setSelectedBinId] = useState("");
  const [wastageType, setWastageType] = useState<WastageType | "">("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [showBinPicker, setShowBinPicker] = useState(false);

  const selectedBin = availableBins.find((b) => b.id === selectedBinId);

  const canProceed = () => {
    if (step === 1) return !!selectedBinId;
    if (step === 2) return !!wastageType;
    if (step === 3) return !!date && !!slot;
    return false;
  };

  const handleSubmit = () => {
    if (!selectedBin || !wastageType || !user) return;
    if (selectedBin.fillPct < MIN_FILL_FOR_PICKUP) {
      Alert.alert(
        "Request Declined",
        `Bin is currently under ${MIN_FILL_FOR_PICKUP}% capacity. Pickups are accepted only at ${MIN_FILL_FOR_PICKUP}%+ capacity.`
      );
      return;
    }
    const req = createRequest({
      citizenId: user.id,
      binId: selectedBin.id,
      wastageType: wastageType as WastageType,
      preferredSlot: `${date} • ${slot}`,
      notes: notes.trim() || undefined,
    });
    router.replace(`/citizen/request-status/${req.id}`);
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <Text className="text-2xl font-bold text-foreground">Book a Pickup</Text>
      <Text className="mb-4 text-muted-foreground">Schedule a recyclable waste collection.</Text>

      <View className="mb-4 flex-row items-center">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <View key={s.num} className="flex-1 flex-row items-center">
              <View className="items-center gap-1">
                <View
                  className={`h-8 w-8 items-center justify-center rounded-full border-2 ${
                    isDone
                      ? "border-primary bg-primary"
                      : isActive
                        ? "border-primary"
                        : "border-border"
                  }`}
                >
                  {isDone ? (
                    <Check size={16} color="#0099FF" />
                  ) : (
                    <Icon size={16} color={isActive ? "#0099FF" : "#8fa3b8"} />
                  )}
                </View>
              </View>
              {i < STEPS.length - 1 && (
                <View className={`mx-1 h-0.5 flex-1 ${isDone ? "bg-primary" : "bg-border"}`} />
              )}
            </View>
          );
        })}
      </View>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && "Select Bin Location"}
            {step === 2 && "Select Wastage Type"}
            {step === 3 && "Select Date & Time Slot"}
            {step === 4 && "Review & Submit"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Choose the bin you want collected"}
            {step === 2 && "What type of recyclable waste?"}
            {step === 3 && "When should we collect?"}
            {step === 4 && "Confirm your pickup request details"}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          {step === 1 && (
            <View className="gap-3">
              <Label>Select a bin</Label>
              <Pressable
                onPress={() => setShowBinPicker(true)}
                className="h-11 w-full flex-row items-center justify-between rounded-xl border border-border bg-card px-3"
              >
                <Text className={selectedBin ? "text-foreground" : "text-muted-foreground"}>
                  {selectedBin
                    ? `${(WASTAGE_META[selectedBin.wasteType] || WASTAGE_META.Plastic).icon} ${selectedBin.label} (${fmtFillPct(selectedBin.fillPct)} full)`
                    : "Choose a bin…"}
                </Text>
                <ChevronRight size={16} color="#8fa3b8" />
              </Pressable>
              {showBinPicker && (
                <View className="rounded-xl border border-border">
                  {availableBins.length === 0 && (
                    <Text className="p-3 text-sm text-muted-foreground">
                      No bins available. Register a bin first.
                    </Text>
                  )}
                  {availableBins.map((bin) => (
                    <Pressable
                      key={bin.id}
                      onPress={() => {
                        setSelectedBinId(bin.id);
                        setShowBinPicker(false);
                      }}
                      className="border-b border-border p-3 last:border-b-0 active:bg-muted"
                    >
                      <Text className="text-sm text-foreground">
                        {(WASTAGE_META[bin.wasteType] || WASTAGE_META.Plastic).icon} {bin.label} — {bin.wasteType} ({fmtFillPct(bin.fillPct)} full)
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {selectedBin && (
                <View className="rounded-xl border border-border p-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-medium text-foreground">{selectedBin.label}</Text>
                      <Text className="text-sm text-muted-foreground">{selectedBin.address}</Text>
                      <Text className="text-sm text-muted-foreground">
                        Size: {selectedBin.sizeL}L • {selectedBin.isPublic ? "Public" : "Private"}
                        {selectedBin.binHeightCm ? ` • Height: ${Math.round(selectedBin.binHeightCm)} cm` : ""}
                      </Text>
                    </View>
                    <Text
                      className={`text-2xl font-bold ${
                        selectedBin.fillPct >= 80
                          ? "text-red-500"
                          : selectedBin.fillPct >= 50
                            ? "text-yellow-500"
                            : "text-green-500"
                      }`}
                    >
                      {fmtFillPct(selectedBin.fillPct)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {step === 2 && (
            <View className="flex-row flex-wrap gap-2">
              {WASTAGE_TYPES.map((type) => {
                const meta = WASTAGE_META[type];
                return (
                  <Pressable
                    key={type}
                    onPress={() => setWastageType(type)}
                    className={`w-[48%] items-center gap-1 rounded-xl border-2 p-3 ${
                      wastageType === type ? "border-sapphire-500 bg-sapphire-500/10" : "border-border"
                    }`}
                  >
                    <Text className="text-2xl">{meta.icon}</Text>
                    <Text className="font-medium text-foreground">{type}</Text>
                    <Text className="text-xs text-muted-foreground">{meta.defaultMultiplier}x multiplier</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {step === 3 && (
            <View className="gap-4">
              <View className="gap-2">
                <Label>Preferred Date</Label>
                <IconInput
                  icon={<Calendar size={16} color="#8fa3b8" />}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View className="gap-2">
                <Label>Time Slot</Label>
                <View className="flex-row flex-wrap gap-2">
                  {TIME_SLOTS.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setSlot(s)}
                      className={`rounded-lg border-2 px-3 py-2 ${slot === s ? "border-sapphire-500 bg-sapphire-500/10" : "border-border"}`}
                    >
                      <Text className={`text-sm ${slot === s ? "font-medium text-foreground" : "text-muted-foreground"}`}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View className="gap-2">
                <Label>Notes for the collector (optional)</Label>
                <Input
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Gate code, where the bin is…"
                  multiline
                />
              </View>
            </View>
          )}

          {step === 4 && selectedBin && wastageType && (
            <View className="gap-2">
              <View className="gap-2 rounded-xl border border-border p-4">
                {[
                  ["Bin", selectedBin.label],
                  ["Address", selectedBin.address],
                  ["Wastage Type", `${WASTAGE_META[wastageType as WastageType].icon} ${wastageType}`],
                  ["Date", date],
                  ["Time Slot", slot],
                ].map(([k, v]) => (
                  <View key={k} className="flex-row justify-between gap-4">
                    <Text className="shrink-0 text-muted-foreground">{k}</Text>
                    <Text className="flex-1 text-right font-medium text-foreground">{v}</Text>
                  </View>
                ))}
                <View className="flex-row justify-between gap-4 border-t border-border pt-2">
                  <Text className="shrink-0 text-muted-foreground">Current Fill Level</Text>
                  <Text
                    className={`font-bold ${
                      selectedBin.fillPct >= 80 ? "text-red-500" : selectedBin.fillPct >= 50 ? "text-yellow-500" : "text-green-500"
                    }`}
                  >
                    {fmtFillPct(selectedBin.fillPct)}
                  </Text>
                </View>
              </View>
              {selectedBin.fillPct < MIN_FILL_FOR_PICKUP && (
                <View className="flex-row items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
                  <AlertCircle size={16} color="#d97706" />
                  <Text className="flex-1 text-sm text-amber-700 dark:text-amber-400">
                    This bin is under {MIN_FILL_FOR_PICKUP}% capacity. Your request may be declined.
                  </Text>
                </View>
              )}
            </View>
          )}
        </CardContent>
      </Card>

      <View className="mt-4 flex-row justify-between">
        <Button variant="outline" onPress={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          <ChevronLeft size={16} color="#8fa3b8" />
          <Text className="text-sm font-medium text-foreground">Back</Text>
        </Button>
        {step < 4 ? (
          <Button onPress={() => setStep((s) => Math.min(4, s + 1))} disabled={!canProceed()} className="bg-sapphire-500">
            <Text className="text-sm font-semibold text-white">Next</Text>
            <ChevronRight size={16} color="#ffffff" />
          </Button>
        ) : (
          <Button onPress={handleSubmit} className="bg-sapphire-500">
            <Check size={16} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">Submit Request</Text>
          </Button>
        )}
      </View>
    </ScrollView>
  );
}
