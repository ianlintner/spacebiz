import { CargoType, AIPersonality } from "../../../data/types.ts";
import type {
  AICompany,
  GameState,
  ActiveRoute,
  Planet,
  MarketState,
  RouteScope,
} from "../../../data/types.ts";
import {
  AI_MAX_ROUTES,
  AI_PERSONALITY_SLOTS,
  AI_SLOT_GROWTH_INTERVAL,
  ROUTE_OPENING_COST_BY_SCOPE,
  BASE_FREIGHT_CAPACITY,
  BASE_PASSENGER_CAPACITY,
} from "../../../data/constants.ts";
import {
  calculateDistance,
  calculateTripsPerTurn,
  calculateLicenseFee,
  hasDuplicateSystemPairCargo,
  getRouteScope,
} from "../../routes/RouteManager.ts";
import { calculatePrice } from "../../economy/PriceCalculator.ts";
import { getCapacityCostForScope } from "../../fleet/CapacityManager.ts";
import {
  getTotalFreightCapacity,
  getTotalPassengerCapacity,
} from "../../tech/TechEffects.ts";
import type { SeededRNG } from "../../../utils/SeededRNG.ts";

// ---------------------------------------------------------------------------
// AI slot calculation
// ---------------------------------------------------------------------------

export function getAISlotLimit(
  personality: (typeof AIPersonality)[keyof typeof AIPersonality],
  turn: number,
): number {
  const config = AI_PERSONALITY_SLOTS[personality] ?? {
    baseSlots: 4,
    maxSlots: AI_MAX_ROUTES,
  };
  const growth = Math.floor(turn / AI_SLOT_GROWTH_INTERVAL);
  return Math.min(config.baseSlots + growth, config.maxSlots);
}

// ---------------------------------------------------------------------------
// Capacity helpers
// ---------------------------------------------------------------------------

/**
 * Get the total freight capacity for an AI company.
 * Uses tech state if available, otherwise falls back to base capacity.
 */
function getAIFreightCapacity(company: AICompany): number {
  if (company.techState) {
    return getTotalFreightCapacity(company.techState);
  }
  return BASE_FREIGHT_CAPACITY;
}

/**
 * Get the total passenger capacity for an AI company.
 * Uses tech state if available, otherwise falls back to base capacity.
 */
function getAIPassengerCapacity(company: AICompany): number {
  if (company.techState) {
    return getTotalPassengerCapacity(company.techState);
  }
  return BASE_PASSENGER_CAPACITY;
}

/**
 * Compute freight capacity units currently consumed by the company's active routes.
 */
function getUsedFreightCapacity(
  routes: ActiveRoute[],
  state: GameState,
): number {
  return routes
    .filter((r) => !r.paused && r.cargoType !== CargoType.Passengers)
    .reduce((sum, r) => {
      const scope = getRouteScope(r, state);
      return sum + getCapacityCostForScope(scope);
    }, 0);
}

/**
 * Compute passenger capacity units currently consumed by the company's active routes.
 */
function getUsedPassengerCapacity(
  routes: ActiveRoute[],
  state: GameState,
): number {
  return routes
    .filter((r) => !r.paused && r.cargoType === CargoType.Passengers)
    .reduce((sum, r) => {
      const scope = getRouteScope(r, state);
      return sum + getCapacityCostForScope(scope);
    }, 0);
}

// ---------------------------------------------------------------------------
// AI decision-making
// ---------------------------------------------------------------------------

export interface DecisionResult {
  routes: ActiveRoute[];
  cash: number;
}

export function makeAIDecisions(
  company: AICompany,
  routes: ActiveRoute[],
  cash: number,
  state: GameState,
  market: MarketState,
  rng: SeededRNG,
): DecisionResult {
  let currentRoutes = routes;
  let currentCash = cash;

  // ── Abandon routes that no longer have capacity headroom ──
  // (This can happen if tech is downgraded or routes were inherited from
  //  a replaced bankrupt company with a smaller capacity pool.)
  // We keep as many routes as our capacity allows, dropping lowest-profit first.
  const totalFC = getAIFreightCapacity(company);
  const totalPC = getAIPassengerCapacity(company);

  // Sort routes: keep higher-profit (longer-distance) ones — drop cheap ones first
  const freightRoutes = currentRoutes.filter(
    (r) => r.cargoType !== CargoType.Passengers,
  );
  const passengerRoutes = currentRoutes.filter(
    (r) => r.cargoType === CargoType.Passengers,
  );

  // Trim freight routes to capacity
  let usedFC = 0;
  const keptFreight: ActiveRoute[] = [];
  for (const r of freightRoutes.sort((a, b) => b.distance - a.distance)) {
    const scope = getRouteScope(r, state);
    const cost = getCapacityCostForScope(scope);
    if (usedFC + cost <= totalFC * 1.5) {
      // Allow up to 150% for existing routes (only cap new additions strictly)
      keptFreight.push(r);
      usedFC += cost;
    }
  }

  // Trim passenger routes to capacity
  let usedPC = 0;
  const keptPassenger: ActiveRoute[] = [];
  for (const r of passengerRoutes.sort((a, b) => b.distance - a.distance)) {
    const scope = getRouteScope(r, state);
    const cost = getCapacityCostForScope(scope);
    if (usedPC + cost <= totalPC * 1.5) {
      keptPassenger.push(r);
      usedPC += cost;
    }
  }

  currentRoutes = [...keptFreight, ...keptPassenger];

  // ── Open routes (may open multiple per turn) ──
  const aiSlotLimit = getAISlotLimit(company.personality, state.turn);
  let routeAttempts = 0;
  const maxRouteAttempts = 2;
  while (
    currentRoutes.length < aiSlotLimit &&
    routeAttempts < maxRouteAttempts
  ) {
    const routeResult = openAIRoute(
      company,
      currentRoutes,
      state,
      market,
      currentCash,
      rng,
    );
    if (!routeResult) break;

    currentRoutes = routeResult.routes;
    currentCash -= routeResult.openingCost;
    routeAttempts++;
  }

  return { routes: currentRoutes, cash: currentCash };
}

// ---------------------------------------------------------------------------
// Route opening logic
// ---------------------------------------------------------------------------

function openAIRoute(
  company: AICompany,
  existingRoutes: ActiveRoute[],
  state: GameState,
  market: MarketState,
  cash: number,
  rng: SeededRNG,
): { routes: ActiveRoute[]; openingCost: number } | null {
  const planets = state.galaxy.planets;
  const systems = state.galaxy.systems;
  const empires = state.galaxy.empires;

  // Find planets in AI's home empire
  const homeSystems = new Set(
    systems.filter((s) => s.empireId === company.empireId).map((s) => s.id),
  );
  const homePlanets = planets.filter((p) => homeSystems.has(p.systemId));

  // Based on personality, choose candidate destinations
  let candidateOrigins: Planet[];
  let candidateDestinations: Planet[];

  switch (company.personality) {
    case AIPersonality.SteadyHauler:
      // Prefer home empire origins, but look at all destinations
      candidateOrigins = homePlanets;
      candidateDestinations = planets;
      break;

    case AIPersonality.CherryPicker:
      // Look everywhere for best margins
      candidateOrigins = homePlanets.length > 0 ? homePlanets : planets;
      candidateDestinations = planets;
      break;

    case AIPersonality.AggressiveExpander:
    default:
      // Expand broadly
      candidateOrigins = homePlanets.length > 0 ? homePlanets : planets;
      candidateDestinations = planets;
      break;
  }

  if (candidateOrigins.length === 0 || candidateDestinations.length === 0) {
    return null;
  }

  // Current capacity usage
  const totalFC = getAIFreightCapacity(company);
  const totalPC = getAIPassengerCapacity(company);
  const usedFC = getUsedFreightCapacity(existingRoutes, state);
  const usedPC = getUsedPassengerCapacity(existingRoutes, state);

  // AI can go up to 120% capacity when opening new routes (slightly aggressive)
  const maxFC = totalFC * 1.2;
  const maxPC = totalPC * 1.2;

  // Score candidate routes
  const existingRouteKeys = new Set(
    existingRoutes.map((r) => `${r.originPlanetId}→${r.destinationPlanetId}`),
  );

  const cargoTypes = Object.values(
    CargoType,
  ) as (typeof CargoType)[keyof typeof CargoType][];
  let bestProfit = -Infinity;
  let bestRoute: {
    origin: Planet;
    dest: Planet;
    cargoType: (typeof CargoType)[keyof typeof CargoType];
    distance: number;
    profit: number;
    scope: RouteScope;
    openingCost: number;
  } | null = null;

  // Sample routes (don't evaluate all — too expensive for AI)
  const sampleSize = Math.min(candidateOrigins.length, 12);
  const sampledOrigins = rng
    .shuffle([...candidateOrigins])
    .slice(0, sampleSize);
  const destSampleSize = Math.min(candidateDestinations.length, 12);
  const sampledDests = rng
    .shuffle([...candidateDestinations])
    .slice(0, destSampleSize);

  for (const origin of sampledOrigins) {
    for (const dest of sampledDests) {
      if (origin.id === dest.id) continue;
      if (origin.systemId === dest.systemId) continue;
      const key = `${origin.id}→${dest.id}`;
      if (existingRouteKeys.has(key)) continue;

      const destMarket = market.planetMarkets[dest.id];
      if (!destMarket) continue;

      // Calculate distance (uses hyperlane routing when available)
      const distance = calculateDistance(
        origin,
        dest,
        systems,
        state.hyperlanes,
        state.borderPorts,
      );
      if (distance < 1 || distance === -1) continue;

      // Determine scope for this route pair
      const tempRoute: ActiveRoute = {
        id: "temp",
        originPlanetId: origin.id,
        destinationPlanetId: dest.id,
        distance,
        cargoType: null,
      };
      const scope = getRouteScope(tempRoute, state);
      const capacityCost = getCapacityCostForScope(scope);
      const openingCost =
        ROUTE_OPENING_COST_BY_SCOPE[scope] ??
        calculateLicenseFee(distance, existingRoutes.length);

      // Find best cargo for this route
      for (const cargoType of cargoTypes) {
        // Per spec §5.1: each AI applies the slot rule against its own routes independently.
        if (
          hasDuplicateSystemPairCargo(
            existingRoutes,
            planets,
            origin.systemId,
            dest.systemId,
            cargoType,
          )
        )
          continue;

        const isPassenger = cargoType === CargoType.Passengers;

        // Check capacity for this cargo type
        if (isPassenger) {
          if (usedPC + capacityCost > maxPC) continue;
        } else {
          if (usedFC + capacityCost > maxFC) continue;
        }

        // Check opening cost affordability
        if (cash < openingCost) continue;

        const entry = destMarket[cargoType];
        const price = calculatePrice(entry, cargoType);

        // Standardized capacity (matches TurnSimulator capacity-pool model)
        const baseCapacity = isPassenger ? 60 : 80;
        const baseSpeed = isPassenger ? 5 : 4;
        const trips = calculateTripsPerTurn(distance, baseSpeed);
        const revenue = trips * baseCapacity * price;
        const fuelCost = capacityCost * 2 * market.fuelPrice * trips;

        // Estimate tariff
        const originSystem = systems.find((s) => s.id === origin.systemId);
        const destSystem = systems.find((s) => s.id === dest.systemId);
        let tariff = 0;
        if (
          originSystem &&
          destSystem &&
          originSystem.empireId !== destSystem.empireId
        ) {
          const destEmpire = empires.find((e) => e.id === destSystem.empireId);
          if (destEmpire) {
            tariff = revenue * destEmpire.tariffRate;
          }
        }

        const profit = revenue - fuelCost - tariff;
        if (profit > bestProfit) {
          bestProfit = profit;
          bestRoute = {
            origin,
            dest,
            cargoType,
            distance,
            profit,
            scope,
            openingCost,
          };
        }
      }
    }
  }

  // Accept profitable routes always. CherryPickers require higher profit margins.
  const isCherryPicker = company.personality === AIPersonality.CherryPicker;
  const profitFloor = isCherryPicker ? 200 : 0;

  if (!bestRoute || bestRoute.profit <= profitFloor) return null;

  const newRoute: ActiveRoute = {
    id: `${company.id}-route-${existingRoutes.length}-${rng.nextInt(0, 9999)}`,
    originPlanetId: bestRoute.origin.id,
    destinationPlanetId: bestRoute.dest.id,
    distance: bestRoute.distance,
    cargoType: bestRoute.cargoType,
  };

  return {
    routes: [...existingRoutes, newRoute],
    openingCost: bestRoute.openingCost,
  };
}
