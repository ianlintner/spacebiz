import type {
  GameState,
  RouteMarketEntry,
  RouteRiskTag,
  CargoType,
  Planet,
  StarSystem,
} from "../../data/types.ts";
import {
  CargoType as CargoTypeEnum,
  DiplomaticStatus,
} from "../../data/types.ts";
import {
  ROUTE_MARKET_SIZE,
  ROUTE_MARKET_ENTRY_DURATION,
  SCOUT_COST_AP,
  SCOUT_COST_CASH,
} from "../../data/constants.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import { calculatePrice } from "../economy/PriceCalculator.ts";
import { calculateDistance, calculateTripsPerTurn } from "./RouteManager.ts";
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
 * Estimate profit-per-turn for a route.
 * Uses: trips × capacity (avg cargo shuttle 80) × (destPrice - originPrice)
 * This mirrors the logic used in the route opportunity scanner but simplified
 * to a representative ship (avg cargoCapacity 80, speed 4).
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

  const fuelPerTrip = distance * 2 * 0.8 * state.market.fuelPrice;
  const revenue = trips * representativeCapacity * price;
  const fuelCost = trips * fuelPerTrip;

  return Math.max(0, Math.round((revenue - fuelCost) * 100) / 100);
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

/**
 * Generate a fresh batch of route market entries for the current turn.
 * Only considers O→D pairs where both empires are unlocked by the player.
 * Sets exactProfitPerTurn = null and scouted = false (hidden until scouted).
 */
export function generateRouteMarketEntries(
  state: GameState,
  rng: SeededRNG,
): RouteMarketEntry[] {
  const { planets, systems } = state.galaxy;
  const hyperlanes = state.hyperlanes ?? [];
  const marketSize = getMarketSize(state);

  // Build candidate planet pairs filtered by empire access and hyperlane reachability
  const candidatePairs: Array<{ origin: Planet; dest: Planet }> = [];

  for (const origin of planets) {
    const originEmpireId = getEmpireForPlanet(origin.id, systems, planets);
    if (!originEmpireId || !isEmpireAccessible(originEmpireId, state)) continue;

    for (const dest of planets) {
      if (origin.id === dest.id) continue;

      const destEmpireId = getEmpireForPlanet(dest.id, systems, planets);
      if (!destEmpireId || !isEmpireAccessible(destEmpireId, state)) continue;

      // Skip same-system intra-system pairs (too short for the market)
      if (origin.systemId === dest.systemId) continue;

      // If hyperlanes exist, require a valid path
      if (hyperlanes.length > 0) {
        const dist = routeDistance(origin, dest, state);
        if (dist <= 0 || dist === -1) continue;
      }

      candidatePairs.push({ origin, dest });
    }
  }

  if (candidatePairs.length === 0) {
    return [];
  }

  const entries: RouteMarketEntry[] = [];
  const usedIds = new Set<string>();

  // Try up to marketSize * 5 attempts to fill the market
  const maxAttempts = marketSize * 5;
  let attempts = 0;

  while (entries.length < marketSize && attempts < maxAttempts) {
    attempts++;

    // Pick a random O→D pair
    const pair = rng.pick(candidatePairs);
    const { origin, dest } = pair;

    // Pick a random cargo type that is not embargoed
    const shuffledCargo = [...ALL_CARGO_TYPES];
    rng.shuffle(shuffledCargo);

    let selectedCargo: CargoType | null = null;
    for (const cargoType of shuffledCargo) {
      const originEmpireId = getEmpireForPlanet(origin.id, systems, planets);
      const destEmpireId = getEmpireForPlanet(dest.id, systems, planets);

      if (originEmpireId && destEmpireId && originEmpireId !== destEmpireId) {
        const violation = checkTradePolicyViolation(
          originEmpireId,
          destEmpireId,
          cargoType,
          state.empireTradePolicies,
        );
        if (violation) continue;
      }

      selectedCargo = cargoType;
      break;
    }

    if (!selectedCargo) continue;

    // Avoid exact duplicates within a single generation batch
    const pairKey = `${origin.id}→${dest.id}→${selectedCargo}`;
    if (usedIds.has(pairKey)) continue;
    usedIds.add(pairKey);

    // Compute the hidden exact profit
    const exactProfit = estimateExactProfit(origin, dest, selectedCargo, state);
    if (exactProfit <= 0) continue;

    // Estimated range is ±30% of the real value (hidden noise)
    const estimatedProfitMin = Math.round(exactProfit * 0.7);
    const estimatedProfitMax = Math.round(exactProfit * 1.3);

    // Risk tags
    const riskTags = computeRiskTags(origin, dest, selectedCargo, state);

    const id = `rm-${state.turn}-${entries.length}-${rng.nextInt(0, 999999)}`;

    entries.push({
      id,
      originPlanetId: origin.id,
      destinationPlanetId: dest.id,
      cargoType: selectedCargo,
      estimatedProfitMin,
      estimatedProfitMax,
      exactProfitPerTurn: null, // hidden until scouted
      riskTags,
      scouted: false,
      expiresOnTurn: state.turn + ROUTE_MARKET_ENTRY_DURATION,
      claimedByAiId: null,
    });
  }

  return entries;
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
