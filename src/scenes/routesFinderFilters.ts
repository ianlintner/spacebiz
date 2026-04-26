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

export type RouteScopeBand =
  | "local"
  | "interstellar"
  | "interEmpire"
  | null;

/**
 * Scope-band predicate for the Route Finder.
 *
 * - `null`        → matches all routes
 * - `local`       → both planets share a star system
 * - `interstellar`→ different systems but the same (resolved) empire owns both
 * - `interEmpire` → different systems AND both empires resolved AND distinct
 *
 * "interEmpire" requires both empire ids to be present so a route to or from
 * an unaligned/unresolved planet is not mis-counted as cross-empire trade
 * (which would inflate the bucket and confuse the empty-state copy). Such
 * routes still match `interstellar` if the systems differ.
 */
export function matchesScopeBand(
  originSystemId: string,
  destSystemId: string,
  originEmpireId: string | null,
  destEmpireId: string | null,
  scope: RouteScopeBand,
): boolean {
  if (scope === null) return true;
  const isLocal = originSystemId === destSystemId;
  if (scope === "local") return isLocal;
  if (isLocal) return false;
  const bothEmpiresResolved =
    originEmpireId !== null && destEmpireId !== null;
  const isInterEmpire =
    bothEmpiresResolved && originEmpireId !== destEmpireId;
  if (scope === "interEmpire") return isInterEmpire;
  // "interstellar" → cross-system but not cross-empire
  return !isInterEmpire;
}
