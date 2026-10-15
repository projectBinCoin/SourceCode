"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRequests, useBins, useCollectors, useUserName } from "@/lib/hooks/queries";
import { useClaimJob } from "@/lib/hooks/mutations";
import { MapView } from "@/components/maps/map-view";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MapPin, Trash2, User, Clock, Hand, Navigation, Route, LocateFixed, ShieldAlert } from "lucide-react";
import { WASTAGE_META, COLLECTOR_RADIUS_KM, HIGH_FILL_THRESHOLD, MAP_CENTER } from "@/lib/constants";
import { haversineKm } from "@/lib/points";
import type { MapRoute } from "@/components/maps/google-map-inner";
import type { Bin, PickupRequest } from "@/types";

type GeoState = "requesting" | "tracking" | "denied" | "unavailable";

export default function CollectorDashboard() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { data: requests = [] } = useRequests();
  const { data: bins = [] } = useBins();
  const { data: collectors = [] } = useCollectors();
  const claimJob = useClaimJob();

  const collector = collectors.find((c) => c.userId === user?.id);
  const collectorLat = collector?.lat || MAP_CENTER.lat;
  const collectorLng = collector?.lng || MAP_CENTER.lng;

  const [geo, setGeo] = useState<GeoState>("requesting");
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ type: "job" | "bin"; req?: PickupRequest; bin?: Bin } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const geoSupported = typeof navigator !== "undefined" && !!navigator.geolocation;
  const effectiveGeo: GeoState = geoSupported ? geo : "unavailable";

  const beginWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeo("tracking");
      },
      (err) => {
        setGeo(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  };

  const startTracking = () => {
    setGeo("requesting");
    beginWatch();
  };

  // Ask for location access as soon as the collector opens the dashboard,
  // then keep following their movements while the page is open.
  useEffect(() => {
    if (!geoSupported) return;
    beginWatch();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const center = liveLocation ?? { lat: collectorLat, lng: collectorLng };

  // Active pending requests (jobs available to claim)
  const availableJobs = requests.filter((r) => r.status === "pending");

  // Public bins >= 80% fill
  const highFillBins = bins.filter((b) => b.isPublic && b.fillPct >= HIGH_FILL_THRESHOLD);

  const [route, setRoute] = useState<MapRoute | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceText: string; durationText: string } | null>(null);

  const handleShowRoute = (lat: number, lng: number) => {
    setRoute({ from: center, to: { lat, lng } });
  };

  const navigateUrl = (lat: number, lng: number) =>
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

  const handleClaim = (req: PickupRequest) => {
    if (!collector) return;
    claimJob(req.id, collector.id);
    setSelectedItem(null);
    setRoute(null);
    router.push(`/collector/active-job/${req.id}`);
  };

  const jobBin = selectedItem?.req ? bins.find((b) => b.id === selectedItem.req!.binId) : null;
  const jobCitizenName = useUserName(selectedItem?.req?.citizenId);

  return (
    <div className="w-full space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Collector Dashboard</h1>
          <p className="text-muted-foreground">Nearby pickup requests and high-fill bins</p>
        </div>
        {effectiveGeo === "tracking" ? (
          <Badge variant="outline" className="gap-1.5 border-green-500/40 text-green-600 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Live location tracking on
          </Badge>
        ) : (
          <Button variant="outline" size="sm" onClick={startTracking} className="gap-2 shrink-0">
            <LocateFixed className="h-4 w-4" />
            {effectiveGeo === "denied" ? "Location Blocked — Retry" : "Enable Location"}
          </Button>
        )}
      </div>

      {effectiveGeo === "denied" && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Location access is blocked for this site. Allow it in your browser settings
            (site permissions → Location) to see jobs near you as you move. Jobs are
            currently shown around your registered base location.
          </span>
        </div>
      )}
      {effectiveGeo === "unavailable" && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Your location is unavailable right now — using your registered base location.</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-[#0099FF]/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#003B73] to-[#0055A4] shadow-md">
                <Trash2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{availableJobs.length}</p>
                <p className="text-xs text-muted-foreground">Available Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#0099FF]/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-500 shadow-md">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{highFillBins.length}</p>
                <p className="text-xs text-muted-foreground">Critical Bins (≥80%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#0099FF]/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sapphire-gradient shadow-md glow-primary">
                <Navigation className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{COLLECTOR_RADIUS_KM}km</p>
                <p className="text-xs text-muted-foreground">Search Radius</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MapView
        center={center}
        bins={bins}
        requests={availableJobs}
        onBinClick={(bin) => setSelectedItem({ type: "bin", bin })}
        onRequestClick={(req) => setSelectedItem({ type: "job", req })}
        showRadius
        radiusKm={COLLECTOR_RADIUS_KM}
        filterBinsByRadius
        fillThreshold={HIGH_FILL_THRESHOLD}
        route={route}
        onRouteInfo={setRouteInfo}
        collectorMarker={liveLocation ? { lat: liveLocation.lat, lng: liveLocation.lng } : undefined}
        className="h-[300px] sm:h-[400px] md:h-[500px]"
      />

      {liveLocation && (
        <p className="text-xs text-muted-foreground text-center">
          Blue dot = your live position. Jobs update within {COLLECTOR_RADIUS_KM}km as you move.
        </p>
      )}

      <Sheet
        open={!!selectedItem}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
            setRoute(null);
            setRouteInfo(null);
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-md">
          {selectedItem?.type === "job" && selectedItem.req && jobBin && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-orange-500" /> Pickup Job
                </SheetTitle>
                <SheetDescription>Review and claim this collection job</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4 px-4 pb-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{jobBin.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">{jobBin.address}</p>
                  <div className="flex items-center gap-2 text-sm pl-6">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                    <span>{WASTAGE_META[selectedItem.req.wastageType].icon} {selectedItem.req.wastageType}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm pl-6">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Preferred: {selectedItem.req.preferredSlot}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm pl-6">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Citizen: {jobCitizenName}</span>
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bin Size</span>
                    <span className="font-medium">{jobBin.sizeL}L</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Fill Level</span>
                    <span className={`font-bold ${jobBin.fillPct >= 80 ? "text-red-500" : "text-yellow-500"}`}>
                      {jobBin.fillPct}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Distance</span>
                    <span className="font-medium">
                      {routeInfo
                        ? `${routeInfo.distanceText} • ${routeInfo.durationText} drive`
                        : `${haversineKm(center.lat, center.lng, jobBin.lat, jobBin.lng).toFixed(2)} km`}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleShowRoute(jobBin.lat, jobBin.lng)}
                    className="gap-2"
                  >
                    <Route className="h-4 w-4" /> Route
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(navigateUrl(jobBin.lat, jobBin.lng), "_blank")}
                    className="gap-2"
                  >
                    <Navigation className="h-4 w-4" /> Navigate
                  </Button>
                </div>
                {route && (
                  <p className="text-xs text-center text-muted-foreground">
                    Route drawn on the map from your location to the bin.
                  </p>
                )}
                <Button onClick={() => handleClaim(selectedItem.req!)} className="w-full gap-2 glow-primary" size="lg">
                  <Hand className="h-4 w-4" /> Claim Job
                </Button>
              </div>
            </>
          )}
          {selectedItem?.type === "bin" && selectedItem.bin && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-red-500" /> High-Fill Smart Bin
                </SheetTitle>
                <SheetDescription>This bin needs urgent collection</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4 px-4 pb-6">
                <div className="space-y-2">
                  <p className="font-medium">{selectedItem.bin.label}</p>
                  <p className="text-sm text-muted-foreground">{selectedItem.bin.address}</p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fill Level</span>
                    <Badge variant="destructive">{selectedItem.bin.fillPct}% Full</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bin Size</span>
                    <span>{selectedItem.bin.sizeL}L</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Device ID</span>
                    <span className="font-mono text-xs">{selectedItem.bin.deviceId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Distance</span>
                    <span>{haversineKm(center.lat, center.lng, selectedItem.bin.lat, selectedItem.bin.lng).toFixed(2)} km</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleShowRoute(selectedItem.bin!.lat, selectedItem.bin!.lng)}
                    className="gap-2"
                  >
                    <Route className="h-4 w-4" /> Route
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(navigateUrl(selectedItem.bin!.lat, selectedItem.bin!.lng), "_blank")}
                    className="gap-2"
                  >
                    <Navigation className="h-4 w-4" /> Navigate
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  This bin has exceeded the 80% fill threshold. No active pickup request is associated with it yet.
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
