"use client";

import { createContext, useContext, useRef, useCallback, type ReactNode } from "react";

interface MapContextValue {
  project: (lat: number, lng: number) => { x: number; y: number };
  unproject: (x: number, y: number) => { lat: number; lng: number };
  width: number;
  height: number;
}

const MapContext = createContext<MapContextValue | null>(null);

export function useMapContext() {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error("useMapContext must be used within a map provider");
  return ctx;
}

const LAT_SPAN = 0.08;
const LNG_SPAN = 0.08;
const MAP_W = 800;
const MAP_H = 600;

interface SvgFallbackMapProps {
  center: { lat: number; lng: number };
  radiusKm?: number;
  children?: ReactNode;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  showRadius?: boolean;
}

export function SvgFallbackMap({
  center,
  radiusKm,
  children,
  onMapClick,
  className,
  showRadius = false,
}: SvgFallbackMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const project = useCallback(
    (lat: number, lng: number) => {
      const x = ((lng - (center.lng - LNG_SPAN / 2)) / LNG_SPAN) * MAP_W;
      const y = (((center.lat + LAT_SPAN / 2) - lat) / LAT_SPAN) * MAP_H;
      return { x, y };
    },
    [center]
  );

  const unproject = useCallback(
    (x: number, y: number) => {
      const lng = (x / MAP_W) * LNG_SPAN + (center.lng - LNG_SPAN / 2);
      const lat = center.lat + LAT_SPAN / 2 - (y / MAP_H) * LAT_SPAN;
      return { lat, lng };
    },
    [center]
  );

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onMapClick || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = MAP_W / rect.width;
    const scaleY = MAP_H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const { lat, lng } = unproject(x, y);
    onMapClick(lat, lng);
  };

  const centerPx = project(center.lat, center.lng);
  const radiusPixels = radiusKm
    ? (radiusKm / (LAT_SPAN * 111)) * MAP_H
    : 0;

  return (
    <MapContext.Provider value={{ project, unproject, width: MAP_W, height: MAP_H }}>
      <div
        className={`relative w-full overflow-hidden rounded-lg border border-[#0099FF]/20 svg-map-bg ${className || ""}`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          className="w-full"
          style={{ minHeight: "250px", height: "100%", cursor: onMapClick ? "crosshair" : "default" }}
          onClick={handleClick}
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Coordinate grid */}
          {[...Array(8)].map((_, i) => (
            <line key={`h${i}`} x1={0} y1={(i / 8) * MAP_H} x2={MAP_W} y2={(i / 8) * MAP_H} stroke="rgba(0,153,255,0.06)" strokeWidth={1} />
          ))}
          {[...Array(8)].map((_, i) => (
            <line key={`v${i}`} x1={(i / 8) * MAP_W} y1={0} x2={(i / 8) * MAP_W} y2={MAP_H} stroke="rgba(0,153,255,0.06)" strokeWidth={1} />
          ))}

          {/* Radius circle */}
          {showRadius && radiusKm && (
            <circle
              cx={centerPx.x}
              cy={centerPx.y}
              r={radiusPixels}
              fill="rgba(0,153,255,0.08)"
              stroke="rgba(0,153,255,0.4)"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
          )}

          {/* Center marker */}
          {showRadius && (
            <g transform={`translate(${centerPx.x}, ${centerPx.y})`}>
              <circle r={8} fill="#0099FF" stroke="white" strokeWidth={2} />
              <circle r={4} fill="white" />
            </g>
          )}

          {children}
        </svg>

        {/* Placeholder notice */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-[#050A10]/90 via-[#050A10]/60 to-transparent p-4 pt-12">
          <div className="max-w-md text-center">
            <p className="text-sm font-medium text-white">
              Google Maps is not configured
            </p>
            <p className="mt-1 text-xs text-white/70">
              Set <code className="rounded bg-white/10 px-1 py-0.5 font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in <code className="rounded bg-white/10 px-1 py-0.5 font-mono">.env.local</code> to load the real map.
            </p>
          </div>
        </div>
      </div>
    </MapContext.Provider>
  );
}
