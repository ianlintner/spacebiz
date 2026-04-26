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

/**
 * Scope-band filter value for the Route Finder. Aligns with the canonical
 * `RouteScope` from data/types — "system" / "empire" / "galactic" — plus
 * `null` for "all scopes". Renamed from the legacy local/interstellar/
 * interEmpire trio so HUD ("Sys/Emp/Gal") and filter buttons share one
 * vocabulary.
 */
export type RouteScopeBand = "system" | "empire" | "galactic" | null;

/**
 * Scope-band predicate for the Route Finder.
 *
 * - `null`     → matches all routes
 * - `system`   → both planets share a star system
 * - `empire`   → different systems, same empire (intra-empire interstellar)
 * - `galactic` → different systems AND both empires resolved AND distinct
 *
 * "galactic" requires both empire ids to be present so a route to or from
 * an unaligned/unresolved planet is not mis-counted as cross-empire trade
 * (which would inflate the bucket and confuse the empty-state copy). Such
 * routes still match `empire` if the systems differ.
 */
export function matchesScopeBand(
  originSystemId: string,
  destSystemId: string,
  originEmpireId: string | null,
  destEmpireId: string | null,
  scope: RouteScopeBand,
): boolean {
  if (scope === null) return true;
  const isSystem = originSystemId === destSystemId;
  if (scope === "system") return isSystem;
  if (isSystem) return false;
  const bothEmpiresResolved = originEmpireId !== null && destEmpireId !== null;
  const isGalactic = bothEmpiresResolved && originEmpireId !== destEmpireId;
  if (scope === "galactic") return isGalactic;
  // "empire" → cross-system but not cross-empire
  return !isGalactic;
}
