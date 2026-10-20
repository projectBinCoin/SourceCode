"use client";

import { useState } from "react";
import { useBins } from "@/lib/hooks/queries";
import { MapView } from "@/components/maps/map-view";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Battery, Radio, Gauge, Clock, MapPin, Activity } from "lucide-react";
import { getFillColor, getFillLevel, MAP_CENTER } from "@/lib/constants";
import type { Bin } from "@/types";
import { fmtDate, fmtFillPct } from "@/lib/dates";

export default function AdminDashboardPage() {
  const { data: bins = [] } = useBins();
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);

  const handleBinClick = (bin: Bin) => {
    setSelectedBin(bin);
  };

  const greenCount = bins.filter((b) => b.fillPct < 50).length;
  const yellowCount = bins.filter((b) => b.fillPct >= 50 && b.fillPct < 80).length;
  const redCount = bins.filter((b) => b.fillPct >= 80).length;

  return (
    <div className="w-full space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Operations Map</h1>
        <p className="text-muted-foreground">Monitor all municipal smart bins in real-time</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-[#0099FF]/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{bins.length}</p>
            <p className="text-xs text-muted-foreground">Total Bins</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/10">
          <CardContent className="p-4 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
            <div>
              <p className="text-xl font-bold">{greenCount}</p>
              <p className="text-xs text-muted-foreground">Low (0-49%)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/10">
          <CardContent className="p-4 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50" />
            <div>
              <p className="text-xl font-bold">{yellowCount}</p>
              <p className="text-xs text-muted-foreground">High (50-79%)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/10">
          <CardContent className="p-4 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50 pulse-glow" />
            <div>
              <p className="text-xl font-bold">{redCount}</p>
              <p className="text-xs text-muted-foreground">Critical (≥80%)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <MapView
        center={MAP_CENTER}
        bins={bins}
        onBinClick={handleBinClick}
        className="h-[300px] sm:h-[400px] md:h-[500px]"
      />

      <Sheet open={!!selectedBin} onOpenChange={(open) => !open && setSelectedBin(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedBin && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: getFillColor(selectedBin.fillPct) }}
                  />
                  {selectedBin.label}
                </SheetTitle>
                <SheetDescription>
                  JSN-SR04T Sensor Telemetry
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4 px-4 pb-6">
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {selectedBin.address}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Device: <span className="font-mono">{selectedBin.deviceId}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Size: {selectedBin.sizeL}L • {selectedBin.isPublic ? "Public" : "Private"} • {selectedBin.region}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Card className="border-[#0099FF]/8">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-[#0099FF]" />
                        <span className="text-xs text-muted-foreground">Air Gap</span>
                      </div>
                      <p className="text-xl font-bold mt-1">{selectedBin.airGapCm} cm</p>
                    </CardContent>
                  </Card>
                  <Card className="border-[#0099FF]/8">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#0099FF]" />
                        <span className="text-xs text-muted-foreground">Fill Level</span>
                      </div>
                      <p
                        className="text-xl font-bold mt-1"
                        style={{ color: getFillColor(selectedBin.fillPct) }}
                      >
                        {fmtFillPct(selectedBin.fillPct)}
                      </p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {getFillLevel(selectedBin.fillPct)}
                      </Badge>
                    </CardContent>
                  </Card>
                  <Card className="border-[#0099FF]/8">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Battery className="h-4 w-4 text-[#0099FF]" />
                        <span className="text-xs text-muted-foreground">Battery</span>
                      </div>
                      <p className={`text-xl font-bold mt-1 ${selectedBin.batteryPct < 30 ? "text-red-500" : ""}`}>
                        {selectedBin.batteryPct}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-[#0099FF]/8">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#0099FF]" />
                        <span className="text-xs text-muted-foreground">Last Ping</span>
                      </div>
                      <p className="text-xs font-medium mt-1">
                        {fmtDate(selectedBin.lastPingAt, "MMM d, HH:mm:ss")}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-lg border border-[#0099FF]/20 bg-gradient-to-br from-[#003B73]/5 to-[#0099FF]/5 p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <Radio className="h-4 w-4 text-[#0099FF]" /> Sensor Telemetry
                    </Label>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Live readings from the bin&apos;s JSN-SR04T ultrasonic sensor. Fill levels update
                    as collections are verified in the field.
                  </p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
