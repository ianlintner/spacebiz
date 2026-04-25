import type {
  Planet,
  StarSystem,
  ActiveRoute,
  Ship,
  MarketState,
  CargoType,
  CargoMarketEntry,
  GameState,
  InterEmpireCargoLock,
  Hyperlane,
  BorderPort,
} from "../../data/types.ts";
import { CargoType as CargoTypeEnum } from "../../data/types.ts";
import {
  TURN_DURATION,
  MAX_TRIPS_PER_TURN,
  SHIP_TEMPLATES,
  BASE_LICENSE_FEE,
  LICENSE_FEE_DISTANCE_DIVISOR,
  LICENSE_FEE_ROUTE_ESCALATION,
  INTRA_SYSTEM_REVENUE_MULTIPLIER,
  DISTANCE_PREMIUM_RATE,
  DISTANCE_PREMIUM_CAP,
} from "../../data/constants.ts";
import { calculatePrice } from "../economy/PriceCalculator.ts";
import { getLicenseFeeMultiplier } from "../reputation/ReputationEffects.ts";
import type { ShipClass } from "../../data/types.ts";
import { getTechRouteSlotBonus } from "../tech/TechEffects.ts";
import { getRouteSlotBonus } from "../hub/HubBonusCalculator.ts";
import {
  isEmpireAccessible,
  getEmpireForPlanet,
  checkTradePolicyViolation,
  checkCargoLockViolation,
} from "../empire/EmpireAccessManager.ts";
import {
  calculateHyperlaneDistance,
  findPath,
  getReachableSystems,
} from "./HyperlaneRouter.ts";

/**
 * Calculate distance between two planets.
 * If planets are in the same system, use planet positions (short distance).
 * If hyperlanes are provided, use path-based distance through the hyperlane graph.
 * Otherwise, fall back to Euclidean system positions (legacy behavior).
 * Returns -1 if hyperlanes are provided but no path exists.
 */
export function calculateDistance(
  planet1: Planet,
  planet2: Planet,
  systems: StarSystem[],
  hyperlanes?: Hyperlane[],
  borderPorts?: BorderPort[],
): number {
  if (planet1.systemId === planet2.systemId) {
    // Same system: use planet positions
    const dx = planet1.x - planet2.x;
    const dy = planet1.y - planet2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Use hyperlane routing if available
  if (hyperlanes && hyperlanes.length > 0) {
    return calculateHyperlaneDistance(
      planet1,
      planet2,
      systems,
      hyperlanes,
      borderPorts ?? [],
    );
  }

  // Legacy fallback: Euclidean distance between systems
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
 * = floor(TURN_DURATION / (distance * 2 / speed)), min 1, capped at MAX_TRIPS_PER_TURN.
 */
export function calculateTripsPerTurn(
  distance: number,
  shipSpeed: number,
): number {
  const roundTripTime = (distance * 2) / shipSpeed;
  if (roundTripTime <= 0) return 1;
  return Math.min(
    MAX_TRIPS_PER_TURN,
    Math.max(1, Math.floor(TURN_DURATION / roundTripTime)),
  );
}

/**
 * Calculate the one-time license fee to open a new route.
 * Scales with distance and escalates with each additional route.
 * Optionally applies a reputation-based multiplier.
 *
 * Fee = BASE_LICENSE_FEE × max(1, distance / 100) × (1 + existingRoutes × 0.25) × reputationMultiplier
 */
export function calculateLicenseFee(
  distance: number,
  existingRouteCount: number,
  reputation?: number,
): number {
  const distMult = Math.max(1.0, distance / LICENSE_FEE_DISTANCE_DIVISOR);
  const routeMult = 1.0 + existingRouteCount * LICENSE_FEE_ROUTE_ESCALATION;
  const repMult = reputation !== undefined ? getLicenseFeeMultiplier(reputation) : 1.0;
  return Math.round(BASE_LICENSE_FEE * distMult * routeMult * repMult);
}

// ── Local Route Helpers ────────────────────────────────────────────────

/**
 * Returns true when origin and destination are in the same star system.
 * These routes use the separate localRouteSlots pool.
 */
export function isLocalRoute(
  route: { originPlanetId: string; destinationPlanetId: string },
  state: Pick<GameState, 'galaxy'>,
): boolean {
  const planets = state.galaxy.planets;
  const originPlanet = planets.find((p) => p.id === route.originPlanetId);
  const destPlanet = planets.find((p) => p.id === route.destinationPlanetId);
  if (!originPlanet || !destPlanet) return false;
  return originPlanet.systemId === destPlanet.systemId;
}

// ── Route Slot Helpers ─────────────────────────────────────────────────

/**
 * Total main route slots available (base + tech bonus).
 */
export function getAvailableRouteSlots(state: GameState): number {
  return (
    state.routeSlots +
    getTechRouteSlotBonus(state) +
    getRouteSlotBonus(state.stationHub)
  );
}

/**
 * Total local route slots available.
 */
export function getAvailableLocalRouteSlots(state: GameState): number {
  return state.localRouteSlots ?? 2;
}

/**
 * Number of main route slots currently in use (excludes local routes).
 */
export function getUsedRouteSlots(state: GameState): number {
  return state.activeRoutes.filter((r) => !isLocalRoute(r, state)).length;
}

/**
 * Number of local route slots currently in use.
 */
export function getUsedLocalRouteSlots(state: GameState): number {
  return state.activeRoutes.filter((r) => isLocalRoute(r, state)).length;
}

/**
 * Number of free main route slots remaining.
 */
export function getFreeRouteSlots(state: GameState): number {
  return Math.max(0, getAvailableRouteSlots(state) - getUsedRouteSlots(state));
}

/**
 * Number of free local route slots remaining.
 */
export function getFreeLocalRouteSlots(state: GameState): number {
  return Math.max(0, getAvailableLocalRouteSlots(state) - getUsedLocalRouteSlots(state));
}

export interface RouteTrafficVisual {
  ownerId: string;
  routeId: string;
  pathSystemIds: string[];
  assignedShips: Ship[];
  visibleUnits: number;
  visualClassMix: ShipClass[];
}

export interface RouteTrafficWaypoint {
  x: number;
  y: number;
}

export interface LocalRouteMotionPoint extends RouteTrafficWaypoint {
  t: number;
}

interface RouteTrafficSource {
  ownerId: string;
  routes: ActiveRoute[];
  fleet: Ship[];
}

export function getVisibleRouteTrafficUnits(assignedShipCount: number): number {
  if (assignedShipCount <= 0) return 0;
  if (assignedShipCount === 1) return 1;
  if (assignedShipCount <= 3) return 2;
  if (assignedShipCount <= 6) return 3;
  return 4;
}

function hashRouteId(routeId: string): number {
  let hash = 0;
  for (let i = 0; i < routeId.length; i++) {
    hash = (hash * 31 + routeId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function buildTrafficPatrolWaypoints(
  routeId: string,
  waypoints: RouteTrafficWaypoint[],
): RouteTrafficWaypoint[] {
  if (waypoints.length < 2) {
    return waypoints;
  }

  const uniqueWaypointCount = new Set(
    waypoints.map((waypoint) => `${waypoint.x},${waypoint.y}`),
  ).size;
  if (uniqueWaypointCount >= 2) {
    return waypoints;
  }

  const center = waypoints[0];
  const radius = 18;
  const baseAngle = (hashRouteId(routeId) % 360) * (Math.PI / 180);
  const offsets = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

  return offsets.map((offset) => ({
    x: center.x + Math.cos(baseAngle + offset) * radius,
    y: center.y + Math.sin(baseAngle + offset) * radius,
  }));
}

export function buildSunAvoidingLocalRouteMotionPath(
  routeId: string,
  origin: RouteTrafficWaypoint,
  destination: RouteTrafficWaypoint,
  sun: RouteTrafficWaypoint,
): LocalRouteMotionPoint[] {
  const directDx = destination.x - origin.x;
  const directDy = destination.y - origin.y;
  const directDistance = Math.hypot(directDx, directDy);

  if (directDistance < 1) {
    return [
      { x: origin.x, y: origin.y, t: 0 },
      { x: destination.x, y: destination.y, t: 1 },
    ];
  }

  const sunToOriginX = origin.x - sun.x;
  const sunToOriginY = origin.y - sun.y;
  const sunToDestinationX = destination.x - sun.x;
  const sunToDestinationY = destination.y - sun.y;
  const originRadius = Math.hypot(sunToOriginX, sunToOriginY);
  const destinationRadius = Math.hypot(sunToDestinationX, sunToDestinationY);
  const avoidanceRadius = Math.max(originRadius, destinationRadius, directDistance * 0.8);

  const originAngle = Math.atan2(sunToOriginY, sunToOriginX);
  let angleDelta = Math.atan2(
    Math.sin(Math.atan2(sunToDestinationY, sunToDestinationX) - originAngle),
    Math.cos(Math.atan2(sunToDestinationY, sunToDestinationX) - originAngle),
  );

  if (Math.abs(angleDelta) < Math.PI / 10) {
    angleDelta = (hashRouteId(routeId) % 2 === 0 ? 1 : -1) * Math.PI * 0.6;
  }

  const pointCount = 6;
  const path: LocalRouteMotionPoint[] = [];
  for (let index = 0; index < pointCount; index++) {
    const t = index / (pointCount - 1);
    const angle = originAngle + angleDelta * t;
    const radius = originRadius + (destinationRadius - originRadius) * t;
    const outwardBias = Math.sin(Math.PI * t) * Math.max(28, directDistance * 0.22);
    const arcRadius = Math.max(radius, avoidanceRadius) + outwardBias;
    const arcX = sun.x + Math.cos(angle) * arcRadius;
    const arcY = sun.y + Math.sin(angle) * arcRadius;
    const lineX = origin.x + directDx * t;
    const lineY = origin.y + directDy * t;
    const blend = index === 0 || index === pointCount - 1 ? 1 : 0.78;

    path.push({
      x: arcX + (lineX - arcX) * blend,
      y: arcY + (lineY - arcY) * blend,
      t,
    });
  }

  path[0] = { x: origin.x, y: origin.y, t: 0 };
  path[path.length - 1] = { x: destination.x, y: destination.y, t: 1 };
  return path;
}

export function buildRouteTrafficVisuals(
  routes: ActiveRoute[],
  fleet: Ship[],
  planets: Planet[],
  hyperlanes: Hyperlane[],
  borderPorts: BorderPort[],
): RouteTrafficVisual[] {
  return buildRouteTrafficVisualsFromSources(
    [{ ownerId: "player", routes, fleet }],
    planets,
    hyperlanes,
    borderPorts,
  );
}

function buildRouteTrafficVisualsFromSources(
  sources: RouteTrafficSource[],
  planets: Planet[],
  hyperlanes: Hyperlane[],
  borderPorts: BorderPort[],
): RouteTrafficVisual[] {
  const planetSystemById = new Map(
    planets.map((planet) => [planet.id, planet.systemId]),
  );

  return sources.flatMap(({ ownerId, routes, fleet }) => {
    const fleetById = new Map(fleet.map((ship) => [ship.id, ship]));

    return routes.flatMap((route) => {
      if (route.assignedShipIds.length === 0) {
        return [];
      }

      const assignedShips = route.assignedShipIds.flatMap((shipId) => {
        const ship = fleetById.get(shipId);
        return ship ? [ship] : [];
      });

      if (assignedShips.length === 0) {
        return [];
      }

      const originSystemId = planetSystemById.get(route.originPlanetId);
      const destinationSystemId = planetSystemById.get(route.destinationPlanetId);
      if (!originSystemId || !destinationSystemId) {
        return [];
      }

      const path = findPath(
        originSystemId,
        destinationSystemId,
        hyperlanes,
        borderPorts,
      );
      if (originSystemId === destinationSystemId) {
        return [];
      }
      const pathSystemIds =
        path && path.systems.length >= 2
          ? path.systems
          : [originSystemId, destinationSystemId];

      if (pathSystemIds.length < 2) {
        return [];
      }

      return [
        {
          ownerId,
          routeId: route.id,
          pathSystemIds,
          assignedShips,
          visibleUnits: getVisibleRouteTrafficUnits(assignedShips.length),
          visualClassMix: assignedShips.map((ship) => ship.class),
        },
      ];
    });
  });
}

export function buildGalaxyRouteTrafficVisuals(
  state: Pick<
    GameState,
    "activeRoutes" | "fleet" | "aiCompanies" | "galaxy" | "hyperlanes" | "borderPorts"
  >,
): RouteTrafficVisual[] {
  const sources: RouteTrafficSource[] = [
    {
      ownerId: "player",
      routes: state.activeRoutes,
      fleet: state.fleet,
    },
    ...state.aiCompanies.map((company) => ({
      ownerId: company.id,
      routes: company.activeRoutes,
      fleet: company.fleet,
    })),
  ];

  return buildRouteTrafficVisualsFromSources(
    sources,
    state.galaxy.planets,
    state.hyperlanes ?? [],
    state.borderPorts ?? [],
  );
}

export function buildRouteTrafficStateKey(
  routes: ActiveRoute[],
  fleet: Ship[],
  planets: Planet[],
  hyperlanes: Hyperlane[],
  borderPorts: BorderPort[],
): string {
  const visuals = buildRouteTrafficVisuals(
    routes,
    fleet,
    planets,
    hyperlanes,
    borderPorts,
  );

  return JSON.stringify(
    visuals.map((visual) => ({
      ownerId: visual.ownerId,
      routeId: visual.routeId,
      pathSystemIds: visual.pathSystemIds,
      assignedShipIds: visual.assignedShips.map((ship) => ship.id),
      visibleUnits: visual.visibleUnits,
      visualClassMix: visual.visualClassMix,
    })),
  );
}

export function buildGalaxyRouteTrafficStateKey(
  state: Pick<
    GameState,
    "activeRoutes" | "fleet" | "aiCompanies" | "galaxy" | "hyperlanes" | "borderPorts"
  >,
): string {
  const visuals = buildGalaxyRouteTrafficVisuals(state);

  return JSON.stringify(
    visuals.map((visual) => ({
      ownerId: visual.ownerId,
      routeId: visual.routeId,
      pathSystemIds: visual.pathSystemIds,
      assignedShipIds: visual.assignedShips.map((ship) => ship.id),
      visibleUnits: visual.visibleUnits,
      visualClassMix: visual.visualClassMix,
    })),
  );
}

// ── Inter-Empire Cargo Lock Tracking ──────────────────────────────────

/**
 * Add a cargo lock entry when creating an inter-empire route.
 * Returns the updated locks array (or same array if intra-empire).
 */
export function addCargoLock(
  originPlanetId: string,
  destPlanetId: string,
  cargoType: CargoType,
  routeId: string,
  systems: StarSystem[],
  planets: Array<{ id: string; systemId: string }>,
  locks: InterEmpireCargoLock[],
): InterEmpireCargoLock[] {
  const originEmpireId = getEmpireForPlanet(originPlanetId, systems, planets);
  const destEmpireId = getEmpireForPlanet(destPlanetId, systems, planets);

  if (!originEmpireId || !destEmpireId) return locks;
  if (originEmpireId === destEmpireId) return locks;

  return [
    ...locks,
    { originEmpireId, destinationEmpireId: destEmpireId, cargoType, routeId },
  ];
}

/**
 * Remove all cargo lock entries for a given route.
 */
export function removeCargoLocks(
  routeId: string,
  locks: InterEmpireCargoLock[],
): InterEmpireCargoLock[] {
  return locks.filter((l) => l.routeId !== routeId);
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

export function setRoutePaused(
  routeId: string,
  paused: boolean,
  routes: ActiveRoute[],
): ActiveRoute[] {
  return routes.map((r) => (r.id === routeId ? { ...r, paused } : r));
}

export function setRouteCargo(
  routeId: string,
  newCargo: ActiveRoute["cargoType"],
  routes: ActiveRoute[],
): ActiveRoute[] {
  return routes.map((r) =>
    r.id === routeId ? { ...r, cargoType: newCargo } : r,
  );
}

/**
 * Estimate revenue for a route+ship for one turn.
 * Matches the TurnSimulator formula: applies calculatePrice, distancePremium,
 * and INTRA_SYSTEM_REVENUE_MULTIPLIER so the displayed estimate is accurate.
 */
export function estimateRouteRevenue(
  route: ActiveRoute,
  ship: Ship,
  market: MarketState,
  state?: Pick<GameState, "galaxy">,
): number {
  if (!route.cargoType) return 0;

  const destMarket = market.planetMarkets[route.destinationPlanetId];
  if (!destMarket) return 0;

  const destEntry = destMarket[route.cargoType];
  const price = calculatePrice(destEntry, route.cargoType);

  const trips = calculateTripsPerTurn(route.distance, ship.speed);

  // Use passenger capacity for passengers, cargo capacity for everything else
  const capacity =
    route.cargoType === "passengers"
      ? ship.passengerCapacity
      : ship.cargoCapacity;

  const totalCargoMoved = capacity * trips;

  // Determine intra-system status: extract system from planet ID "planet-{si}-{syi}-{pi}"
  const originParts = route.originPlanetId.split("-");
  const destParts = route.destinationPlanetId.split("-");
  const isIntraSystem =
    state != null
      ? isLocalRoute(route, state)
      : originParts.length >= 4 &&
        destParts.length >= 4 &&
        originParts[0] === "planet" &&
        destParts[0] === "planet" &&
        `${originParts[1]}-${originParts[2]}` === `${destParts[1]}-${destParts[2]}`;

  const distancePremium = Math.min(
    DISTANCE_PREMIUM_CAP,
    route.distance * DISTANCE_PREMIUM_RATE,
  );
  const revenueMultiplier = isIntraSystem
    ? INTRA_SYSTEM_REVENUE_MULTIPLIER
    : 1 + distancePremium;

  return Math.round(totalCargoMoved * price * revenueMultiplier * 100) / 100;
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
 *
 * Filters by empire access, trade policies, cargo locks, route slots,
 * and hyperlane reachability.
 */
export function scanAllRouteOpportunities(
  planets: Planet[],
  systems: StarSystem[],
  fleet: Ship[],
  market: MarketState,
  activeRoutes: ActiveRoute[],
  cash: number,
  state?: GameState,
): RouteOpportunity[] {
  const cargoTypes = Object.values(CargoTypeEnum) as CargoType[];
  const availableShips = fleet.filter((s) => !s.assignedRouteId);

  // Pre-build set of active route keys for quick lookup
  const activeRouteKeys = new Set(
    activeRoutes.map((r) => `${r.originPlanetId}→${r.destinationPlanetId}`),
  );

  // Pre-compute reachable systems via hyperlanes if available
  const hyperlanes = state?.hyperlanes ?? [];
  const borderPorts = state?.borderPorts ?? [];
  const hasHyperlanes = hyperlanes.length > 0;
  const reachableBySystem = new Map<string, Set<string>>();
  if (hasHyperlanes) {
    const systemIds = new Set(systems.map((s) => s.id));
    for (const sid of systemIds) {
      if (!reachableBySystem.has(sid)) {
        reachableBySystem.set(
          sid,
          getReachableSystems(sid, hyperlanes, borderPorts),
        );
      }
    }
  }

  const opportunities: RouteOpportunity[] = [];

  for (const origin of planets) {
    for (const dest of planets) {
      if (origin.id === dest.id) continue;

      // Filter by empire access if state provided
      if (state) {
        const originEmpireId = getEmpireForPlanet(origin.id, systems, planets);
        const destEmpireId = getEmpireForPlanet(dest.id, systems, planets);
        if (originEmpireId && !isEmpireAccessible(originEmpireId, state))
          continue;
        if (destEmpireId && !isEmpireAccessible(destEmpireId, state)) continue;
      }

      // Filter by hyperlane reachability
      if (hasHyperlanes && origin.systemId !== dest.systemId) {
        const reachable = reachableBySystem.get(origin.systemId);
        if (reachable && !reachable.has(dest.systemId)) continue;
      }

      const distance = calculateDistance(
        origin,
        dest,
        systems,
        state?.hyperlanes,
        state?.borderPorts,
      );
      if (distance < 1 || distance === -1) continue; // skip trivially close or unreachable
      const destMarket = market.planetMarkets[dest.id];
      if (!destMarket) continue;

      const alreadyActive = activeRouteKeys.has(`${origin.id}→${dest.id}`);
      const licenseFee = calculateLicenseFee(distance, activeRoutes.length);

      // Emit an entry for EACH profitable cargo type on this pair
      for (const cargoType of cargoTypes) {
        // Filter by trade policies and cargo locks if state provided
        if (state) {
          const oEid = getEmpireForPlanet(origin.id, systems, planets);
          const dEid = getEmpireForPlanet(dest.id, systems, planets);
          if (oEid && dEid && oEid !== dEid) {
            if (
              checkTradePolicyViolation(
                oEid,
                dEid,
                cargoType,
                state.empireTradePolicies,
              )
            )
              continue;
            if (
              checkCargoLockViolation(
                oEid,
                dEid,
                cargoType,
                state.interEmpireCargoLocks,
                state,
              )
            )
              continue;
          }
        }

        const destEntry = destMarket[cargoType];
        const price = calculatePrice(destEntry, cargoType);
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
        const isIntraSystem = origin.systemId === dest.systemId;
        const distancePremium = Math.min(DISTANCE_PREMIUM_CAP, distance * DISTANCE_PREMIUM_RATE);
        const revenueMultiplier = isIntraSystem ? INTRA_SYSTEM_REVENUE_MULTIPLIER : 1 + distancePremium;
        const revenue = Math.round(trips * capacity * price * revenueMultiplier * 100) / 100;
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
