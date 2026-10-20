"use client";

import { useEffect, useState } from "react";
import { useJsApiLoader, GoogleMap as GoogleMapReact, Circle, Polyline } from "@react-google-maps/api";
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
  radiusCenter?: { lat: number; lng: number };
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
  radiusCenter,
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
    path: { lat: number; lng: number }[];
  } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  const routeKey = route ? `${route.from.lat},${route.from.lng}>${route.to.lat},${route.to.lng}` : null;

  useEffect(() => {
    if (!route || !routeKey || !isLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        // Routes API (the replacement for legacy DirectionsService). The
        // bundled @types predate Route.computeRoutes — typed manually here.
        const { Route } = (await google.maps.importLibrary("routes")) as unknown as {
          Route: {
            computeRoutes: (req: unknown) => Promise<{
              routes?: {
                path?: unknown[];
                distanceMeters?: number;
                durationMillis?: number;
              }[];
            }>;
          };
        };
        const { routes } = await Route.computeRoutes({
          origin: { location: { latLng: { latitude: route.from.lat, longitude: route.from.lng } } },
          destination: { location: { latLng: { latitude: route.to.lat, longitude: route.to.lng } } },
          travelMode: "DRIVING",
          fields: ["path", "distanceMeters", "durationMillis"],
        });
        const r = routes?.[0];
        const raw = (r?.path ?? []) as unknown[];
        const path = raw.map((p) => {
          const pt = p as { lat: number | (() => number); lng: number | (() => number) };
          return { lat: typeof pt.lat === "function" ? pt.lat() : pt.lat, lng: typeof pt.lng === "function" ? pt.lng() : pt.lng };
        });
        if (cancelled) return;
        if (r && path.length) {
          setRouteResult({ key: routeKey, path });
          setFailedKey(null);
          const km = ((r as { distanceMeters?: number }).distanceMeters ?? 0) / 1000;
          const mins = Math.round(((r as { durationMillis?: number }).durationMillis ?? 0) / 60000);
          onRouteInfo?.({ distanceText: `${km.toFixed(1)} km`, durationText: `${mins} min` });
        } else {
          setRouteResult(null);
          setFailedKey(routeKey);
          onRouteInfo?.(null);
        }
      } catch {
        // Routes API not enabled for the key or no route — straight-line fallback.
        if (!cancelled) {
          setRouteResult(null);
          setFailedKey(routeKey);
          onRouteInfo?.(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
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
            center={radiusCenter ?? center}
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
          <Polyline
            path={routeResult.path}
            options={{ strokeColor: "#0099FF", strokeWeight: 5, strokeOpacity: 0.85 }}
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
