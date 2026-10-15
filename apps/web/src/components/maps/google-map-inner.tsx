"use client";

import { useEffect, useState } from "react";
import { useJsApiLoader, GoogleMap as GoogleMapReact, Circle, DirectionsRenderer, Polyline } from "@react-google-maps/api";
import type { ReactNode } from "react";
import { useTheme } from "next-themes";
import { MAP_DEFAULT_ZOOM, LIGHT_MAP_STYLES, DARK_MAP_STYLES } from "@/lib/constants";

const libraries: ("geometry" | "places" | "drawing")[] = ["geometry"];

export interface MapRoute {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

interface GoogleMapInnerProps {
  center: { lat: number; lng: number };
  zoom?: number;
  apiKey: string;
  children?: ReactNode;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  radiusKm?: number;
  showRadius?: boolean;
  route?: MapRoute | null;
  onRouteInfo?: (info: { distanceText: string; durationText: string } | null) => void;
}

export function GoogleMapInner({
  center,
  zoom = MAP_DEFAULT_ZOOM,
  apiKey,
  children,
  onMapClick,
  className,
  radiusKm,
  showRadius = false,
  route,
  onRouteInfo,
}: GoogleMapInnerProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
    libraries,
  });
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const [routeResult, setRouteResult] = useState<{
    key: string;
    directions: google.maps.DirectionsResult;
  } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  const routeKey = route ? `${route.from.lat},${route.from.lng}>${route.to.lat},${route.to.lng}` : null;

  useEffect(() => {
    if (!route || !routeKey || !isLoaded) return;
    const service = new window.google.maps.DirectionsService();
    service.route(
      {
        origin: route.from,
        destination: route.to,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          setRouteResult({ key: routeKey, directions: result });
          setFailedKey(null);
          const leg = result.routes[0]?.legs[0];
          onRouteInfo?.(
            leg
              ? { distanceText: leg.distance?.text ?? "", durationText: leg.duration?.text ?? "" }
              : null
          );
        } else {
          // Directions API not enabled or no route — fall back to a straight line.
          setRouteResult(null);
          setFailedKey(routeKey);
          onRouteInfo?.(null);
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, isLoaded]);

  if (!isLoaded) {
    return (
      <div className={`flex min-h-[250px] items-center justify-center rounded-lg border bg-muted ${className || "h-[300px] sm:h-[400px] md:h-[500px]"}`}>
        <p className="text-sm text-muted-foreground">Loading map…</p>
      </div>
    );
  }

  return (
    <div className={`h-full min-h-[250px] overflow-hidden rounded-lg border ${className || "h-[300px] sm:h-[400px] md:h-[500px]"}`}>
      <GoogleMapReact
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={zoom}
        onClick={(e) => {
          if (onMapClick && e.latLng) {
            onMapClick(e.latLng.lat(), e.latLng.lng());
          }
        }}
        options={{
          styles: dark ? DARK_MAP_STYLES : LIGHT_MAP_STYLES,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
        }}
      >
        {showRadius && radiusKm && (
          <Circle
            center={center}
            radius={radiusKm * 1000}
            options={{
              fillColor: "#0099FF",
              fillOpacity: 0.08,
              strokeColor: "#0099FF",
              strokeOpacity: 0.4,
              strokeWeight: 2,
              clickable: false,
            }}
          />
        )}
        {route && routeResult?.key === routeKey && (
          <DirectionsRenderer
            directions={routeResult.directions}
            options={{
              suppressMarkers: true,
              polylineOptions: { strokeColor: "#0099FF", strokeWeight: 5, strokeOpacity: 0.85 },
            }}
          />
        )}
        {route && failedKey === routeKey && (
          <Polyline
            path={[route.from, route.to]}
            options={{ strokeColor: "#0099FF", strokeOpacity: 0.7, strokeWeight: 4 }}
          />
        )}
        {children}
      </GoogleMapReact>
    </div>
  );
}
