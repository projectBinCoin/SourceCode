/**
 * Format a number as LKR currency.
 * Example: formatLKR(2500) => "LKR 2,500.00"
 */
export function formatLKR(amount: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format points with "pts" suffix.
 * Example: formatPoints(1250) => "1,250 pts"
 */
export function formatPoints(points: number): string {
  return `${points.toLocaleString()} pts`;
}

/**
 * Default LKR-to-points conversion rate (1 point = LKR 2).
 * This can be overridden in admin settings later.
 */
export const LKR_PER_POINT = 2;

/**
 * Convert points to LKR equivalent.
 */
export function pointsToLKR(points: number, ratePerPoint = LKR_PER_POINT): number {
  return points * ratePerPoint;
}
