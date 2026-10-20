"use client";

import { useState } from "react";
import { useBins } from "@/lib/hooks/queries";
import { useAddBin, useApproveBin, useRejectBin, useRequestRecalibration } from "@/lib/hooks/mutations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MapPin, Check, X, Clock, User, Pencil } from "lucide-react";
import { BIN_SIZES, getFillColor, MAP_CENTER, WASTAGE_TYPES, WASTAGE_META } from "@/lib/constants";
import { MapView } from "@/components/maps/map-view";
import type { BinSize, WastageType } from "@/types";
import { fmtDate, fmtFillPct } from "@/lib/dates";
import { EditBinDialog } from "@/components/bins/edit-bin-dialog";

export default function AdminBinsPage() {
  const { data: bins = [] } = useBins();
  const addBin = useAddBin();
  const approveBin = useApproveBin();
  const requestRecalibration = useRequestRecalibration();
  const rejectBin = useRejectBin();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingBin = editingId ? bins.find((b) => b.id === editingId) : undefined;
  const [deviceId, setDeviceId] = useState("");
  const [label, setLabel] = useState("");
  const [sizeL, setSizeL] = useState<BinSize>(100);
  const [wasteType, setWasteType] = useState<WastageType>("Plastic");
  const [lat, setLat] = useState(MAP_CENTER.lat);
  const [lng, setLng] = useState(MAP_CENTER.lng);
  const [address, setAddress] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [fillPct, setFillPct] = useState(0);
  const [region, setRegion] = useState("Colombo 07");
  const [deviceIdError, setDeviceIdError] = useState("");

  const pendingBins = bins.filter((b) => b.approvalStatus === "pending");
  const approvedBins = bins.filter((b) => b.approvalStatus === "approved" || !b.approvalStatus);

  const handleMapClick = (clickedLat: number, clickedLng: number) => {
    setLat(clickedLat);
    setLng(clickedLng);
  };

  const resetForm = () => {
    setDeviceId("");
    setLabel("");
    setSizeL(100);
    setWasteType("Plastic");
    setLat(MAP_CENTER.lat);
    setLng(MAP_CENTER.lng);
    setAddress("");
    setIsPublic(true);
    setFillPct(0);
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
      lat,
      lng,
      address: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      sizeL,
      fillPct,
      isPublic,
      region,
      wasteType,
    });

    resetForm();
    setShowForm(false);
  };

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Smart Bin Registry</h1>
          <p className="text-muted-foreground">Register, approve, and manage all municipal smart bins</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 glow-primary shrink-0">
          <Plus className="h-4 w-4" /> Register New Bin
        </Button>
      </div>

      <Tabs defaultValue="approved">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="approved" className="flex-1 sm:flex-initial">
            Approved ({approvedBins.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1 sm:flex-initial">
            Pending Approval
            {pendingBins.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs">
                {pendingBins.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Approved bins */}
        <TabsContent value="approved" className="mt-4">
          <Card className="w-full overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Registered Bins ({approvedBins.length})</CardTitle>
              <CardDescription>All ESP32-connected smart bins in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device ID</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Waste Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-center">Fill</TableHead>
                      <TableHead className="text-center">Battery</TableHead>
                      <TableHead>Access</TableHead>
                      <TableHead>Sensor</TableHead>
                      <TableHead>Last Ping</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedBins.map((bin) => (
                      <TableRow key={bin.id}>
                        <TableCell className="font-mono text-xs">{bin.deviceId}</TableCell>
                        <TableCell className="font-medium">{bin.label}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <span>{(WASTAGE_META[bin.wasteType] || WASTAGE_META.Plastic).icon}</span>
                            {bin.wasteType || "Plastic"}
                          </span>
                        </TableCell>
                        <TableCell>{bin.sizeL}L</TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold" style={{ color: getFillColor(bin.fillPct) }}>
                            {fmtFillPct(bin.fillPct)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={bin.batteryPct < 30 ? "text-red-500 font-medium" : ""}>
                            {bin.batteryPct}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={bin.isPublic ? "default" : "secondary"}>
                            {bin.isPublic ? "Public" : "Private"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {bin.binHeightCm ? (
                            <span className="text-muted-foreground">{Math.round(bin.binHeightCm)} cm</span>
                          ) : (
                            <span className="text-amber-600">Uncalibrated</span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-1 h-6 px-2 text-xs"
                            disabled={!!bin.recalibrateRequested}
                            onClick={() => requestRecalibration(bin.id)}
                          >
                            {bin.recalibrateRequested ? "Queued…" : "Recalibrate"}
                          </Button>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {fmtDate(bin.lastPingAt, "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => setEditingId(bin.id)}>
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending approval */}
        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingBins.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No pending bin registrations.</p>
              </CardContent>
            </Card>
          ) : (
            pendingBins.map((bin) => (
              <Card key={bin.id} className="w-full overflow-hidden border-amber-500/20">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                        <MapPin className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{bin.label}</p>
                        <p className="text-xs text-muted-foreground font-mono">{bin.deviceId}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{(WASTAGE_META[bin.wasteType] || WASTAGE_META.Plastic).icon} {bin.wasteType || "Plastic"}</span>
                          <span>•</span>
                          <span>{bin.sizeL}L</span>
                          <span>•</span>
                          <span>{bin.region}</span>
                          <span>•</span>
                          <span className="font-mono">{bin.lat.toFixed(4)}, {bin.lng.toFixed(4)}</span>
                          {bin.submittedBy && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" /> Citizen
                              </span>
                            </>
                          )}
                        </div>
                        {bin.submittedAt && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Submitted {fmtDate(bin.submittedAt, "MMM d, yyyy 'at' HH:mm")}
                          </p>
                        )}
                        <div className={`mt-2 flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs ${bin.binHeightCm ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
                          {bin.binHeightCm ? (
                            <span>Sensor self-calibrated — inside height {Math.round(bin.binHeightCm)} cm{bin.calibratedAt ? ` (${fmtDate(bin.calibratedAt, "MMM d, HH:mm")})` : ""}</span>
                          ) : (
                            <span>No sensor calibration yet — the bin proves its own height during setup</span>
                          )}
                        </div>
                        {bin.recalibrateRequested && (
                          <p className="mt-1 w-fit rounded-lg bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-400">
                            Owner requested a height re-measure — wait for the new height before approving
                          </p>
                        )}
                        {bin.pairingCode && (
                          <p className="mt-1 text-[11px] text-muted-foreground">🔒 Paired — only this device can report telemetry</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => setEditingId(bin.id)} className="gap-1">
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                      <Button size="sm" onClick={() => approveBin(bin.id)} className="gap-1">
                        <Check className="h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => rejectBin(bin.id)} className="gap-1">
                        <X className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Register new bin dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Smart Bin</DialogTitle>
            <DialogDescription>
              Add a new ESP32-connected bin directly to the system. Drop a pin on the map to set GPS coordinates.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deviceId">ESP32 Device ID *</Label>
                <Input
                  id="deviceId"
                  value={deviceId}
                  onChange={(e) => { setDeviceId(e.target.value); setDeviceIdError(""); }}
                  placeholder="ESP32-XXXXXX"
                />
                {deviceIdError && <p className="text-xs text-destructive">{deviceIdError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Bin Label *</Label>
                <Input
                  id="label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., Cinnamon Gardens Bin #13"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Bin Size</Label>
                <Select value={String(sizeL)} onValueChange={(v) => v && setSizeL(Number(v) as BinSize)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BIN_SIZES.map((s) => (
                      <SelectItem key={s} value={String(s)}>{s}L</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g., Colombo 07"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Waste Type</Label>
              <Select value={wasteType} onValueChange={(v) => v && setWasteType(v as WastageType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WASTAGE_TYPES.map((wt) => (
                    <SelectItem key={wt} value={wt}>
                      {WASTAGE_META[wt].icon} {wt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address (optional — defaults to coordinates)"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Drop pin on map to set GPS coordinates</Label>
              <MapView
                center={{ lat, lng }}
                onMapClick={handleMapClick}
                pin={{ lat, lng }}
                className="h-[200px] sm:h-[250px] w-full"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Initial Fill Level: {fillPct}%</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={fillPct}
                  onChange={(e) => setFillPct(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Bin Type</Label>
                <Select value={isPublic ? "public" : "private"} onValueChange={(v) => setIsPublic(v === "public")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="gap-2">
              <Plus className="h-4 w-4" /> Register Bin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {editingBin && (
        <EditBinDialog
          key={editingBin.id}
          bin={editingBin}
          mode="admin"
          open
          onOpenChange={(o) => !o && setEditingId(null)}
        />
      )}
    </div>
  );
}
