"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapView } from "@/components/maps/map-view";
import { useEditBin, type BinEdit } from "@/lib/hooks/mutations";
import { BIN_SIZES, WASTAGE_TYPES, WASTAGE_META } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import type { Bin, BinSize, WastageType } from "@/types";
import { Ruler, Wifi, Info, Loader2 } from "lucide-react";

/**
 * Edits a registered bin. Owners' saves send the bin back to admin review;
 * admins (mode="admin") are the reviewers, so their saves apply directly.
 */
export function EditBinDialog({
  bin,
  open,
  onOpenChange,
  mode = "owner",
}: {
  bin: Bin;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode?: "owner" | "admin";
}) {
  const editBin = useEditBin();
  const review = mode === "owner";
  const [label, setLabel] = useState(bin.label);
  const [address, setAddress] = useState(bin.address);
  const [region, setRegion] = useState(bin.region);
  const [sizeL, setSizeL] = useState<BinSize>(bin.sizeL);
  const [wasteType, setWasteType] = useState<WastageType>(bin.wasteType || "Plastic");
  const [lat, setLat] = useState(bin.lat);
  const [lng, setLng] = useState(bin.lng);
  const [saving, setSaving] = useState(false);
  const [confirmRemeasure, setConfirmRemeasure] = useState(false);

  const patch: BinEdit = {};
  if (label.trim() !== bin.label) patch.label = label.trim();
  if (address.trim() !== bin.address) patch.address = address.trim();
  if (region.trim() !== bin.region) patch.region = region.trim();
  if (sizeL !== bin.sizeL) patch.sizeL = sizeL;
  if (wasteType !== (bin.wasteType || "Plastic")) patch.wasteType = wasteType;
  if (lat !== bin.lat) patch.lat = lat;
  if (lng !== bin.lng) patch.lng = lng;
  const changed = Object.keys(patch).length > 0;
  const coordsValid = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const valid = label.trim().length > 0 && coordsValid;

  const save = async () => {
    if (!changed || !valid) return;
    setSaving(true);
    const ok = await editBin(bin.id, patch, { review });
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  const remeasure = async () => {
    setSaving(true);
    const ok = await editBin(bin.id, { recalibrateRequested: true }, {
      review,
      message: review
        ? "Re-measure queued — the bin measures itself on its next wake (≤1 min), then goes to admin review."
        : "Re-measure queued — the bin measures itself on its next wake (≤1 min).",
    });
    setSaving(false);
    if (ok) setConfirmRemeasure(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {bin.label}</DialogTitle>
          <DialogDescription>
            Device <span className="font-mono">{bin.deviceId}</span> —{" "}
            {review
              ? "saving any change sends the bin back to admin review. It keeps reporting fill levels in the meantime."
              : "admin edit: changes apply immediately, no re-approval needed."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-label">Bin label *</Label>
            <Input id="edit-label" value={label} onChange={(e) => setLabel(e.target.value)} />
            {!label.trim() && <p className="text-xs text-destructive">Label is required</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Bin size</Label>
              <Select value={String(sizeL)} onValueChange={(v) => v && setSizeL(Number(v) as BinSize)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BIN_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}L</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-region">Region</Label>
              <Input id="edit-region" value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Waste type</Label>
            <Select value={wasteType} onValueChange={(v) => v && setWasteType(v as WastageType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WASTAGE_TYPES.map((wt) => (
                  <SelectItem key={wt} value={wt}>{WASTAGE_META[wt].icon} {wt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-address">Address</Label>
            <Input id="edit-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Location — click the map to move the pin</Label>
            <MapView
              center={{ lat, lng }}
              pin={{ lat, lng }}
              onMapClick={(la, ln) => { setLat(la); setLng(ln); }}
              className="h-[200px] w-full"
            />
            <div className="flex gap-2">
              <Input type="number" step="0.0001" value={lat} onChange={(e) => setLat(Number(e.target.value))} />
              <Input type="number" step="0.0001" value={lng} onChange={(e) => setLng(Number(e.target.value))} />
            </div>
            {!coordsValid && <p className="text-xs text-destructive">Enter valid coordinates</p>}
          </div>

          {/* Empty-bin height — measured by the device itself, never typed. */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Ruler className="h-4 w-4 text-[#0099FF]" /> Empty bin height
            </p>
            <p className="text-sm text-muted-foreground">
              {bin.binHeightCm ? `${bin.binHeightCm.toFixed(1)} cm` : "Not measured yet"}
              {bin.calibratedAt && ` · measured ${fmtDate(bin.calibratedAt, "MMM d, HH:mm")}`}
            </p>
            {bin.recalibrateRequested ? (
              <p className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Re-measure queued — happens on the bin&apos;s next wake.
              </p>
            ) : confirmRemeasure ? (
              <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Empty the bin completely first — the sensor measures whatever is below it within the next minute.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={remeasure} disabled={saving}>The bin is empty — re-measure</Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmRemeasure(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setConfirmRemeasure(true)}>
                Re-measure empty height
              </Button>
            )}
          </div>

          {/* WiFi — changed on the device itself, credentials never touch the server. */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Wifi className="h-4 w-4 text-[#0099FF]" /> Change the bin&apos;s WiFi
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Press the <b>RST</b> button on the bin <b>twice</b> quickly (within ~4 s).</li>
              <li>On your phone, join <span className="font-mono">BINCOIN-SETUP-{bin.deviceId.replace(/^ESP32-/, "")}</span>.</li>
              <li>Pick the new network (2.4 GHz), enter the password, tap <b>Test &amp; Save WiFi</b>.</li>
            </ol>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {review
                ? "Calibration and registration are kept — no admin review needed for a WiFi change."
                : "Someone must be at the bin to do this — WiFi passwords never go through the server."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!changed || !valid || saving} className="glow-primary">
            {saving ? "Saving…" : review ? "Save & send for review" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
