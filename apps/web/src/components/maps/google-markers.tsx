"use client";

import { useMapContext } from "./svg-fallback-map";
import { getFillColor } from "@/lib/constants";

interface GBinMarkerProps {
  lat: number;
  lng: number;
  fillPct: number;
  label?: string;
  onClick?: () => void;
}

export function GoogleBinMarker({ fillPct, label, onClick }: GBinMarkerProps) {
  const color = getFillColor(fillPct);
  return (
    <div
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
      className="flex flex-col items-center"
    >
      <svg width={28} height={28} viewBox="0 0 28 28">
        <path d="M14 2 L4 20 L24 20 Z" fill={color} stroke="white" strokeWidth={2} />
        <circle cx={14} cy={14} r={3} fill="white" />
      </svg>
      {label && (
        <span className="mt-0.5 max-w-[80px] truncate rounded bg-white/90 px-1 text-[10px] font-medium text-[#003B73] shadow-sm">
          {label}
        </span>
      )}
    </div>
  );
}

export function GoogleJobMarker({ label, onClick }: Omit<GBinMarkerProps, "fillPct"> & { fillPct?: number }) {
  return (
    <div
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
      className="flex flex-col items-center"
    >
      <svg width={28} height={28} viewBox="0 0 28 28">
        <path d="M14 2 L4 20 L24 20 Z" fill="#f97316" stroke="white" strokeWidth={2} />
        <text x={14} y={17} textAnchor="middle" fontSize={10} fill="white">🗑</text>
      </svg>
      {label && (
        <span className="mt-0.5 max-w-[80px] truncate rounded bg-white/90 px-1 text-[10px] font-medium text-[#003B73] shadow-sm">
          {label}
        </span>
      )}
    </div>
  );
}

// Re-export useMapContext for convenience
export { useMapContext };
