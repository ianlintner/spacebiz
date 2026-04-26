import type {
  GameState,
  Empire,
  StarSystem,
  CargoType,
  EmpireTradePolicyEntry,
  InterEmpireCargoLock,
} from "../../data/types.ts";
import {
  BASE_CARGO_TYPES_PER_PAIR,
  STARTING_ADJACENT_EMPIRES,
} from "../../data/constants.ts";
import {
  getTechEffectTotal,
  getTechRouteSlotBonus,
} from "../tech/TechEffects.ts";
import { getRouteSlotBonus } from "../hub/HubBonusCalculator.ts";
import { findPath } from "../routes/HyperlaneRouter.ts";

// ---------------------------------------------------------------------------
// Empire Access Helpers
// ---------------------------------------------------------------------------

/**
 * Find the N closest empires to the given home empire, measured by
 * Euclidean distance between empire home-system centers.
 */
export function findAdjacentEmpires(
  homeEmpireId: string,
  empires: Empire[],
  systems: StarSystem[],
  count: number = STARTING_ADJACENT_EMPIRES,
): string[] {
  const homeEmpire = empires.find((e) => e.id === homeEmpireId);
  if (!homeEmpire) return [];

  const homeSystem = systems.find((s) => s.id === homeEmpire.homeSystemId);
  if (!homeSystem) return [];

  const distances: Array<{ empireId: string; dist: number }> = [];

  for (const empire of empires) {
    if (empire.id === homeEmpireId) continue;
    const sys = systems.find((s) => s.id === empire.homeSystemId);
    if (!sys) continue;
    const dx = sys.x - homeSystem.x;
    const dy = sys.y - homeSystem.y;
    distances.push({ empireId: empire.id, dist: Math.sqrt(dx * dx + dy * dy) });
  }

  distances.sort((a, b) => a.dist - b.dist);
  return distances.slice(0, count).map((d) => d.empireId);
}

/**
 * Check whether the player has access to a given empire.
 */
export function isEmpireAccessible(
  empireId: string,
  state: GameState,
): boolean {
  return state.unlockedEmpireIds.includes(empireId);
}

/**
 * Get the empire ID for a planet.
 */
export function getEmpireForPlanet(
  planetId: string,
  systems: StarSystem[],
  planets: { id: string; systemId: string }[],
): string | null {
  const planet = planets.find((p) => p.id === planetId);
  if (!planet) return null;
  const system = systems.find((s) => s.id === planet.systemId);
  return system?.empireId ?? null;
}

// ---------------------------------------------------------------------------
// Trade Policy Validation
// ---------------------------------------------------------------------------

/**
 * Check if the given cargo type is banned for a route between two empires.
 * Returns an error string if banned, or null if allowed.
 */
export function checkTradePolicyViolation(
  originEmpireId: string,
  destEmpireId: string,
  cargoType: CargoType,
  policies: Record<string, EmpireTradePolicyEntry>,
): string | null {
  const originPolicy = policies[originEmpireId];
  const destPolicy = policies[destEmpireId];

  // Check export ban on origin
  if (originPolicy && originPolicy.bannedExports.includes(cargoType)) {
    return `${cargoType} exports are banned by the origin empire`;
  }

  // Check import ban on destination
  if (destPolicy && destPolicy.bannedImports.includes(cargoType)) {
    return `${cargoType} imports are banned by the destination empire`;
  }

  return null;
}

/**
 * Check if opening a new inter-empire route with the given cargo type
 * would violate the cargo-per-pair limit.
 */
export function checkCargoLockViolation(
  originEmpireId: string,
  destEmpireId: string,
  cargoType: CargoType,
  locks: InterEmpireCargoLock[],
  state: GameState,
): string | null {
  // Same empire — no lock restriction
  if (originEmpireId === destEmpireId) return null;

  // Count existing distinct cargo types for this direction
  const existingTypes = new Set(
    locks
      .filter(
        (l) =>
          l.originEmpireId === originEmpireId &&
          l.destinationEmpireId === destEmpireId,
      )
      .map((l) => l.cargoType),
  );

  // If this cargo type is already in use for this pair, it's fine
  if (existingTypes.has(cargoType)) return null;

  // Check limit
  const techBonus = getTechEffectTotal(state, "addCargoTypesPerPair");
  const maxTypes = BASE_CARGO_TYPES_PER_PAIR + techBonus;

  if (existingTypes.size >= maxTypes) {
    return `Maximum of ${maxTypes} cargo type(s) allowed between this empire pair`;
  }

  return null;
}

/**
 * Comprehensive route creation validation.
 * Returns null if allowed, or an error string explaining why not.
 */
export function validateRouteCreation(
  originPlanetId: string,
  destPlanetId: string,
  cargoType: CargoType | null,
  state: GameState,
): string | null {
  const { systems, planets } = state.galaxy;
  const hyperlanes = state.hyperlanes ?? [];
  const borderPorts = state.borderPorts ?? [];

  // Check empire access
  const originEmpireId = getEmpireForPlanet(originPlanetId, systems, planets);
  const destEmpireId = getEmpireForPlanet(destPlanetId, systems, planets);

  if (!originEmpireId || !destEmpireId) return "Invalid planet";
  const originPlanet = planets.find((planet) => planet.id === originPlanetId);
  const destinationPlanet = planets.find(
    (planet) => planet.id === destPlanetId,
  );
  if (!originPlanet || !destinationPlanet) return "Invalid planet";
  if (originPlanet.id === destinationPlanet.id) {
    return "Origin and destination must be different planets";
  }

  if (!isEmpireAccessible(originEmpireId, state)) {
    return "Origin empire is not yet accessible";
  }
  if (!isEmpireAccessible(destEmpireId, state)) {
    return "Destination empire is not yet accessible";
  }

  // Each route consumes a slot from the pool that matches its scope.
  // System (intra-system), empire (intra-empire interstellar), and galactic
  // (inter-empire) each draw from a separate pool.
  const isSystem = originPlanet.systemId === destinationPlanet.systemId;
  const isGalactic = !isSystem && originEmpireId !== destEmpireId;

  const systemRoutes = state.activeRoutes.filter((r) => {
    const o = planets.find((p) => p.id === r.originPlanetId);
    const d = planets.find((p) => p.id === r.destinationPlanetId);
    return o && d && o.systemId === d.systemId;
  });
  const galacticRoutes = state.activeRoutes.filter((r) => {
    const o = planets.find((p) => p.id === r.originPlanetId);
    const d = planets.find((p) => p.id === r.destinationPlanetId);
    if (!o || !d || o.systemId === d.systemId) return false;
    const oSys = systems.find((s) => s.id === o.systemId);
    const dSys = systems.find((s) => s.id === d.systemId);
    return !!oSys && !!dSys && oSys.empireId !== dSys.empireId;
  });
  const empireRoutes =
    state.activeRoutes.length - systemRoutes.length - galacticRoutes.length;

  if (isSystem) {
    const available = state.localRouteSlots ?? 2;
    if (available - systemRoutes.length <= 0) {
      return "No available system route slots";
    }
  } else if (isGalactic) {
    const available = state.galacticRouteSlots ?? 2;
    if (available - galacticRoutes.length <= 0) {
      return "No available galactic route slots";
    }
  } else {
    const available =
      state.routeSlots +
      getTechRouteSlotBonus(state) +
      getRouteSlotBonus(state.stationHub);
    if (available - empireRoutes <= 0) {
      return "No available empire route slots";
    }
  }

  if (
    originPlanet.systemId !== destinationPlanet.systemId &&
    hyperlanes.length > 0 &&
    !findPath(
      originPlanet.systemId,
      destinationPlanet.systemId,
      hyperlanes,
      borderPorts,
    )
  ) {
    return "No hyperlane path exists between those systems";
  }

  // For inter-empire routes, check trade policies and cargo locks
  if (cargoType && originEmpireId !== destEmpireId) {
    const policyError = checkTradePolicyViolation(
      originEmpireId,
      destEmpireId,
      cargoType,
      state.empireTradePolicies,
    );
    if (policyError) return policyError;

    const lockError = checkCargoLockViolation(
      originEmpireId,
      destEmpireId,
      cargoType,
      state.interEmpireCargoLocks,
      state,
    );
    if (lockError) return lockError;
  }

  return null;
}
