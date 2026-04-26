import type {
  GameState,
  RouteMarketEntry,
  RouteRiskTag,
  CargoType,
  Planet,
  StarSystem,
  RouteScope,
} from "../../data/types.ts";
import {
  CargoType as CargoTypeEnum,
  DiplomaticStatus,
  RouteScope as RouteScopeEnum,
} from "../../data/types.ts";
import {
  ROUTE_MARKET_SIZE,
  ROUTE_MARKET_ENTRY_DURATION,
  SCOUT_COST_AP,
  SCOUT_COST_CASH,
  ROUTE_MARKET_SCOPE_QUOTA,
  DISTANCE_PREMIUM_RATE,
  DISTANCE_PREMIUM_CAP,
} from "../../data/constants.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import { calculatePrice } from "../economy/PriceCalculator.ts";
import {
  calculateDistance,
  calculateTripsPerTurn,
  getScopeDemandMultiplier,
} from "./RouteManager.ts";
import { calculateTariff } from "./TariffCalculator.ts";
import {
  getEmpireForPlanet,
  isEmpireAccessible,
  checkTradePolicyViolation,
} from "../empire/EmpireAccessManager.ts";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** All cargo types as a plain array for RNG picking. */
const ALL_CARGO_TYPES: CargoType[] = Object.values(
  CargoTypeEnum,
) as CargoType[];

/**
 * Get market size for the current game (keyed by gameSize, which matches the preset keys).
 */
function getMarketSize(state: GameState): number {
  return ROUTE_MARKET_SIZE[state.gameSize] ?? ROUTE_MARKET_SIZE["standard"];
}

/**
 * Compute the distance between two planets using state hyperlanes (if available).
 * Returns -1 when no path exists.
 */
function routeDistance(origin: Planet, dest: Planet, state: GameState): number {
  return calculateDistance(
    origin,
    dest,
    state.galaxy.systems,
    state.hyperlanes,
    state.borderPorts,
  );
}

/**
 * Classify a candidate (origin → dest) pair into a RouteScope.
 */
function classifyPairScope(
  origin: Planet,
  dest: Planet,
  systems: StarSystem[],
): RouteScope {
  if (origin.systemId === dest.systemId) return RouteScopeEnum.System;
  const oSys = systems.find((s) => s.id === origin.systemId);
  const dSys = systems.find((s) => s.id === dest.systemId);
  if (!oSys || !dSys) return RouteScopeEnum.Empire;
  return oSys.empireId !== dSys.empireId
    ? RouteScopeEnum.Galactic
    : RouteScopeEnum.Empire;
}

/**
 * Estimate profit-per-turn for a route. Mirrors the simulator's revenue
 * formula (price × capacity × trips × scopeMult × distance premium) so
 * scouted profits match what the player will actually earn.
 */
function estimateExactProfit(
  origin: Planet,
  dest: Planet,
  cargoType: CargoType,
  state: GameState,
): number {
  const { planetMarkets } = state.market;
  const destMarket = planetMarkets[dest.id];
  if (!destMarket) return 0;

  const isPassenger = cargoType === CargoTypeEnum.Passengers;
  const destEntry = destMarket[cargoType];
  if (!destEntry) return 0;

  const distance = routeDistance(origin, dest, state);
  if (distance <= 0) return 0;

  const price = calculatePrice(destEntry, cargoType);

  // Representative ship stats (median Cargo Shuttle)
  const representativeCapacity = isPassenger ? 60 : 80;
  const representativeSpeed = 4;
  const trips = calculateTripsPerTurn(distance, representativeSpeed);

  const scope = classifyPairScope(origin, dest, state.galaxy.systems);
  const scopeMult = getScopeDemandMultiplier(cargoType, scope);
  const distancePremium =
    scope === RouteScopeEnum.System
      ? 0
      : Math.min(DISTANCE_PREMIUM_CAP, distance * DISTANCE_PREMIUM_RATE);
  const revenueMultiplier = scopeMult * (1 + distancePremium);

  const fuelPerTrip = distance * 2 * 0.8 * state.market.fuelPrice;
  const revenue = trips * representativeCapacity * price * revenueMultiplier;
  const fuelCost = trips * fuelPerTrip;

  // Galactic-scope routes pay tariff to the destination empire — apply it
  // here so the scouted "exact profit" actually matches what the player
  // earns. Without this, scouted galactic profits over-state by 10–20%.
  let tariff = 0;
  if (scope === RouteScopeEnum.Galactic) {
    const synthRoute = {
      id: "estimator",
      originPlanetId: origin.id,
      destinationPlanetId: dest.id,
      distance,
      assignedShipIds: [],
      cargoType,
    };
    tariff = calculateTariff(
      synthRoute,
      revenue,
      "", // no owner empire — estimator treats the player as a generic carrier
      state.galaxy.systems,
      state.galaxy.empires,
      state.reputation,
      state.diplomaticRelations,
    );
  }

  return Math.max(0, Math.round((revenue - fuelCost - tariff) * 100) / 100);
}

/**
 * Derive risk tags for a route entry based on state.
 */
function computeRiskTags(
  origin: Planet,
  dest: Planet,
  cargoType: CargoType,
  state: GameState,
): RouteRiskTag[] {
  const tags: RouteRiskTag[] = [];
  const { systems, planets, empires } = state.galaxy;
  const relations = state.diplomaticRelations ?? [];

  const originEmpireId = getEmpireForPlanet(origin.id, systems, planets);
  const destEmpireId = getEmpireForPlanet(dest.id, systems, planets);

  // war_zone: any empire pair along this route is at war
  if (originEmpireId && destEmpireId && originEmpireId !== destEmpireId) {
    const rel = relations.find(
      (r) =>
        (r.empireA === originEmpireId && r.empireB === destEmpireId) ||
        (r.empireA === destEmpireId && r.empireB === originEmpireId),
    );
    if (rel?.status === DiplomaticStatus.War) {
      tags.push("war_zone");
    } else if (rel?.status === DiplomaticStatus.ColdWar) {
      tags.push("pirate_activity");
    }
  }

  // pirate_activity: check if origin empire disposition is hostile
  if (originEmpireId) {
    const originEmpire = empires.find((e) => e.id === originEmpireId);
    if (
      originEmpire?.disposition === "hostile" &&
      !tags.includes("pirate_activity")
    ) {
      tags.push("pirate_activity");
    }
  }

  // embargo_risk: trade policy bans this cargo
  if (originEmpireId && destEmpireId && originEmpireId !== destEmpireId) {
    const violation = checkTradePolicyViolation(
      originEmpireId,
      destEmpireId,
      cargoType,
      state.empireTradePolicies,
    );
    if (violation) {
      tags.push("embargo_risk");
    }
  }

  // high_saturation: destination saturation > 0.5 for this cargo
  const destMarket = state.market.planetMarkets[dest.id];
  if (destMarket && destMarket[cargoType]) {
    if (destMarket[cargoType].saturation > 0.5) {
      tags.push("high_saturation");
    }
  }

  // long_distance: route distance > 100
  const distance = routeDistance(origin, dest, state);
  if (distance > 100) {
    tags.push("long_distance");
  }

  // volatile_market: falling or rising trend at destination
  if (destMarket && destMarket[cargoType]) {
    const trend = destMarket[cargoType].trend;
    if (trend === "rising" || trend === "falling") {
      tags.push("volatile_market");
    }
  }

  // passenger_route: cargo is passengers
  if (cargoType === CargoTypeEnum.Passengers) {
    tags.push("passenger_route" as RouteRiskTag);
  }

  // low_competition: if no AI companies run routes on this planet pair
  const aiRoutes = state.aiCompanies.flatMap((c) => c.activeRoutes);
  const hasAICompetition = aiRoutes.some(
    (r) =>
      (r.originPlanetId === origin.id && r.destinationPlanetId === dest.id) ||
      (r.originPlanetId === dest.id && r.destinationPlanetId === origin.id),
  );
  if (!hasAICompetition) {
    tags.push("low_competition");
  }

  return tags;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface CandidatePair {
  origin: Planet;
  dest: Planet;
  scope: RouteScope;
}

/**
 * Pick a cargo type for a candidate pair, weighting by the per-cargo demand
 * multiplier for the pair's scope. Heavy goods cluster on system/empire
 * routes; luxury and tech cluster on galactic. Embargoed cargo is excluded.
 */
function pickCargoForPair(
  origin: Planet,
  dest: Planet,
  scope: RouteScope,
  systems: StarSystem[],
  planets: Planet[],
  state: GameState,
  rng: SeededRNG,
): CargoType | null {
  const originEmpireId = getEmpireForPlanet(origin.id, systems, planets);
  const destEmpireId = getEmpireForPlanet(dest.id, systems, planets);

  const allowed: Array<{ cargo: CargoType; weight: number }> = [];
  for (const cargo of ALL_CARGO_TYPES) {
    if (originEmpireId && destEmpireId && originEmpireId !== destEmpireId) {
      const violation = checkTradePolicyViolation(
        originEmpireId,
        destEmpireId,
        cargo,
        state.empireTradePolicies,
      );
      if (violation) continue;
    }
    // Square the multiplier so the bias toward "scope-appropriate" cargo is
    // visible without becoming deterministic — luxury still occasionally
    // shows up on a system route, but rarely.
    const mult = getScopeDemandMultiplier(cargo, scope);
    const weight = Math.max(0.01, mult * mult);
    allowed.push({ cargo, weight });
  }
  if (allowed.length === 0) return null;

  const totalWeight = allowed.reduce((sum, e) => sum + e.weight, 0);
  let target = rng.nextFloat(0, totalWeight);
  for (const entry of allowed) {
    target -= entry.weight;
    if (target <= 0) return entry.cargo;
  }
  return allowed[allowed.length - 1].cargo;
}

/**
 * Generate a fresh batch of route market entries for the current turn.
 *
 * The market is partitioned into three scope buckets (system / empire /
 * galactic) using ROUTE_MARKET_SCOPE_QUOTA. Each bucket tries to hit its
 * quota first; any leftover slack is filled from the remaining candidate
 * pool so the player never sees an empty market because one tier had no
 * candidates.
 */
export function generateRouteMarketEntries(
  state: GameState,
  rng: SeededRNG,
): RouteMarketEntry[] {
  const { planets, systems } = state.galaxy;
  const hyperlanes = state.hyperlanes ?? [];
  const marketSize = getMarketSize(state);

  // Build candidate pairs grouped by scope. Same-system pairs ARE eligible
  // now (system tier) — previously they were skipped entirely, which is part
  // of why players saw "only a couple non-system routes": there were too few
  // candidate pairs to fill the empire/galactic buckets in early-game maps
  // with restricted empire access.
  const bucketedCandidates: Record<RouteScope, CandidatePair[]> = {
    [RouteScopeEnum.System]: [],
    [RouteScopeEnum.Empire]: [],
    [RouteScopeEnum.Galactic]: [],
  };

  for (const origin of planets) {
    const originEmpireId = getEmpireForPlanet(origin.id, systems, planets);
    if (!originEmpireId || !isEmpireAccessible(originEmpireId, state)) continue;

    for (const dest of planets) {
      if (origin.id === dest.id) continue;

      const destEmpireId = getEmpireForPlanet(dest.id, systems, planets);
      if (!destEmpireId || !isEmpireAccessible(destEmpireId, state)) continue;

      // If hyperlanes exist, require a valid path between different systems
      if (hyperlanes.length > 0 && origin.systemId !== dest.systemId) {
        const dist = routeDistance(origin, dest, state);
        if (dist <= 0 || dist === -1) continue;
      }

      const scope = classifyPairScope(origin, dest, systems);
      bucketedCandidates[scope].push({ origin, dest, scope });
    }
  }

  const totalCandidates =
    bucketedCandidates.system.length +
    bucketedCandidates.empire.length +
    bucketedCandidates.galactic.length;
  if (totalCandidates === 0) return [];

  // Compute per-scope target counts. If a scope has no candidates, its quota
  // is reassigned proportionally to the remaining scopes.
  const targets = computeScopeTargets(marketSize, bucketedCandidates);

  const entries: RouteMarketEntry[] = [];
  const usedIds = new Set<string>();

  const fillFromBucket = (
    bucket: CandidatePair[],
    target: number,
    maxAttemptsPerEntry: number,
  ): number => {
    let added = 0;
    let attempts = 0;
    const maxAttempts = target * maxAttemptsPerEntry;
    while (added < target && attempts < maxAttempts && bucket.length > 0) {
      attempts++;
      const pair = rng.pick(bucket);
      const cargo = pickCargoForPair(
        pair.origin,
        pair.dest,
        pair.scope,
        systems,
        planets,
        state,
        rng,
      );
      if (!cargo) continue;

      const pairKey = `${pair.origin.id}→${pair.dest.id}→${cargo}`;
      if (usedIds.has(pairKey)) continue;

      const exactProfit = estimateExactProfit(
        pair.origin,
        pair.dest,
        cargo,
        state,
      );
      if (exactProfit <= 0) continue;

      usedIds.add(pairKey);

      const estimatedProfitMin = Math.round(exactProfit * 0.7);
      const estimatedProfitMax = Math.round(exactProfit * 1.3);
      const riskTags = computeRiskTags(pair.origin, pair.dest, cargo, state);

      entries.push({
        id: `rm-${state.turn}-${entries.length}-${rng.nextInt(0, 999999)}`,
        originPlanetId: pair.origin.id,
        destinationPlanetId: pair.dest.id,
        cargoType: cargo,
        estimatedProfitMin,
        estimatedProfitMax,
        exactProfitPerTurn: null,
        riskTags,
        scouted: false,
        expiresOnTurn: state.turn + ROUTE_MARKET_ENTRY_DURATION,
        claimedByAiId: null,
      });
      added++;
    }
    return added;
  };

  const scopeOrder: RouteScope[] = [
    RouteScopeEnum.System,
    RouteScopeEnum.Empire,
    RouteScopeEnum.Galactic,
  ];

  // First pass — fill each bucket toward its quota.
  for (const scope of scopeOrder) {
    fillFromBucket(bucketedCandidates[scope], targets[scope], 6);
  }

  // Second pass — top up any unmet quota from any bucket that still has room.
  // Order by largest remaining first so quotas converge.
  let deficit = marketSize - entries.length;
  if (deficit > 0) {
    const allCandidates = [
      ...bucketedCandidates.system,
      ...bucketedCandidates.empire,
      ...bucketedCandidates.galactic,
    ];
    fillFromBucket(allCandidates, deficit, 6);
  }

  return entries;
}

/**
 * Allocate `marketSize` entries across the three scopes using
 * ROUTE_MARKET_SCOPE_QUOTA. Scopes with zero candidates have their quota
 * redistributed proportionally to scopes that DO have candidates so the
 * market does not under-fill when one tier is unavailable.
 */
function computeScopeTargets(
  marketSize: number,
  bucketed: Record<RouteScope, CandidatePair[]>,
): Record<RouteScope, number> {
  const scopes: RouteScope[] = [
    RouteScopeEnum.System,
    RouteScopeEnum.Empire,
    RouteScopeEnum.Galactic,
  ];

  let activeWeight = 0;
  for (const scope of scopes) {
    if (bucketed[scope].length > 0) {
      activeWeight += ROUTE_MARKET_SCOPE_QUOTA[scope];
    }
  }

  const targets: Record<RouteScope, number> = {
    [RouteScopeEnum.System]: 0,
    [RouteScopeEnum.Empire]: 0,
    [RouteScopeEnum.Galactic]: 0,
  };
  if (activeWeight === 0) return targets;

  let assigned = 0;
  for (const scope of scopes) {
    if (bucketed[scope].length === 0) continue;
    const share = ROUTE_MARKET_SCOPE_QUOTA[scope] / activeWeight;
    const target = Math.floor(marketSize * share);
    targets[scope] = target;
    assigned += target;
  }

  // Distribute rounding remainder to scopes with the largest weight first.
  let remainder = marketSize - assigned;
  const ordered = [...scopes]
    .filter((s) => bucketed[s].length > 0)
    .sort((a, b) => ROUTE_MARKET_SCOPE_QUOTA[b] - ROUTE_MARKET_SCOPE_QUOTA[a]);
  for (const scope of ordered) {
    if (remainder <= 0) break;
    targets[scope]++;
    remainder--;
  }
  return targets;
}

/**
 * Tick the route market:
 * 1. Remove entries that have expired (expiresOnTurn <= current turn).
 * 2. Remove entries that have been claimed by AI.
 * 3. If the market is below capacity, generate new entries to fill it up.
 */
export function tickRouteMarket(
  state: GameState,
  rng: SeededRNG,
): RouteMarketEntry[] {
  const marketSize = getMarketSize(state);

  // Keep only non-expired, unclaimed entries
  const surviving = state.routeMarket.filter(
    (entry) => entry.expiresOnTurn > state.turn && entry.claimedByAiId === null,
  );

  const deficit = marketSize - surviving.length;
  if (deficit <= 0) {
    return surviving;
  }

  // Generate enough new entries to fill the deficit
  const tempState: GameState = { ...state, routeMarket: surviving };
  const newEntries = generateRouteMarketEntries(tempState, rng);

  // Take only as many as needed
  const toAdd = newEntries.slice(0, deficit);

  return [...surviving, ...toAdd];
}

/**
 * Scout a route market entry: deducts AP + cash, reveals exactProfitPerTurn,
 * marks scouted = true. Returns updated state and success flag.
 */
export function scoutRouteEntry(
  state: GameState,
  entryId: string,
): { updatedState: GameState; success: boolean; reason?: string } {
  const entryIndex = state.routeMarket.findIndex((e) => e.id === entryId);
  if (entryIndex === -1) {
    return { updatedState: state, success: false, reason: "Entry not found" };
  }

  const entry = state.routeMarket[entryIndex];

  if (entry.scouted) {
    return { updatedState: state, success: false, reason: "Already scouted" };
  }

  if (state.actionPoints.current < SCOUT_COST_AP) {
    return {
      updatedState: state,
      success: false,
      reason: "Insufficient AP",
    };
  }

  if (state.cash < SCOUT_COST_CASH) {
    return {
      updatedState: state,
      success: false,
      reason: "Insufficient cash",
    };
  }

  // Compute the revealed exact profit
  const { planets } = state.galaxy;
  const origin = planets.find((p) => p.id === entry.originPlanetId);
  const dest = planets.find((p) => p.id === entry.destinationPlanetId);

  let exactProfit: number = 0;
  if (origin && dest) {
    exactProfit = estimateExactProfit(origin, dest, entry.cargoType, state);
  }

  const updatedEntry: RouteMarketEntry = {
    ...entry,
    scouted: true,
    exactProfitPerTurn: exactProfit,
  };

  const updatedRouteMarket = state.routeMarket.map((e, idx) =>
    idx === entryIndex ? updatedEntry : e,
  );

  const updatedState: GameState = {
    ...state,
    cash: state.cash - SCOUT_COST_CASH,
    actionPoints: {
      ...state.actionPoints,
      current: state.actionPoints.current - SCOUT_COST_AP,
    },
    routeMarket: updatedRouteMarket,
  };

  return { updatedState, success: true };
}

/**
 * Mark a route market entry as claimed by an AI company.
 * The entry is removed from the market (claimedByAiId set and filtered out on next tick).
 */
export function aiClaimRouteEntry(
  state: GameState,
  entryId: string,
  aiId: string,
): GameState {
  const updatedMarket = state.routeMarket.map((e) =>
    e.id === entryId ? { ...e, claimedByAiId: aiId } : e,
  );

  return {
    ...state,
    routeMarket: updatedMarket.filter((e) => e.claimedByAiId === null),
  };
}

// ---------------------------------------------------------------------------
// Re-export StarSystem type utility (used in tests)
// ---------------------------------------------------------------------------
export type { StarSystem };
