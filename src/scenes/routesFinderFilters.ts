export type DistanceBand = "short" | "medium" | "long" | null;

/**
 * Distance-band predicate for the Route Finder filter row.
 *
 * Bucket boundaries are intentionally inclusive on the upper edge of "medium"
 * (50–150) so a route with distance exactly 150 stays in the medium band, not
 * promoted to long. Routes at distance 50 belong to medium, not short.
 */
export function isInDistanceBand(
  distance: number,
  band: DistanceBand,
): boolean {
  switch (band) {
    case "short":
      return distance < 50;
    case "medium":
      return distance >= 50 && distance <= 150;
    case "long":
      return distance > 150;
    default:
      return true;
  }
}
