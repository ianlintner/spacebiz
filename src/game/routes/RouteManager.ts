import type {
  Planet,
  StarSystem,
  ActiveRoute,
  MarketState,
  CargoType,
  CargoMarketEntry,
  GameState,
  InterEmpireCargoLock,
  Hyperlane,
  BorderPort,
  RouteScope,
} from "../../data/types.ts";
import {
  CargoType as CargoTypeEnum,
  RouteScope as RouteScopeEnum,
} from "../../data/types.ts";
import {
  TURN_DURATION,
  MAX_TRIPS_PER_TURN,
  BASE_LICENSE_FEE,
  LICENSE_FEE_DISTANCE_DIVISOR,
  LICENSE_FEE_ROUTE_ESCALATION,
  SCOPE_DEMAND_MULTIPLIERS,
  BASE_GALACTIC_ROUTE_SLOTS,
  BASE_SYSTEM_ROUTE_SLOTS,
  MIN_HULL_MARK_BY_SCOPE,
} from "../../data/constants.ts";
import { calculatePrice } from "../economy/PriceCalculator.ts";
import { getLicenseFeeMultiplier } from "../reputation/ReputationEffects.ts";
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
  const repMult =
    reputation !== undefined ? getLicenseFeeMultiplier(reputation) : 1.0;
  return Math.round(BASE_LICENSE_FEE * distMult * routeMult * repMult);
}

// ── Route Scope Classification ─────────────────────────────────────────
//
// Each route falls into exactly one scope, which determines:
//   1. Which slot pool it consumes (system / empire / galactic)
//   2. Which per-cargo demand multiplier applies to its revenue
//
// Scope is derived from the planet → system → empire chain. Falling back to
// "empire" when an empire id is missing keeps generated/test routes from
// crashing the slot accounting; it is the safest "neutral" bucket.

type RouteEndpoints = Pick<
  ActiveRoute,
  "originPlanetId" | "destinationPlanetId"
>;

// Identity cache of (planets, systems) → lookup maps. Rebuilt only when the
// galaxy arrays are replaced (which only happens on new-game / load), so the
// per-keystroke route builder preview and the per-filter route finder both
// reuse the same maps for free.
let cachedGalaxyPlanetsRef:
  | Pick<GameState, "galaxy">["galaxy"]["planets"]
  | null = null;
let cachedGalaxySystemsRef:
  | Pick<GameState, "galaxy">["galaxy"]["systems"]
  | null = null;
let cachedPlanetById: Map<string, Planet> | null = null;
let cachedSystemById: Map<string, StarSystem> | null = null;

function getGalaxyIndexes(galaxy: Pick<GameState, "galaxy">["galaxy"]): {
  planetById: Map<string, Planet>;
  systemById: Map<string, StarSystem>;
} {
  if (
    cachedPlanetById !== null &&
    cachedSystemById !== null &&
    cachedGalaxyPlanetsRef === galaxy.planets &&
    cachedGalaxySystemsRef === galaxy.systems
  ) {
    return {
      planetById: cachedPlanetById,
      systemById: cachedSystemById,
    };
  }
  const planetById = new Map(galaxy.planets.map((p) => [p.id, p]));
  const systemById = new Map(galaxy.systems.map((s) => [s.id, s]));
  cachedGalaxyPlanetsRef = galaxy.planets;
  cachedGalaxySystemsRef = galaxy.systems;
  cachedPlanetById = planetById;
  cachedSystemById = systemById;
  return { planetById, systemById };
}

/** Test-only hook for the route-manager memoization caches. */
export function _clearRouteManagerCaches(): void {
  cachedGalaxyPlanetsRef = null;
  cachedGalaxySystemsRef = null;
  cachedPlanetById = null;
  cachedSystemById = null;
  cachedSlotUsage = null;
  cachedSlotUsageRoutesRef = null;
  cachedSlotUsagePlanetsRef = null;
  cachedSlotUsageSystemsRef = null;
}

export function getRouteScope(
  route: RouteEndpoints,
  state: Pick<GameState, "galaxy">,
): RouteScope {
  const { planetById, systemById } = getGalaxyIndexes(state.galaxy);
  const origin = planetById.get(route.originPlanetId);
  const dest = planetById.get(route.destinationPlanetId);
  if (!origin || !dest) return RouteScopeEnum.Empire;
  if (origin.systemId === dest.systemId) return RouteScopeEnum.System;

  const originSystem = systemById.get(origin.systemId);
  const destSystem = systemById.get(dest.systemId);
  if (!originSystem || !destSystem) return RouteScopeEnum.Empire;
  if (originSystem.empireId !== destSystem.empireId) {
    return RouteScopeEnum.Galactic;
  }
  return RouteScopeEnum.Empire;
}

/**
 * Returns true if the current hull mark allows opening a route of the given scope.
 * Mk I: system only. Mk II: empire+. Mk III+: galactic.
 */
export function canOpenRoute(scope: RouteScope, hullMark: number): boolean {
  return hullMark >= (MIN_HULL_MARK_BY_SCOPE[scope] ?? 1);
}

export interface RouteSlotUsage {
  system: number;
  empire: number;
  galactic: number;
}

// Memoize by (activeRoutes, planets, systems) identity. The 3-tier slot UI
// calls each scope getter independently, and each formerly scanned the full
// activeRoutes array.
let cachedSlotUsage: RouteSlotUsage | null = null;
let cachedSlotUsageRoutesRef: GameState["activeRoutes"] | null = null;
let cachedSlotUsagePlanetsRef:
  | Pick<GameState, "galaxy">["galaxy"]["planets"]
  | null = null;
let cachedSlotUsageSystemsRef:
  | Pick<GameState, "galaxy">["galaxy"]["systems"]
  | null = null;

/**
 * Single-pass tally of slot consumption by scope. Replaces three separate
 * `state.activeRoutes.filter(...)` scans when the UI needs all three counts
 * (the 3-tier slot summary, the route finder header, etc.).
 */
export function getRouteSlotUsage(state: GameState): RouteSlotUsage {
  if (
    cachedSlotUsage !== null &&
    cachedSlotUsageRoutesRef === state.activeRoutes &&
    cachedSlotUsagePlanetsRef === state.galaxy.planets &&
    cachedSlotUsageSystemsRef === state.galaxy.systems
  ) {
    return cachedSlotUsage;
  }
  const usage: RouteSlotUsage = { system: 0, empire: 0, galactic: 0 };
  const { planetById, systemById } = getGalaxyIndexes(state.galaxy);
  for (const route of state.activeRoutes) {
    const origin = planetById.get(route.originPlanetId);
    const dest = planetById.get(route.destinationPlanetId);
    if (!origin || !dest) {
      usage.empire++;
      continue;
    }
    if (origin.systemId === dest.systemId) {
      usage.system++;
      continue;
    }
    const oSys = systemById.get(origin.systemId);
    const dSys = systemById.get(dest.systemId);
    if (!oSys || !dSys) {
      usage.empire++;
      continue;
    }
    if (oSys.empireId !== dSys.empireId) {
      usage.galactic++;
    } else {
      usage.empire++;
    }
  }
  cachedSlotUsage = usage;
  cachedSlotUsageRoutesRef = state.activeRoutes;
  cachedSlotUsagePlanetsRef = state.galaxy.planets;
  cachedSlotUsageSystemsRef = state.galaxy.systems;
  return usage;
}

/**
 * Resolve the scope-based revenue multiplier for a (cargoType, scope) pair.
 * Centralised so the simulator, route estimator, and opportunity scanner all
 * stay in lock-step.
 */
export function getScopeDemandMultiplier(
  cargoType: CargoType,
  scope: RouteScope,
): number {
  return SCOPE_DEMAND_MULTIPLIERS[cargoType][scope];
}

// ── Local Route Helpers ────────────────────────────────────────────────

/**
 * Returns true when origin and destination are in the same star system.
 * These routes use the separate localRouteSlots (system) pool.
 */
export function isLocalRoute(
  route: RouteEndpoints,
  state: Pick<GameState, "galaxy">,
): boolean {
  return getRouteScope(route, state) === RouteScopeEnum.System;
}

/**
 * Returns true when origin and destination empires differ. These routes use
 * the galacticRouteSlots pool.
 */
export function isGalacticRoute(
  route: RouteEndpoints,
  state: Pick<GameState, "galaxy">,
): boolean {
  return getRouteScope(route, state) === RouteScopeEnum.Galactic;
}

// ── Route Slot Helpers ─────────────────────────────────────────────────

/**
 * Empire-tier slots available (intra-empire interstellar).
 * Backed by `state.routeSlots` plus tech and hub bonuses.
 */
export function getAvailableRouteSlots(state: GameState): number {
  return (
    state.routeSlots +
    getTechRouteSlotBonus(state) +
    getRouteSlotBonus(state.stationHub)
  );
}

/** Alias used by 3-tier UI — same value as `getAvailableRouteSlots`. */
export function getAvailableEmpireRouteSlots(state: GameState): number {
  return getAvailableRouteSlots(state);
}

/** System-tier slot pool. Falls back to default when missing on legacy saves. */
export function getAvailableLocalRouteSlots(state: GameState): number {
  return state.localRouteSlots ?? BASE_SYSTEM_ROUTE_SLOTS;
}

/** Alias used by 3-tier UI — same value as `getAvailableLocalRouteSlots`. */
export function getAvailableSystemRouteSlots(state: GameState): number {
  return getAvailableLocalRouteSlots(state);
}

/** Galactic-tier slot pool. Falls back to default when missing on legacy saves. */
export function getAvailableGalacticRouteSlots(state: GameState): number {
  return state.galacticRouteSlots ?? BASE_GALACTIC_ROUTE_SLOTS;
}

/** Empire-tier slots in use (intra-empire interstellar only). */
export function getUsedRouteSlots(state: GameState): number {
  return getRouteSlotUsage(state).empire;
}

/** Alias used by 3-tier UI — same value as `getUsedRouteSlots`. */
export function getUsedEmpireRouteSlots(state: GameState): number {
  return getUsedRouteSlots(state);
}

/** System-tier slots in use. */
export function getUsedLocalRouteSlots(state: GameState): number {
  return getRouteSlotUsage(state).system;
}

/** Alias used by 3-tier UI — same value as `getUsedLocalRouteSlots`. */
export function getUsedSystemRouteSlots(state: GameState): number {
  return getUsedLocalRouteSlots(state);
}

/** Galactic-tier slots in use. */
export function getUsedGalacticRouteSlots(state: GameState): number {
  return getRouteSlotUsage(state).galactic;
}

/** Free empire-tier slots remaining. */
export function getFreeRouteSlots(state: GameState): number {
  return Math.max(0, getAvailableRouteSlots(state) - getUsedRouteSlots(state));
}

/** Free system-tier slots remaining. */
export function getFreeLocalRouteSlots(state: GameState): number {
  return Math.max(
    0,
    getAvailableLocalRouteSlots(state) - getUsedLocalRouteSlots(state),
  );
}

/** Free galactic-tier slots remaining. */
export function getFreeGalacticRouteSlots(state: GameState): number {
  return Math.max(
    0,
    getAvailableGalacticRouteSlots(state) - getUsedGalacticRouteSlots(state),
  );
}

/** Free slots for a given scope — convenience for validators and UI. */
export function getFreeSlotsForScope(
  state: GameState,
  scope: RouteScope,
): number {
  switch (scope) {
    case RouteScopeEnum.System:
      return getFreeLocalRouteSlots(state);
    case RouteScopeEnum.Galactic:
      return getFreeGalacticRouteSlots(state);
    case RouteScopeEnum.Empire:
    default:
      return getFreeRouteSlots(state);
  }
}

export interface RouteTrafficVisual {
  ownerId: string;
  routeId: string;
  pathSystemIds: string[];
  visibleUnits: number;
  cargoType: CargoType | null;
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
}

export function getVisibleRouteTrafficUnits(_routeOrCount?: unknown): number {
  // Post Ship-removal: routes always render with a single visual unit; the
  // capacity-pool model has no per-ship visualization.
  return 1;
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
  const avoidanceRadius = Math.max(
    originRadius,
    destinationRadius,
    directDistance * 0.8,
  );

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
    const outwardBias =
      Math.sin(Math.PI * t) * Math.max(28, directDistance * 0.22);
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
  planets: Planet[],
  hyperlanes: Hyperlane[],
  borderPorts: BorderPort[],
): RouteTrafficVisual[] {
  return buildRouteTrafficVisualsFromSources(
    [{ ownerId: "player", routes }],
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

  return sources.flatMap(({ ownerId, routes }) => {
    return routes.flatMap((route) => {
      const originSystemId = planetSystemById.get(route.originPlanetId);
      const destinationSystemId = planetSystemById.get(
        route.destinationPlanetId,
      );
      if (!originSystemId || !destinationSystemId) {
        return [];
      }
      if (originSystemId === destinationSystemId) {
        return [];
      }

      const path = findPath(
        originSystemId,
        destinationSystemId,
        hyperlanes,
        borderPorts,
      );
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
          visibleUnits: 1,
          cargoType: route.cargoType,
        },
      ];
    });
  });
}

export function buildGalaxyRouteTrafficVisuals(
  state: Pick<
    GameState,
    "activeRoutes" | "aiCompanies" | "galaxy" | "hyperlanes" | "borderPorts"
  >,
): RouteTrafficVisual[] {
  const sources: RouteTrafficSource[] = [
    {
      ownerId: "player",
      routes: state.activeRoutes,
    },
    ...state.aiCompanies.map((company) => ({
      ownerId: company.id,
      routes: company.activeRoutes,
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
  planets: Planet[],
  hyperlanes: Hyperlane[],
  borderPorts: BorderPort[],
): string {
  const visuals = buildRouteTrafficVisuals(
    routes,
    planets,
    hyperlanes,
    borderPorts,
  );

  return JSON.stringify(
    visuals.map((visual) => ({
      ownerId: visual.ownerId,
      routeId: visual.routeId,
      pathSystemIds: visual.pathSystemIds,
      visibleUnits: visual.visibleUnits,
    })),
  );
}

export function buildGalaxyRouteTrafficStateKey(
  state: Pick<
    GameState,
    "activeRoutes" | "aiCompanies" | "galaxy" | "hyperlanes" | "borderPorts"
  >,
): string {
  const visuals = buildGalaxyRouteTrafficVisuals(state);

  return JSON.stringify(
    visuals.map((visual) => ({
      ownerId: visual.ownerId,
      routeId: visual.routeId,
      pathSystemIds: visual.pathSystemIds,
      visibleUnits: visual.visibleUnits,
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
 * Returns true when the given system pair already has a route for `cargoType`.
 * The check is bidirectional: A→B and B→A are the same pair.
 */
export function hasDuplicateSystemPairCargo(
  existingRoutes: ActiveRoute[],
  planets: Planet[],
  originSystemId: string,
  destSystemId: string,
  cargoType: CargoType,
): boolean {
  const planetById = new Map(planets.map((p) => [p.id, p]));
  return existingRoutes.some((r) => {
    if (r.cargoType !== cargoType) return false;
    const rOriginSysId = planetById.get(r.originPlanetId)?.systemId;
    const rDestSysId = planetById.get(r.destinationPlanetId)?.systemId;
    if (!rOriginSysId || !rDestSysId) return false;
    return (
      (rOriginSysId === originSystemId && rDestSysId === destSystemId) ||
      (rOriginSysId === destSystemId && rDestSysId === originSystemId)
    );
  });
}

/**
 * Create a new route.
 */
export function createRoute(
  originId: string,
  destId: string,
  distance: number,
  cargoType: CargoType | null,
  charterId?: string,
): ActiveRoute {
  return {
    id: `route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    originPlanetId: originId,
    destinationPlanetId: destId,
    distance,
    cargoType,
    charterId,
  };
}

/**
 * Delete a route from the routes array.
 *
 * Post Ship-removal, routes carry no per-ship assignments; deletion is a
 * simple filter on the routes list.
 */
export function deleteRoute(
  routeId: string,
  routes: ActiveRoute[],
): { routes: ActiveRoute[] } {
  return { routes: routes.filter((r) => r.id !== routeId) };
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
 * Estimate revenue for a route+ship for one turn. Mirrors the TurnSimulator
 * formula so the displayed estimate matches actual simulation:
 *
 *   revenue = price × capacity × trips × scopeDemand × distancePremium
 *
 * For system-scope routes, only the per-cargo scope multiplier applies (no
 * distance premium — there isn't enough distance to matter). For empire and
 * galactic routes, the scope multiplier stacks with the standard distance
 * premium.
 */
/**
 * Reference ship-like profile used for capacity-pool route estimates.
 * Approximates an average freighter so the route-level revenue/fuel numbers
 * stay stable in the post Ship-removal capacity model.
 */
const REFERENCE_SHIP = {
  speed: 1,
  cargoCapacity: 80,
  passengerCapacity: 40,
  fuelEfficiency: 1,
} as const;

export function estimateRouteRevenue(
  route: ActiveRoute,
  market: MarketState,
  state?: Pick<GameState, "galaxy">,
): number {
  if (!route.cargoType) return 0;

  const destMarket = market.planetMarkets[route.destinationPlanetId];
  if (!destMarket) return 0;

  const destEntry = destMarket[route.cargoType];
  const price = calculatePrice(destEntry, route.cargoType);

  const ref = REFERENCE_SHIP;
  const trips = calculateTripsPerTurn(route.distance, ref.speed);

  // Use passenger capacity for passengers, cargo capacity for everything else
  const capacity =
    route.cargoType === "passengers"
      ? ref.passengerCapacity
      : ref.cargoCapacity;

  const totalCargoMoved = capacity * trips;

  const scope =
    state != null ? getRouteScope(route, state) : inferScopeFromIds(route);
  const scopeMult = getScopeDemandMultiplier(route.cargoType, scope);

  return Math.round(totalCargoMoved * price * scopeMult * 100) / 100;
}

/**
 * Best-effort scope inference from planet ID structure when no state is
 * available (legacy callers). Recognizes "planet-{si}-{syi}-{pi}" → system id.
 * Cannot tell empire from system, so returns Empire for cross-system routes
 * (the default neutral bucket).
 */
function inferScopeFromIds(
  route: Pick<ActiveRoute, "originPlanetId" | "destinationPlanetId">,
): RouteScope {
  const originParts = route.originPlanetId.split("-");
  const destParts = route.destinationPlanetId.split("-");
  const sameSystem =
    originParts.length >= 4 &&
    destParts.length >= 4 &&
    originParts[0] === "planet" &&
    destParts[0] === "planet" &&
    `${originParts[1]}-${originParts[2]}` === `${destParts[1]}-${destParts[2]}`;
  return sameSystem ? RouteScopeEnum.System : RouteScopeEnum.Empire;
}

/**
 * Estimate fuel cost for a route+ship for one turn.
 * Fuel cost = trips * distance * 2 * fuelEfficiency * fuelPrice
 */
export function estimateRouteFuelCost(
  route: ActiveRoute,
  fuelPrice: number,
): number {
  const ref = REFERENCE_SHIP;
  const trips = calculateTripsPerTurn(route.distance, ref.speed);
  const totalDistance = trips * route.distance * 2;
  const fuelCost = totalDistance * ref.fuelEfficiency * fuelPrice;
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
  // ^ legacy field; in the capacity-pool model it is always "none".
  shipCost: number;
  licenseFee: number;
  alreadyActive: boolean;
  /** Route scope (system / empire / galactic) — drives slot pool + demand multiplier. */
  scope: RouteScope;
  /** Per-cargo scope demand multiplier applied to revenue. Surfaced for UI tooltips. */
  scopeDemandMultiplier: number;
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
  market: MarketState,
  activeRoutes: ActiveRoute[],
  _cash: number,
  state?: GameState,
): RouteOpportunity[] {
  const cargoTypes = Object.values(CargoTypeEnum) as CargoType[];

  // Pre-build set of active route keys for quick lookup
  const activeRouteKeys = new Set(
    activeRoutes.map((r) => `${r.originPlanetId}→${r.destinationPlanetId}`),
  );

  // O(1) indexes for planet/system/empire lookups. The inner loop runs
  // P×P×C times (~100k entries on a standard galaxy) and previously called
  // getEmpireForPlanet 4× per pair, each doing two linear `find`s — that
  // single hot spot dominated the route-finder refresh.
  const systemById = new Map(systems.map((s) => [s.id, s]));
  const planetEmpireById = new Map<string, string | null>();
  for (const p of planets) {
    const sys = systemById.get(p.systemId);
    planetEmpireById.set(p.id, sys?.empireId ?? null);
  }

  // Pre-compute reachable systems via hyperlanes if available
  const hyperlanes = state?.hyperlanes ?? [];
  const borderPorts = state?.borderPorts ?? [];
  const hasHyperlanes = hyperlanes.length > 0;
  const reachableBySystem = new Map<string, Set<string>>();
  if (hasHyperlanes) {
    for (const sys of systems) {
      if (reachableBySystem.has(sys.id)) continue;
      // Reachability is symmetric, so getReachableSystems now returns a
      // shared Set per connected component — the loop populates the map
      // by component, not by system.
      const reachable = getReachableSystems(sys.id, hyperlanes, borderPorts);
      for (const member of reachable) reachableBySystem.set(member, reachable);
    }
  }

  const opportunities: RouteOpportunity[] = [];

  for (const origin of planets) {
    const originEmpireId = planetEmpireById.get(origin.id) ?? null;

    // Filter by empire access if state provided — origin gate hoisted out
    // of the inner loop since it depends only on the origin.
    if (state && originEmpireId && !isEmpireAccessible(originEmpireId, state)) {
      continue;
    }

    const reachable = hasHyperlanes
      ? (reachableBySystem.get(origin.systemId) ?? null)
      : null;

    for (const dest of planets) {
      if (origin.id === dest.id) continue;

      const destEmpireId = planetEmpireById.get(dest.id) ?? null;
      if (state && destEmpireId && !isEmpireAccessible(destEmpireId, state))
        continue;

      // Filter by hyperlane reachability
      if (
        hasHyperlanes &&
        origin.systemId !== dest.systemId &&
        reachable &&
        !reachable.has(dest.systemId)
      ) {
        continue;
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
      const crossEmpire =
        originEmpireId !== null &&
        destEmpireId !== null &&
        originEmpireId !== destEmpireId;
      const scope =
        origin.systemId === dest.systemId
          ? RouteScopeEnum.System
          : crossEmpire
            ? RouteScopeEnum.Galactic
            : RouteScopeEnum.Empire;

      // Emit an entry for EACH profitable cargo type on this pair
      for (const cargoType of cargoTypes) {
        // Filter by trade policies and cargo locks if state provided
        if (state && crossEmpire && originEmpireId && destEmpireId) {
          if (
            checkTradePolicyViolation(
              originEmpireId,
              destEmpireId,
              cargoType,
              state.empireTradePolicies,
            )
          )
            continue;
          if (
            checkCargoLockViolation(
              originEmpireId,
              destEmpireId,
              cargoType,
              state.interEmpireCargoLocks,
              state,
            )
          )
            continue;
        }

        const destEntry = destMarket[cargoType];
        const price = calculatePrice(destEntry, cargoType);
        const scopeMult = getScopeDemandMultiplier(cargoType, scope);

        // Capacity-pool model: use a fixed reference vessel for revenue/fuel
        // projections. Hull marks alter actual revenue in TurnSimulator but
        // are intentionally factored out here so the Route Finder ranking
        // stays stable across tech progression.
        const isPassenger = cargoType === "passengers";
        const refCap = isPassenger
          ? REFERENCE_SHIP.passengerCapacity
          : REFERENCE_SHIP.cargoCapacity;
        const trips = calculateTripsPerTurn(distance, REFERENCE_SHIP.speed);
        const revenue =
          Math.round(trips * refCap * price * scopeMult * 100) / 100;
        const fuelCost =
          Math.round(
            trips *
              distance *
              2 *
              REFERENCE_SHIP.fuelEfficiency *
              market.fuelPrice *
              100,
          ) / 100;
        const profit = revenue - fuelCost;
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
          shipName: "—",
          shipClass: "capacity",
          shipSource: "none",
          shipCost: 0,
          licenseFee,
          alreadyActive,
          scope,
          scopeDemandMultiplier: scopeMult,
        });
      }
    }
  }

  // Sort by profit descending. The Route Finder caps the displayed list at
  // 200, but a flat profit-DESC truncation lets a single high-margin cargo
  // (typically galactic luxury, often 100+ entries on a fresh standard
  // galaxy) crowd every other cargo out of the top 200 — the player then
  // sees zero raw-materials or hazmat options even though the underlying
  // opportunities exist. We reserve a per-(scope × cargo) quota first so
  // intra-empire and intra-system routes survive the truncation alongside
  // galactic ones (galactic scope's higher revenue multiplier otherwise
  // sweeps the top-K of every cargo bucket and leaves "Intra Empire"
  // permanently empty for some seeds), then fill the remaining slots from
  // the global profit-sorted tail.
  opportunities.sort((a, b) => b.estProfit - a.estProfit);
  const HARD_CAP = 200;
  if (opportunities.length <= HARD_CAP) return opportunities;

  const PER_BUCKET_QUOTA = 6;
  const reserved: RouteOpportunity[] = [];
  const overflow: RouteOpportunity[] = [];
  const quotaUsed = new Map<string, number>();
  for (const opp of opportunities) {
    const key = `${opp.scope}|${opp.bestCargoType}`;
    const used = quotaUsed.get(key) ?? 0;
    if (used < PER_BUCKET_QUOTA) {
      reserved.push(opp);
      quotaUsed.set(key, used + 1);
    } else {
      overflow.push(opp);
    }
  }
  const remaining = HARD_CAP - reserved.length;
  return remaining > 0
    ? [...reserved, ...overflow.slice(0, remaining)]
    : reserved.slice(0, HARD_CAP);
}
