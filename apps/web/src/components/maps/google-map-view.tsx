"use client";

import dynamic from "next/dynamic";
import { MAP_DEFAULT_ZOOM } from "@/lib/constants";
import type { ReactNode } from "react";
import type { MapRoute } from "./google-map-inner";

const GoogleMapInner = dynamic(
  () => import("./google-map-inner").then((m) => m.GoogleMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-lg border bg-muted">
        <p className="text-sm text-muted-foreground">Loading map…</p>
      </div>
    ),
  }
);

interface GoogleMapViewProps {
  center: { lat: number; lng: number };
  radiusCenter?: { lat: number; lng: number };
  zoom?: number;
  children?: ReactNode;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  showRadius?: boolean;
  radiusKm?: number;
  route?: MapRoute | null;
  onRouteInfo?: (info: { distanceText: string; durationText: string } | null) => void;
}

export function GoogleMapView(props: GoogleMapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return null;
  }

  return (
    <GoogleMapInner
      center={props.center}
      radiusCenter={props.radiusCenter}
      zoom={props.zoom || MAP_DEFAULT_ZOOM}
      apiKey={apiKey}
      onMapClick={props.onMapClick}
      className={props.className}
      showRadius={props.showRadius}
      radiusKm={props.radiusKm}
      route={props.route}
      onRouteInfo={props.onRouteInfo}
    >
      {props.children}
    </GoogleMapInner>
  );
}
