import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {Alert, Modal, Pressable, ScrollView, Text, View, useColorScheme } from "react-native";
import { Save, Plus, Pencil, Trash2, Coins, Gift, X as CloseIcon } from "lucide-react-native";
import { useSettings, useVouchers } from "@/lib/hooks/queries";
import { useUpdateSettings, useAddVoucher, useUpdateVoucher, useDeleteVoucher } from "@/lib/hooks/mutations";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { BIN_SIZES, WASTAGE_TYPES, WASTAGE_META } from "@/lib/constants";
import { formatLKR, pointsToLKR } from "@/lib/currency";
import type { BinSize, Voucher, VoucherCategory, WastageType } from "@/types";

export default function AdminSettings() {
  const dark = useColorScheme() === "dark";
  const { data: settings } = useSettings();
  const { data: vouchers = [] } = useVouchers();
  const updateSettings = useUpdateSettings();
  const addVoucher = useAddVoucher();
  const updateVoucher = useUpdateVoucher();
  const deleteVoucher = useDeleteVoucher();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<"points" | "vouchers">("points");

  const [caps, setCaps] = useState<Record<BinSize, number>>(
    settings?.basePointCaps || { 20: 50, 100: 120, 240: 200 }
  );
  const [multipliers, setMultipliers] = useState<Record<WastageType, number>>(
    settings?.multipliers || {
      Plastic: 1.0, Glass: 1.2, Metal: 1.5, Paper: 0.8,
      "Food Waste": 0.5, Iron: 1.8, Cardboard: 0.9, Electronic: 2.5,
    }
  );

  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [showVoucherForm, setShowVoucherForm] = useState(false);
  const [voucherForm, setVoucherForm] = useState({
    name: "",
    category: "Mobile Data" as VoucherCategory,
    costPoints: 100,
    stock: 50,
    qrPayload: "",
  });

  const handleSaveSettings = () => {
    updateSettings({ basePointCaps: caps, multipliers });
  };

  const handleSaveVoucher = () => {
    if (!voucherForm.name.trim()) return;
    if (editingVoucher) {
      updateVoucher(editingVoucher.id, voucherForm);
    } else {
      addVoucher({
        ...voucherForm,
        qrPayload: voucherForm.qrPayload || `BINCOIN:VOUCHER:${Date.now()}`,
      });
    }
    setShowVoucherForm(false);
    setEditingVoucher(null);
    setVoucherForm({ name: "", category: "Mobile Data", costPoints: 100, stock: 50, qrPayload: "" });
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <Text className="text-2xl font-bold text-foreground">Settings</Text>
      <Text className="mb-4 text-muted-foreground">Configure point engine and voucher catalog</Text>

      <View className="flex-row rounded-xl bg-muted p-1">
        {(["points", "vouchers"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2" style={tab === t ? { backgroundColor: dark ? "#0b1d3a" : "#ffffff", elevation: 2 } : undefined}>
            {t === "points" ? <Coins size={16} color="#8fa3b8" /> : <Gift size={16} color="#8fa3b8" />}
            <Text className={`text-sm font-medium ${tab === t ? "text-foreground" : "text-muted-foreground"}`}>
              {t === "points" ? "Point Engine" : "Vouchers"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "points" && (
        <View className="mt-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Base Point Caps</CardTitle>
              <CardDescription>Maximum points per collection, by bin size</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {BIN_SIZES.map((size) => (
                <View key={size} className="flex-row items-center justify-between">
                  <Label>{size}L Bin</Label>
                  <View className="flex-row items-center gap-2">
                    <Input
                      value={String(caps[size])}
                      onChangeText={(t) => setCaps({ ...caps, [size]: Number(t) || 0 })}
                      keyboardType="number-pad"
                      className="w-24 text-right"
                    />
                    <Text className="text-sm text-muted-foreground">pts max</Text>
                  </View>
                </View>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wastage Multipliers</CardTitle>
              <CardDescription>Points are multiplied by these values per material</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {WASTAGE_TYPES.map((type) => (
                <View key={type} className="flex-row items-center justify-between">
                  <Label>{WASTAGE_META[type].icon} {type}</Label>
                  <View className="flex-row items-center gap-2">
                    <Input
                      value={String(multipliers[type])}
                      onChangeText={(t) => setMultipliers({ ...multipliers, [type]: Number(t) || 0 })}
                      keyboardType="decimal-pad"
                      className="w-24 text-right"
                    />
                    <Text className="text-sm text-muted-foreground">x</Text>
                  </View>
                </View>
              ))}
            </CardContent>
          </Card>

          <View className="rounded-xl border border-sapphire-500/20 bg-sapphire-500/5 p-4">
            <Text className="mb-1 text-sm text-muted-foreground">Formula preview:</Text>
            <Text className="font-mono text-sm text-foreground">
              Points = Base Cap × (Fill% / 100) × Multiplier
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              Example: 240L bin at 80% with Metal ({multipliers.Metal}x) ={" "}
              {Math.round(caps[240] * 0.8 * multipliers.Metal)} pts
              {Math.round(caps[240] * 0.8 * multipliers.Metal) > caps[240] ? ` → capped at ${caps[240]}` : ""}
            </Text>
          </View>

          <Button size="lg" className="bg-sapphire-500" onPress={handleSaveSettings}>
            <Save size={18} color="#ffffff" />
            <Text className="text-base font-semibold text-white">Save Settings</Text>
          </Button>
        </View>
      )}

      {tab === "vouchers" && (
        <View className="mt-4 gap-3">
          <Button
            variant="outline"
            className="self-end"
            onPress={() => {
              setEditingVoucher(null);
              setVoucherForm({ name: "", category: "Mobile Data", costPoints: 100, stock: 50, qrPayload: "" });
              setShowVoucherForm(true);
            }}
          >
            <Plus size={16} color="#8fa3b8" />
            <Text className="text-sm font-medium text-foreground">Add Voucher</Text>
          </Button>

          {vouchers.map((voucher) => (
            <Card key={voucher.id}>
              <CardContent className="p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="font-medium text-foreground">{voucher.name}</Text>
                    <Badge variant="secondary" className="mt-1">{voucher.category}</Badge>
                    <View className="mt-2 flex-row items-center gap-2">
                      <Text className="font-bold text-sapphire-500">🪙 {voucher.costPoints} pts</Text>
                      <Text className="text-xs text-muted-foreground">≈ {formatLKR(pointsToLKR(voucher.costPoints))}</Text>
                      <Text className="ml-auto text-xs text-muted-foreground">{voucher.stock} in stock</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-1">
                    <Pressable
                      onPress={() => {
                        setEditingVoucher(voucher);
                        setVoucherForm({
                          name: voucher.name,
                          category: voucher.category,
                          costPoints: voucher.costPoints,
                          stock: voucher.stock,
                          qrPayload: voucher.qrPayload,
                        });
                        setShowVoucherForm(true);
                      }}
                      className="rounded-lg p-2 active:bg-muted"
                    >
                      <Pencil size={16} color="#8fa3b8" />
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        Alert.alert("Delete Voucher", `Delete "${voucher.name}"?`, [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: () => deleteVoucher(voucher.id) },
                        ])
                      }
                      className="rounded-lg p-2 active:bg-muted"
                    >
                      <Trash2 size={16} color="#dc2626" />
                    </Pressable>
                  </View>
                </View>
              </CardContent>
            </Card>
          ))}
        </View>
      )}

      <Modal visible={showVoucherForm} transparent animationType="fade" onRequestClose={() => setShowVoucherForm(false)}>
        <View className="flex-1 justify-center bg-black/60 px-4" style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
          <View className="rounded-2xl bg-card p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-foreground">
                {editingVoucher ? "Edit Voucher" : "Add Voucher"}
              </Text>
              <Pressable onPress={() => setShowVoucherForm(false)} className="rounded-lg p-1 active:bg-muted">
                <CloseIcon size={20} color="#8fa3b8" />
              </Pressable>
            </View>
            <View className="mt-4 gap-3">
              <View className="gap-2">
                <Label>Voucher Name</Label>
                <Input value={voucherForm.name} onChangeText={(t) => setVoucherForm({ ...voucherForm, name: t })} placeholder="e.g., Dialog 5GB Data Pass" />
              </View>
              <View className="gap-2">
                <Label>Category</Label>
                <View className="flex-row gap-1">
                  {(["Mobile Data", "Supermarket", "Utility"] as VoucherCategory[]).map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setVoucherForm({ ...voucherForm, category: c })}
                      className={`flex-1 items-center rounded-lg border py-2 ${voucherForm.category === c ? "border-sapphire-500 bg-sapphire-500/10" : "border-border"}`}
                    >
                      <Text className={`text-xs ${voucherForm.category === c ? "font-semibold text-sapphire-500" : "text-muted-foreground"}`}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1 gap-2">
                  <Label>Cost (Points)</Label>
                  <Input value={String(voucherForm.costPoints)} onChangeText={(t) => setVoucherForm({ ...voucherForm, costPoints: Number(t) || 0 })} keyboardType="number-pad" />
                </View>
                <View className="flex-1 gap-2">
                  <Label>Stock</Label>
                  <Input value={String(voucherForm.stock)} onChangeText={(t) => setVoucherForm({ ...voucherForm, stock: Number(t) || 0 })} keyboardType="number-pad" />
                </View>
              </View>
            </View>
            <View className="mt-5 flex-row gap-2">
              <Button variant="outline" className="flex-1" onPress={() => setShowVoucherForm(false)}>
                <Text className="text-sm font-medium text-foreground">Cancel</Text>
              </Button>
              <Button className="flex-1 bg-sapphire-500" onPress={handleSaveVoucher}>
                <Text className="text-sm font-semibold text-white">{editingVoucher ? "Update" : "Add"} Voucher</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
