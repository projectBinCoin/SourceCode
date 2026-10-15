"use client";

import { useState } from "react";
import { useSettings, useVouchers } from "@/lib/hooks/queries";
import {
  useUpdateSettings,
  useAddVoucher,
  useUpdateVoucher,
  useDeleteVoucher,
} from "@/lib/hooks/mutations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Plus, Pencil, Trash2, Coins, Gift } from "lucide-react";
import { BIN_SIZES, WASTAGE_TYPES, WASTAGE_META } from "@/lib/constants";
import type { BinSize, Voucher, VoucherCategory, WastageType } from "@/types";
import { formatLKR, pointsToLKR } from "@/lib/currency";

export default function AdminSettingsPage() {
  const { data: settings } = useSettings();
  const { data: vouchers = [] } = useVouchers();
  const updateSettings = useUpdateSettings();
  const addVoucher = useAddVoucher();
  const updateVoucher = useUpdateVoucher();
  const deleteVoucher = useDeleteVoucher();

  const [caps, setCaps] = useState<Record<BinSize, number>>(settings?.basePointCaps || { 20: 50, 100: 120, 240: 200 });
  const [multipliers, setMultipliers] = useState<Record<WastageType, number>>(
    settings?.multipliers || { Plastic: 1.0, Glass: 1.2, Metal: 1.5, Paper: 0.8, "Food Waste": 0.5, Iron: 1.8, Cardboard: 0.9, Electronic: 2.5 }
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
    updateSettings({
      basePointCaps: caps,
      multipliers,
    });
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

  const handleEditVoucher = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setVoucherForm({
      name: voucher.name,
      category: voucher.category,
      costPoints: voucher.costPoints,
      stock: voucher.stock,
      qrPayload: voucher.qrPayload,
    });
    setShowVoucherForm(true);
  };

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure point engine and voucher catalog</p>
      </div>

      <Tabs defaultValue="points">
        <TabsList>
          <TabsTrigger value="points" className="gap-1">
            <Coins className="h-4 w-4" /> Point Engine
          </TabsTrigger>
          <TabsTrigger value="vouchers" className="gap-1">
            <Gift className="h-4 w-4" /> Vouchers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="points" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Base Point Caps</CardTitle>
              <CardDescription>
                Maximum points awardable per collection, by bin size. Issued points can never exceed these caps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {BIN_SIZES.map((size) => (
                <div key={size} className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{size}L Bin</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={caps[size]}
                      onChange={(e) => setCaps({ ...caps, [size]: Number(e.target.value) })}
                      className="w-24 text-right"
                    />
                    <span className="text-sm text-muted-foreground">pts max</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Wastage Multipliers</CardTitle>
              <CardDescription>
                Points are multiplied by these values based on the waste material type.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {WASTAGE_TYPES.map((type) => (
                <div key={type} className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <span className="text-lg">{WASTAGE_META[type].icon}</span>
                    {type}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={multipliers[type]}
                      onChange={(e) => setMultipliers({ ...multipliers, [type]: Number(e.target.value) })}
                      className="w-24 text-right"
                    />
                    <span className="text-sm text-muted-foreground">x</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="rounded-xl border border-[#0099FF]/20 bg-gradient-to-br from-[#003B73]/5 to-[#0099FF]/5 p-4">
            <p className="text-sm text-muted-foreground mb-2">Formula preview:</p>
            <p className="font-mono text-sm text-foreground">
              Points = Base Cap × (Fill% / 100) × Multiplier
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Example: 240L bin at 80% fill with Metal (1.5x) = {caps[240]} × 0.8 × {multipliers.Metal} = {Math.round(caps[240] * 0.8 * multipliers.Metal)} pts
              {Math.round(caps[240] * 0.8 * multipliers.Metal) > caps[240] && ` → capped at ${caps[240]}`}
            </p>
          </div>

          <Button onClick={handleSaveSettings} className="w-full gap-2 glow-primary" size="lg">
            <Save className="h-4 w-4" /> Save Settings
          </Button>
        </TabsContent>

        <TabsContent value="vouchers" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingVoucher(null);
                setVoucherForm({ name: "", category: "Mobile Data", costPoints: 100, stock: 50, qrPayload: "" });
                setShowVoucherForm(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Add Voucher
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {vouchers.map((voucher) => (
              <Card key={voucher.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{voucher.name}</p>
                      <Badge variant="secondary" className="mt-1">{voucher.category}</Badge>
                      <div className="mt-2 flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 font-bold text-primary">
                          <Coins className="h-3 w-3" /> {voucher.costPoints} pts
                        </span>
                        <span className="text-xs text-muted-foreground">≈ {formatLKR(pointsToLKR(voucher.costPoints))}</span>
                        <span className="text-muted-foreground ml-auto">{voucher.stock} in stock</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEditVoucher(voucher)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteVoucher(voucher.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showVoucherForm} onOpenChange={setShowVoucherForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVoucher ? "Edit Voucher" : "Add Voucher"}</DialogTitle>
            <DialogDescription>
              {editingVoucher ? "Update voucher details" : "Create a new reward voucher"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vname">Voucher Name</Label>
              <Input
                id="vname"
                value={voucherForm.name}
                onChange={(e) => setVoucherForm({ ...voucherForm, name: e.target.value })}
                placeholder="e.g., Dialog 5GB Data Pass"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={voucherForm.category}
                  onValueChange={(v) => v && setVoucherForm({ ...voucherForm, category: v as VoucherCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mobile Data">Mobile Data</SelectItem>
                    <SelectItem value="Supermarket">Supermarket</SelectItem>
                    <SelectItem value="Utility">Utility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vcost">Cost (Points)</Label>
                <Input
                  id="vcost"
                  type="number"
                  value={voucherForm.costPoints}
                  onChange={(e) => setVoucherForm({ ...voucherForm, costPoints: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vstock">Stock</Label>
              <Input
                id="vstock"
                type="number"
                value={voucherForm.stock}
                onChange={(e) => setVoucherForm({ ...voucherForm, stock: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoucherForm(false)}>Cancel</Button>
            <Button onClick={handleSaveVoucher}>{editingVoucher ? "Update" : "Add"} Voucher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
