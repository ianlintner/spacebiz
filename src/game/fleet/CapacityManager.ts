import {
  CAPACITY_COST_BY_SCOPE,
  ROUTE_BASE_OPERATING_RATE,
  HULL_EFFICIENCY_MULT,
} from "../../data/constants.ts";
import type { RouteScope } from "../../data/types.ts";

/** Capacity units consumed by a route of the given scope. */
export function getCapacityCostForScope(scope: RouteScope): number {
  return CAPACITY_COST_BY_SCOPE[scope] ?? 1;
}

/**
 * Utilization ratio: used / total. Values > 1.0 indicate overcapacity.
 * Returns 0 if totalCapacity is 0 to avoid division by zero.
 */
export function computeUtilization(used: number, total: number): number {
  if (total <= 0) return 0;
  return used / total;
}

/**
 * Compute revenue and cost multipliers from the overcapacity curve.
 *
 * u = utilization (1.0 = 100%)
 * overcrowdingFactor = max(0, u - 1.0)
 * revenueMultiplier  = 1 - (overcrowdingFactor² × 0.80)  [quadratic, gentle]
 * costMultiplier     = 1 + (overcrowdingFactor³ × 2.00)  [cubic, catastrophic]
 */
export function computeOvercapacityFactors(utilization: number): {
  revenueMultiplier: number;
  costMultiplier: number;
} {
  const f = Math.max(0, utilization - 1.0);
  const revenueMultiplier = Math.max(0, 1 - f * f * 0.8);
  const costMultiplier = 1 + f * f * f * 2.0;
  return { revenueMultiplier, costMultiplier };
}

/**
 * Per-turn operating cost for a route.
 * = BASE_RATE × scopeCost × hullEfficiencyMultiplier
 */
export function computeRouteOperatingCost(
  scope: RouteScope,
  hullMark: 1 | 2 | 3 | 4 | 5,
): number {
  const scopeCost = CAPACITY_COST_BY_SCOPE[scope] ?? 1;
  const efficiencyMult = HULL_EFFICIENCY_MULT[hullMark];
  return ROUTE_BASE_OPERATING_RATE * scopeCost * efficiencyMult;
}
