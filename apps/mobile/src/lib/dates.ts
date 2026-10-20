import { format } from "date-fns";

/** format() that never throws — returns "—" for missing/invalid values. */
export function fmtDate(value: unknown, pattern = "MMM d, yyyy"): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value as string | number);
  return isNaN(d.getTime()) ? "—" : format(d, pattern);
}

/** Live bin fill for display — the device reports -1 when the sensor
 *  returns no echo, so render a fault instead of a fake percentage. */
export function fmtFillPct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "—";
  if (pct < 0) return "Fault";
  return `${Math.round(pct)}%`;
}
