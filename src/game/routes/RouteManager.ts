import type {
  Planet,
  StarSystem,
  ActiveRoute,
  Ship,
  MarketState,
  CargoType,
  CargoMarketEntry,
} from "../../data/types.ts";
import { CargoType as CargoTypeEnum } from "../../data/types.ts";
import {
  TURN_DURATION,
  SHIP_TEMPLATES,
  BASE_LICENSE_FEE,
  LICENSE_FEE_DISTANCE_DIVISOR,
  LICENSE_FEE_ROUTE_ESCALATION,
} from "../../data/constants.ts";
import type { ShipClass } from "../../data/types.ts";

/**
 * Calculate distance between two planets.
 * If planets are in the same system, use planet positions (short distance).
 * If in different systems, use system positions (long distance).
 */
export function calculateDistance(
  planet1: Planet,
  planet2: Planet,
  systems: StarSystem[],
): number {
  if (planet1.systemId === planet2.systemId) {
    // Same system: use planet positions
    const dx = planet1.x - planet2.x;
    const dy = planet1.y - planet2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Different systems: use system positions
  const system1 = systems.find((s) => s.id === planet1.systemId);
  const system2 = systems.find((s) => s.id === planet2.systemId);

  if (!system1 || !system2) {
    throw new Error(
      `System not found: ${!system1 ? planet1.systemId : planet2.systemId}`,
    );
  }

  const dx = system1.x - system2.x;
  const dy = system1.y - system2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * How many round trips a ship can make in one turn.
 * = floor(TURN_DURATION / (distance * 2 / speed)), min 1
 */
export function calculateTripsPerTurn(
  distance: number,
  shipSpeed: number,
): number {
  const roundTripTime = (distance * 2) / shipSpeed;
  if (roundTripTime <= 0) return 1;
  return Math.max(1, Math.floor(TURN_DURATION / roundTripTime));
}

/**
 * Calculate the one-time license fee to open a new route.
 * Scales with distance and escalates with each additional route.
 *
 * Fee = BASE_LICENSE_FEE × max(1, distance / 100) × (1 + existingRoutes × 0.25)
 */
export function calculateLicenseFee(
  distance: number,
  existingRouteCount: number,
): number {
  const distMult = Math.max(1.0, distance / LICENSE_FEE_DISTANCE_DIVISOR);
  const routeMult = 1.0 + existingRouteCount * LICENSE_FEE_ROUTE_ESCALATION;
  return Math.round(BASE_LICENSE_FEE * distMult * routeMult);
}

/**
 * Create a new route.
 */
export function createRoute(
  originId: string,
  destId: string,
  distance: number,
  cargoType: CargoType | null,
): ActiveRoute {
  return {
    id: `route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    originPlanetId: originId,
    destinationPlanetId: destId,
    distance,
    assignedShipIds: [],
    cargoType,
  };
}

/**
 * Assign a ship to a route. Updates both fleet (ship.assignedRouteId) and
 * routes (route.assignedShipIds).
 */
export function assignShipToRoute(
  shipId: string,
  routeId: string,
  fleet: Ship[],
  routes: ActiveRoute[],
): { fleet: Ship[]; routes: ActiveRoute[] } {
  const updatedFleet = fleet.map((s) =>
    s.id === shipId ? { ...s, assignedRouteId: routeId } : s,
  );

  const updatedRoutes = routes.map((r) =>
    r.id === routeId
      ? { ...r, assignedShipIds: [...r.assignedShipIds, shipId] }
      : r,
  );

  return { fleet: updatedFleet, routes: updatedRoutes };
}

/**
 * Unassign a ship from its current route.
 */
export function unassignShip(
  shipId: string,
  fleet: Ship[],
  routes: ActiveRoute[],
): { fleet: Ship[]; routes: ActiveRoute[] } {
  const ship = fleet.find((s) => s.id === shipId);
  const currentRouteId = ship?.assignedRouteId;

  const updatedFleet = fleet.map((s) =>
    s.id === shipId ? { ...s, assignedRouteId: null } : s,
  );

  const updatedRoutes = currentRouteId
    ? routes.map((r) =>
        r.id === currentRouteId
          ? {
              ...r,
              assignedShipIds: r.assignedShipIds.filter((id) => id !== shipId),
            }
          : r,
      )
    : routes;

  return { fleet: updatedFleet, routes: updatedRoutes };
}

/**
 * Delete a route. Also unassigns all ships from it.
 */
export function deleteRoute(
  routeId: string,
  fleet: Ship[],
  routes: ActiveRoute[],
): { fleet: Ship[]; routes: ActiveRoute[] } {
  const route = routes.find((r) => r.id === routeId);
  const shipIdsToUnassign = new Set(route?.assignedShipIds ?? []);

  const updatedFleet = fleet.map((s) =>
    shipIdsToUnassign.has(s.id) ? { ...s, assignedRouteId: null } : s,
  );

  const updatedRoutes = routes.filter((r) => r.id !== routeId);

  return { fleet: updatedFleet, routes: updatedRoutes };
}

/**
 * Estimate revenue for a route+ship for one turn.
 * Revenue = trips * capacity * destinationPrice
 * For passengers: uses passengerCapacity and Passengers price at destination
 * For cargo: uses cargoCapacity and cargo price at destination
 */
export function estimateRouteRevenue(
  route: ActiveRoute,
  ship: Ship,
  market: MarketState,
): number {
  if (!route.cargoType) return 0;

  const destMarket = market.planetMarkets[route.destinationPlanetId];
  if (!destMarket) return 0;

  const destEntry = destMarket[route.cargoType];
  const price = destEntry.currentPrice;

  const trips = calculateTripsPerTurn(route.distance, ship.speed);

  // Use passenger capacity for passengers, cargo capacity for everything else
  const capacity =
    route.cargoType === "passengers"
      ? ship.passengerCapacity
      : ship.cargoCapacity;

  return Math.round(trips * capacity * price * 100) / 100;
}

/**
 * Estimate fuel cost for a route+ship for one turn.
 * Fuel cost = trips * distance * 2 * fuelEfficiency * fuelPrice
 */
export function estimateRouteFuelCost(
  route: ActiveRoute,
  ship: Ship,
  fuelPrice: number,
): number {
  const trips = calculateTripsPerTurn(route.distance, ship.speed);
  const totalDistance = trips * route.distance * 2;
  const fuelCost = totalDistance * ship.fuelEfficiency * fuelPrice;
  return Math.round(fuelCost * 100) / 100;
}

// ── Route Opportunity Scanner ──────────────────────────────────────────

export interface RouteOpportunity {
  originPlanetId: string;
  originName: string;
  destinationPlanetId: string;
  destinationName: string;
  distance: number;
  bestCargoType: CargoType;
  destPrice: number;
  destTrend: CargoMarketEntry["trend"];
  estRevenue: number;
  estFuelCost: number;
  estProfit: number;
  tripsPerTurn: number;
  shipName: string;
  shipClass: string;
  shipSource: "owned" | "autoBuy" | "none";
  shipCost: number;
  licenseFee: number;
  alreadyActive: boolean;
}

/**
 * Scan all origin→destination pairs and rank by estimated profit.
 * For each pair, shows ALL profitable cargo types so players can discover
 * passenger routes, food runs, etc. alongside high-value luxury hauls.
 */
export function scanAllRouteOpportunities(
  planets: Planet[],
  systems: StarSystem[],
  fleet: Ship[],
  market: MarketState,
  activeRoutes: ActiveRoute[],
  cash: number,
): RouteOpportunity[] {
  const cargoTypes = Object.values(CargoTypeEnum) as CargoType[];
  const availableShips = fleet.filter((s) => !s.assignedRouteId);

  // Pre-build set of active route keys for quick lookup
  const activeRouteKeys = new Set(
    activeRoutes.map((r) => `${r.originPlanetId}→${r.destinationPlanetId}`),
  );

  const opportunities: RouteOpportunity[] = [];

  for (const origin of planets) {
    for (const dest of planets) {
      if (origin.id === dest.id) continue;

      const distance = calculateDistance(origin, dest, systems);
      if (distance < 1) continue; // skip trivially close planets
      const destMarket = market.planetMarkets[dest.id];
      if (!destMarket) continue;

      const alreadyActive = activeRouteKeys.has(`${origin.id}→${dest.id}`);
      const licenseFee = calculateLicenseFee(distance, activeRoutes.length);

      // Emit an entry for EACH profitable cargo type on this pair
      for (const cargoType of cargoTypes) {
        const destEntry = destMarket[cargoType];
        const price = destEntry.currentPrice;
        const isPassenger = cargoType === "passengers";

        // Try owned ships first
        const ship = pickBestShipForCargo(availableShips, cargoType);
        // Fall back to cheapest purchasable
        const buyOption = getCheapestBuyOption(cargoType, cash);

        const candidate = ship ?? buyOption;
        if (!candidate) continue;

        const capacity = isPassenger
          ? candidate.passengerCapacity
          : candidate.cargoCapacity;
        if (capacity <= 0) continue;

        const trips = calculateTripsPerTurn(distance, candidate.speed);
        const revenue = Math.round(trips * capacity * price * 100) / 100;
        const totalDist = trips * distance * 2;
        const fuelCost =
          Math.round(
            totalDist * candidate.fuelEfficiency * market.fuelPrice * 100,
          ) / 100;
        const profit = revenue - fuelCost;

        // Only include profitable or near-break-even options
        if (profit <= 0) continue;

        opportunities.push({
          originPlanetId: origin.id,
          originName: origin.name,
          destinationPlanetId: dest.id,
          destinationName: dest.name,
          distance,
          bestCargoType: cargoType,
          destPrice: price,
          destTrend: destEntry.trend,
          estRevenue: revenue,
          estFuelCost: fuelCost,
          estProfit: profit,
          tripsPerTurn: trips,
          shipName: candidate.name,
          shipClass: candidate.class,
          shipSource: ship ? "owned" : "autoBuy",
          shipCost: ship ? 0 : (candidate.purchaseCost ?? 0),
          licenseFee,
          alreadyActive,
        });
      }
    }
  }

  // Sort by profit descending and limit to top 200 for performance
  opportunities.sort((a, b) => b.estProfit - a.estProfit);
  if (opportunities.length > 200) {
    opportunities.length = 200;
  }
  return opportunities;
}

function pickBestShipForCargo(
  ships: Ship[],
  cargoType: CargoType,
): Ship | null {
  const isPassenger = cargoType === "passengers";
  const compatible = ships.filter((s) =>
    isPassenger ? s.passengerCapacity > 0 : s.cargoCapacity > 0,
  );
  if (compatible.length === 0) return null;

  compatible.sort((a, b) =>
    isPassenger
      ? b.passengerCapacity - a.passengerCapacity
      : b.cargoCapacity - a.cargoCapacity,
  );
  return compatible[0];
}

interface BuyCandidate {
  name: string;
  class: string;
  cargoCapacity: number;
  passengerCapacity: number;
  speed: number;
  fuelEfficiency: number;
  purchaseCost: number;
}

function getCheapestBuyOption(
  cargoType: CargoType,
  cash: number,
): BuyCandidate | null {
  const isPassenger = cargoType === "passengers";
  const shipClasses = Object.keys(SHIP_TEMPLATES) as ShipClass[];
  const candidates = shipClasses
    .map((sc) => SHIP_TEMPLATES[sc])
    .filter((t) =>
      isPassenger ? t.passengerCapacity > 0 : t.cargoCapacity > 0,
    )
    .filter((t) => t.purchaseCost <= cash)
    .sort((a, b) => a.purchaseCost - b.purchaseCost);

  if (candidates.length === 0) return null;
  const t = candidates[0];
  return {
    name: t.name,
    class: t.class,
    cargoCapacity: t.cargoCapacity,
    passengerCapacity: t.passengerCapacity,
    speed: t.speed,
    fuelEfficiency: t.fuelEfficiency,
    purchaseCost: t.purchaseCost,
  };
}
