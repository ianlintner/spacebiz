import type {
  Planet,
  StarSystem,
  ActiveRoute,
  Ship,
  MarketState,
  CargoType,
} from "../../data/types.ts";
import { TURN_DURATION } from "../../data/constants.ts";

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
              assignedShipIds: r.assignedShipIds.filter(
                (id) => id !== shipId,
              ),
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
