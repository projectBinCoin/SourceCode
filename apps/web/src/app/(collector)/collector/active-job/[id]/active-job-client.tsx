"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequest, useBins, useCollectors, useUserName } from "@/lib/hooks/queries";
import { useCompleteJob } from "@/lib/hooks/mutations";
import { useDataStore } from "@/lib/store/data-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, MapPin, Trash2, User, Clock, Navigation, Camera, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { WASTAGE_META, WASTAGE_TYPES } from "@/lib/constants";
import { calcPoints } from "@/lib/points";
import type { WastageType } from "@/types";
import Link from "next/link";

type VerificationOption = "match" | "mismatch" | "invalid";

export default function ActiveJobPage() {
  // Static export: the real job id is the last URL segment — the Pages
  // redirect serves this page for every /active-job/<id> path.
  const id = typeof window !== "undefined"
    ? window.location.pathname.split("/").filter(Boolean).pop() ?? ""
    : "";
  const router = useRouter();
  const { data: request } = useRequest(id);
  const { data: bins = [] } = useBins();
  const { data: collectors = [] } = useCollectors();
  const completeJob = useCompleteJob();
  const settings = useDataStore((s) => s.settings);

  const [showVerification, setShowVerification] = useState(false);
  const [option, setOption] = useState<VerificationOption>("match");
  const [observedFill, setObservedFill] = useState(80);
  const [actualType, setActualType] = useState<WastageType>("Plastic");
  const [comment, setComment] = useState("");
  const [photoRef, setPhotoRef] = useState<string | null>(null);

  const bin = request ? bins.find((b) => b.id === request.binId) : undefined;
  const collector = request?.collectorId
    ? collectors.find((c) => c.id === request.collectorId)
    : undefined;
  const citizenName = useUserName(request?.citizenId);

  if (!request || !bin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Job not found.</p>
        <Link href="/collector/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoRef(`photo_${request.id}_${Date.now()}`);
    }
  };

  const handleComplete = () => {
    if (option !== "match" && !comment.trim()) return;
    if (option !== "match" && !photoRef) return;

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
      photoRef: photoRef || undefined,
      pointsAwarded: result.points,
      mismatchFlag: option === "mismatch",
      invalidFlag: option === "invalid",
    });

    setShowVerification(false);
    router.push("/collector/dashboard");
  };

  const canComplete = () => {
    if (option === "match") return true;
    return comment.trim().length > 0 && !!photoRef;
  };

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      <Link href="/collector/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Map
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Active Job</h1>
        <p className="text-muted-foreground">Navigate to the location and verify the collection.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" /> Navigation Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{bin.label}</span>
          </div>
          <p className="text-sm text-muted-foreground pl-6">{bin.address}</p>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>Citizen: {citizenName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Preferred slot: {request.preferredSlot}</span>
          </div>
          {collector && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Assigned to: {collector.name}</span>
            </div>
          )}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${bin.lat},${bin.lng}&travelmode=driving`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button className="w-full gap-2 glow-primary" size="lg">
              <Navigation className="h-5 w-5" /> Start Turn-by-Turn Navigation
            </Button>
          </a>
          <p className="text-xs text-center text-muted-foreground">
            Opens Google Maps with driving directions to the bin — works on your phone.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-primary" /> Registered Wastage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{WASTAGE_META[request.wastageType].icon}</span>
              <div>
                <p className="font-medium">{request.wastageType}</p>
                <p className="text-sm text-muted-foreground">
                  Bin: {bin.sizeL}L • Fill: {bin.fillPct}%
                </p>
              </div>
            </div>
            <Badge variant="outline">
              {settings.multipliers[request.wastageType]}x multiplier
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={() => setShowVerification(true)}
        size="lg"
        className="w-full gap-2 glow-primary"
      >
        <CheckCircle2 className="h-5 w-5" /> Inspect & Confirm Collection
      </Button>

      <Dialog open={showVerification} onOpenChange={setShowVerification}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verify Collection</DialogTitle>
            <DialogDescription>
              Inspect the waste and confirm the collection details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Option selector */}
            <div className="space-y-2">
              <Label>Inspection Result</Label>
              <div className="grid gap-2">
                <button
                  onClick={() => setOption("match")}
                  className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                    option === "match" ? "border-[#0099FF] bg-[#0099FF]/5 shadow-sm" : "border-muted hover:border-[#0099FF]/40"
                  }`}
                >
                  <CheckCircle2 className={`h-5 w-5 ${option === "match" ? "text-[#0099FF]" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium">Matches Registration</p>
                    <p className="text-xs text-muted-foreground">Waste matches the registered type</p>
                  </div>
                </button>
                <button
                  onClick={() => setOption("mismatch")}
                  className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                    option === "mismatch" ? "border-amber-500 bg-amber-500/5 shadow-sm" : "border-muted hover:border-amber-500/40"
                  }`}
                >
                  <AlertTriangle className={`h-5 w-5 ${option === "mismatch" ? "text-amber-500" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium">Wastage Mismatch</p>
                    <p className="text-xs text-muted-foreground">Different material found — points recalculated</p>
                  </div>
                </button>
                <button
                  onClick={() => setOption("invalid")}
                  className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                    option === "invalid" ? "border-destructive bg-destructive/5 shadow-sm" : "border-muted hover:border-destructive/40"
                  }`}
                >
                  <XCircle className={`h-5 w-5 ${option === "invalid" ? "text-destructive" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium">Invalid / Contaminated Waste</p>
                    <p className="text-xs text-muted-foreground">Penalty applied — 0 points awarded</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Fill percentage */}
            {option !== "invalid" && (
              <div className="space-y-2">
                <Label>Observed Fill Percentage: {observedFill}%</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={observedFill}
                  onChange={(e) => setObservedFill(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            {/* Mismatch: actual type */}
            {option === "mismatch" && (
              <div className="space-y-2">
                <Label>Actual Material Found</Label>
                <Select value={actualType} onValueChange={(v) => v && setActualType(v as WastageType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WASTAGE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {WASTAGE_META[t].icon} {t} ({settings.multipliers[t]}x)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Comment for mismatch/invalid */}
            {option !== "match" && (
              <div className="space-y-2">
                <Label>Driver Comment (Required) *</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    option === "invalid"
                      ? "Explain the contamination/penalty reason..."
                      : "Explain the mismatch reason..."
                  }
                  rows={3}
                />
              </div>
            )}

            {/* Photo evidence for mismatch/invalid */}
            {option !== "match" && (
              <div className="space-y-2">
                <Label>Photo Evidence (Required) *</Label>
                <div className="flex items-center gap-3">
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-4 hover:border-primary/50 transition-colors">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {photoRef ? "Photo captured ✓" : "Take Photo / Upload"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Points preview */}
            {option !== "invalid" && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Points</span>
                  <span className="font-bold text-primary">
                    {calcPoints({
                      binSizeL: bin.sizeL,
                      fillPct: observedFill,
                      wastageType: request.wastageType,
                      settings,
                      override: option === "mismatch" ? "mismatch" : undefined,
                      actualWastageType: option === "mismatch" ? actualType : undefined,
                    }).points} pts
                  </span>
                </div>
              </div>
            )}
            {option === "invalid" && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm text-destructive font-medium">Points: 0 (Penalty Applied)</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerification(false)}>Cancel</Button>
            <Button onClick={handleComplete} disabled={!canComplete()} className="gap-2 glow-primary">
              <CheckCircle2 className="h-4 w-4" /> Complete Pickup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
