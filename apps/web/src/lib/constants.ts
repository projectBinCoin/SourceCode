import type { BinSize, Settings, Tier, WastageType } from "@/types";

export const WASTAGE_TYPES: WastageType[] = [
  "Plastic",
  "Paper",
  "Glass",
  "Metal",
  "Food Waste",
  "Iron",
  "Cardboard",
  "Electronic",
];

export const BIN_SIZES: BinSize[] = [20, 100, 240];

const TIER_THRESHOLDS: { tier: Tier; min: number }[] = [
  { tier: "Platinum", min: 3000 },
  { tier: "Gold", min: 1500 },
  { tier: "Silver", min: 500 },
  { tier: "Bronze", min: 0 },
];

export const WASTAGE_META: Record<
  WastageType,
  { icon: string; color: string; defaultMultiplier: number }
> = {
  Plastic: { icon: "♻️", color: "text-blue-500", defaultMultiplier: 1.0 },
  Paper: { icon: "📄", color: "text-amber-600", defaultMultiplier: 0.8 },
  Glass: { icon: "🍾", color: "text-green-600", defaultMultiplier: 1.2 },
  Metal: { icon: "🔩", color: "text-slate-500", defaultMultiplier: 1.5 },
  "Food Waste": { icon: "🍎", color: "text-emerald-600", defaultMultiplier: 0.5 },
  Iron: { icon: "⚙️", color: "text-zinc-600", defaultMultiplier: 1.8 },
  Cardboard: { icon: "📦", color: "text-orange-600", defaultMultiplier: 0.9 },
  Electronic: { icon: "🔌", color: "text-purple-600", defaultMultiplier: 2.5 },
};

export function getFillColor(pct: number): string {
  if (pct >= 80) return "#ef4444";
  if (pct >= 50) return "#eab308";
  return "#22c55e";
}

export function getFillLevel(pct: number): string {
  if (pct >= 80) return "Critical";
  if (pct >= 50) return "High";
  if (pct >= 20) return "Medium";
  return "Low";
}

export function getTierFromPoints(points: number): Tier {
  for (const { tier, min } of TIER_THRESHOLDS) {
    if (points >= min) return tier;
  }
  return "Bronze";
}

export const MAP_CENTER = { lat: 6.9271, lng: 79.8612 }; // Colombo
export const MAP_DEFAULT_ZOOM = 13;
export const COLLECTOR_RADIUS_KM = 5;

/** Google Maps styling — follows the app theme (light / dark). */
export const LIGHT_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
];

export const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0b1d3a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#050a10" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8fa8c7" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1e3a5f" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0a2f1e" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#2e7d4f" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#12294a" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1e3a5f" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6e8bb5" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1a3d6e" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#2a5290" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#12294a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#04101f" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d5a80" }] },
];

export const TIME_SLOTS = [
  "06:00 - 08:00",
  "08:00 - 10:00",
  "10:00 - 12:00",
  "14:00 - 16:00",
  "16:00 - 18:00",
];

export const MIN_FILL_FOR_PICKUP = 20;
export const HIGH_FILL_THRESHOLD = 80;

export const DEFAULT_SETTINGS: Settings = {
  basePointCaps: { 20: 50, 100: 120, 240: 200 },
  multipliers: {
    Plastic: 1.0,
    Glass: 1.2,
    Metal: 1.5,
    Paper: 0.8,
    "Food Waste": 0.5,
    Iron: 1.8,
    Cardboard: 0.9,
    Electronic: 2.5,
  },
};
