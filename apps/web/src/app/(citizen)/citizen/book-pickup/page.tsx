"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { useBins } from "@/lib/hooks/queries";
import { useCreateRequest } from "@/lib/hooks/mutations";
import { useDataStore } from "@/lib/store/data-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WASTAGE_TYPES, WASTAGE_META, TIME_SLOTS, MIN_FILL_FOR_PICKUP } from "@/lib/constants";
import { MapPin, Calendar, Trash2, Check, ChevronRight, ChevronLeft, AlertCircle } from "lucide-react";
import type { WastageType } from "@/types";
import { cn } from "@/lib/utils";

export default function BookPickupPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { data: allBins = [] } = useBins();
  const createRequest = useCreateRequest();
  const settings = useDataStore((s) => s.settings);

  const citizenBins = allBins.filter((b) => b.citizenId === user?.id);
  const publicBins = allBins.filter((b) => b.isPublic && b.citizenId !== user?.id);
  const availableBins = [...citizenBins, ...publicBins];

  const [step, setStep] = useState(1);
  const [selectedBinId, setSelectedBinId] = useState("");
  const [wastageType, setWastageType] = useState<WastageType | "">("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [showDeclineModal, setShowDeclineModal] = useState(false);

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
      setShowDeclineModal(true);
      return;
    }

    const req = createRequest({
      citizenId: user.id,
      binId: selectedBin.id,
      wastageType: wastageType as WastageType,
      preferredSlot: slot,
    });

    router.push(`/citizen/request-status/${req.id}`);
  };

  const steps = [
    { num: 1, label: "Bin Location", icon: MapPin },
    { num: 2, label: "Waste Type", icon: Trash2 },
    { num: 3, label: "Date & Time", icon: Calendar },
    { num: 4, label: "Review", icon: Check },
  ];

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Book a Pickup</h1>
        <p className="text-muted-foreground">Schedule a recyclable waste collection.</p>
      </div>

      {/* Stepper — labels hidden on mobile; the card title shows the current step */}
      <div className="flex items-center justify-between">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div key={s.num} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors sm:h-9 sm:w-9",
                    isDone && "border-primary bg-primary text-primary-foreground",
                    isActive && "border-primary text-primary",
                    !isActive && !isDone && "border-muted text-muted-foreground"
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={cn("hidden text-xs sm:block", isActive ? "font-medium" : "text-muted-foreground")}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn("mx-1 h-0.5 flex-1 sm:mx-2", isDone ? "bg-primary" : "bg-muted")} />
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
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
        <CardContent className="space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <Label>Select a bin</Label>
              <Select value={selectedBinId} onValueChange={(v) => setSelectedBinId(v || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a bin..." />
                </SelectTrigger>
                <SelectContent>
                  {availableBins.map((bin) => {
                    const meta = WASTAGE_META[bin.wasteType] || WASTAGE_META.Plastic;
                    return (
                      <SelectItem key={bin.id} value={bin.id}>
                        {meta.icon} {bin.label} — {bin.wasteType || "Plastic"} ({bin.fillPct}% full)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedBin && (
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedBin.label}</p>
                      <p className="text-sm text-muted-foreground">{selectedBin.address}</p>
                      <p className="text-sm text-muted-foreground">
                        Size: {selectedBin.sizeL}L • {selectedBin.isPublic ? "Public" : "Private"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-2xl font-bold",
                        selectedBin.fillPct >= 80 ? "text-red-500" : selectedBin.fillPct >= 50 ? "text-yellow-500" : "text-green-500"
                      )}>
                        {selectedBin.fillPct}%
                      </p>
                      <p className="text-xs text-muted-foreground">Fill Level</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-3">
              {WASTAGE_TYPES.map((type) => {
                const meta = WASTAGE_META[type];
                return (
                  <button
                    key={type}
                    onClick={() => setWastageType(type)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                      wastageType === type
                        ? "border-[#0099FF] bg-[#0099FF]/5 shadow-md"
                        : "border-muted hover:border-[#0099FF]/40 hover:bg-[#0099FF]/3"
                    )}
                  >
                    <span className="text-3xl">{meta.icon}</span>
                    <span className="font-medium">{type}</span>
                    <span className="text-xs text-muted-foreground">
                      {settings.multipliers[type]}x multiplier
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Preferred Date</Label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label>Time Slot</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {TIME_SLOTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlot(s)}
                      className={cn(
                        "rounded-lg border-2 px-3 py-2 text-sm transition-all",
                        slot === s
                          ? "border-[#0099FF] bg-[#0099FF]/5 font-medium shadow-sm"
                          : "border-muted hover:border-[#0099FF]/40"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && selectedBin && wastageType && (
            <div className="space-y-3">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Bin</span>
                  <span className="font-medium text-right">{selectedBin.label}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Address</span>
                  <span className="max-w-[60%] break-words text-right font-medium">{selectedBin.address}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Wastage Type</span>
                  <span className="font-medium text-right">{WASTAGE_META[wastageType as WastageType].icon} {wastageType}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Date</span>
                  <span className="font-medium text-right">{date}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Time Slot</span>
                  <span className="font-medium text-right">{slot}</span>
                </div>
                <div className="flex justify-between gap-4 border-t pt-2">
                  <span className="text-muted-foreground shrink-0">Current Fill Level</span>
                  <span className={cn(
                    "font-bold",
                    selectedBin.fillPct >= 80 ? "text-red-500" : selectedBin.fillPct >= 50 ? "text-yellow-500" : "text-green-500"
                  )}>
                    {selectedBin.fillPct}%
                  </span>
                </div>
              </div>
              {selectedBin.fillPct < MIN_FILL_FOR_PICKUP && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  This bin is under {MIN_FILL_FOR_PICKUP}% capacity. Your request may be declined.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {step < 4 ? (
          <Button
            onClick={() => setStep((s) => Math.min(4, s + 1))}
            disabled={!canProceed()}
            className="gap-1"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} className="gap-2 glow-primary">
            <Check className="h-4 w-4" /> Submit Request
          </Button>
        )}
      </div>

      <Dialog open={showDeclineModal} onOpenChange={setShowDeclineModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Request Declined
            </DialogTitle>
            <DialogDescription>
              Bin is currently under {MIN_FILL_FOR_PICKUP}% capacity. Pickups are accepted only at {MIN_FILL_FOR_PICKUP}%+ capacity.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowDeclineModal(false)}>OK, Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
