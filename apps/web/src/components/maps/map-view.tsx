"use client";

import { GoogleMapView } from "./google-map-view";
import { SvgFallbackMap } from "./svg-fallback-map";
import { MAP_DEFAULT_ZOOM, COLLECTOR_RADIUS_KM } from "@/lib/constants";
import { haversineKm } from "@/lib/points";
import type { Bin, PickupRequest } from "@/types";
import { SvgBinMarker, SvgJobMarker, SvgCollectorMarker, SvgRouteLine, SvgPinMarker } from "./svg-markers";
import { GoogleBinMarker, GoogleJobMarker } from "./google-markers";
import { Marker as GoogleMarker, OverlayView as GoogleOverlayView } from "@react-google-maps/api";
import type { MapRoute } from "./google-map-inner";

interface MapViewProps {
  center: { lat: number; lng: number };
  bins?: Bin[];
  requests?: PickupRequest[];
  onBinClick?: (bin: Bin) => void;
  onRequestClick?: (req: PickupRequest) => void;
  showRadius?: boolean;
  radiusKm?: number;
  collectorMarker?: { lat: number; lng: number; draggable?: boolean; onDrag?: (lat: number, lng: number) => void };
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  filterBinsByRadius?: boolean;
  fillThreshold?: number;
  route?: MapRoute | null;
  onRouteInfo?: (info: { distanceText: string; durationText: string } | null) => void;
  pin?: { lat: number; lng: number } | null;
}

export function MapView({
  center,
  bins = [],
  requests = [],
  onBinClick,
  onRequestClick,
  showRadius = false,
  radiusKm = COLLECTOR_RADIUS_KM,
  collectorMarker,
  onMapClick,
  className,
  filterBinsByRadius = false,
  fillThreshold,
  route,
  onRouteInfo,
  pin,
}: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const useGoogle = !!apiKey;

  // Filter bins by radius if needed
  const visibleBins = filterBinsByRadius
    ? bins.filter(
        (b) => haversineKm(center.lat, center.lng, b.lat, b.lng) <= radiusKm
      )
    : bins;

  const thresholdBins = fillThreshold !== undefined ? visibleBins.filter((b) => b.fillPct >= fillThreshold) : visibleBins;

  // Filter requests by radius if needed
  const visibleRequests = filterBinsByRadius
    ? requests.filter((r) => {
        const bin = bins.find((b) => b.id === r.binId);
        if (!bin) return false;
        return haversineKm(center.lat, center.lng, bin.lat, bin.lng) <= radiusKm;
      })
    : requests;

  if (useGoogle) {
    return (
      <GoogleMapView
        center={center}
        zoom={MAP_DEFAULT_ZOOM}
        onMapClick={onMapClick}
        className={className}
        showRadius={showRadius}
        radiusKm={radiusKm}
        route={route}
        onRouteInfo={onRouteInfo}
      >
        {collectorMarker && (
          <GoogleMarker
            position={{ lat: collectorMarker.lat, lng: collectorMarker.lng }}
            draggable={collectorMarker.draggable}
            onDrag={(e) => collectorMarker.onDrag?.(e.latLng?.lat() || 0, e.latLng?.lng() || 0)}
            icon={{
              url:
                "data:image/svg+xml;charset=UTF-8," +
                encodeURIComponent(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="11" fill="#0099FF" stroke="white" stroke-width="2.5"/><circle cx="15" cy="15" r="4" fill="white"/></svg>'
                ),
              anchor: { x: 15, y: 15 } as unknown as google.maps.Point,
            }}
            title="Your location (drag to simulate driving)"
          />
        )}
        {pin && (
          <GoogleOverlayView
            position={{ lat: pin.lat, lng: pin.lng }}
            mapPaneName={GoogleOverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -h })}
          >
            <svg width={30} height={36} viewBox="0 0 30 36" style={{ display: "block" }}>
              <path
                d="M15 35 C 15 35 3 20 3 13 A 12 12 0 1 1 27 13 C 27 20 15 35 15 35 Z"
                fill="#0099FF"
                stroke="white"
                strokeWidth={2}
              />
              <circle cx={15} cy={13} r={4.5} fill="white" />
            </svg>
          </GoogleOverlayView>
        )}
        {thresholdBins.map((bin) => (
          <GoogleOverlayView
            key={bin.id}
            position={{ lat: bin.lat, lng: bin.lng }}
            mapPaneName={GoogleOverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -h })}
          >
            <GoogleBinMarker
              lat={bin.lat}
              lng={bin.lng}
              fillPct={bin.fillPct}
              label={bin.label}
              onClick={() => onBinClick?.(bin)}
            />
          </GoogleOverlayView>
        ))}
        {visibleRequests.map((req) => {
          const bin = bins.find((b) => b.id === req.binId);
          if (!bin) return null;
          return (
            <GoogleOverlayView
              key={req.id}
              position={{ lat: bin.lat, lng: bin.lng }}
              mapPaneName={GoogleOverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -h })}
            >
              <GoogleJobMarker
                lat={bin.lat}
                lng={bin.lng}
                label={bin.label}
                onClick={() => onRequestClick?.(req)}
              />
            </GoogleOverlayView>
          );
        })}
      </GoogleMapView>
    );
  }

  return (
    <SvgFallbackMap
      center={center}
      radiusKm={showRadius ? radiusKm : undefined}
      showRadius={showRadius}
      onMapClick={onMapClick}
      className={className}
    >
      {pin && <SvgPinMarker lat={pin.lat} lng={pin.lng} />}
      {route && <SvgRouteLine from={route.from} to={route.to} />}
      {collectorMarker && (
        <SvgCollectorMarker
          lat={collectorMarker.lat}
          lng={collectorMarker.lng}
          draggable={collectorMarker.draggable}
          onDrag={collectorMarker.onDrag}
        />
      )}
      {thresholdBins.map((bin) => (
        <SvgBinMarker
          key={bin.id}
          lat={bin.lat}
          lng={bin.lng}
          fillPct={bin.fillPct}
          label={bin.label}
          onClick={() => onBinClick?.(bin)}
        />
      ))}
      {visibleRequests.map((req) => {
        const bin = bins.find((b) => b.id === req.binId);
        if (!bin) return null;
        return (
          <SvgJobMarker
            key={req.id}
            lat={bin.lat}
            lng={bin.lng}
            label={bin.label}
            onClick={() => onRequestClick?.(req)}
          />
        );
      })}
    </SvgFallbackMap>
  );
}
