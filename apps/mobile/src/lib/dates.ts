import { format } from "date-fns";

/** format() that never throws — returns "—" for missing/invalid values. */
export function fmtDate(value: unknown, pattern = "MMM d, yyyy"): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value as string | number);
  return isNaN(d.getTime()) ? "—" : format(d, pattern);
}
