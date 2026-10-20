import type { BinSize, PointCalcResult, Settings, WastageType } from "@/types";

export function calcPoints(opts: {
  binSizeL: BinSize;
  fillPct: number;
  wastageType: WastageType;
  settings: Settings;
  override?: "mismatch" | "invalid";
  actualWastageType?: WastageType;
}): PointCalcResult {
  const { binSizeL, fillPct, wastageType, settings, override, actualWastageType } = opts;

  const base = settings.basePointCaps[binSizeL];

  if (override === "invalid") {
    return { points: 0, capped: false, raw: 0 };
  }

  const effectiveType = override === "mismatch" && actualWastageType ? actualWastageType : wastageType;
  const multiplier = settings.multipliers[effectiveType];

  const raw = base * (fillPct / 100) * multiplier;
  const points = Math.min(raw, base);
  const capped = raw > base;

  return {
    points: Math.round(points * 100) / 100,
    capped,
    raw: Math.round(raw * 100) / 100,
  };
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function generateId(prefix: string = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
