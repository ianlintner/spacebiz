import { CargoType } from "../../../data/types.ts";
import type {
  AICompany,
  GameState,
  MarketState,
  CargoType as CargoTypeT,
  TechState,
} from "../../../data/types.ts";
import { CAPACITY_COST_BY_SCOPE } from "../../../data/constants.ts";
import {
  getRouteScope,
  getScopeDemandMultiplier,
} from "../../routes/RouteManager.ts";
import { calculatePrice } from "../../economy/PriceCalculator.ts";
import { calculateTariff } from "../../routes/TariffCalculator.ts";
import type { SeededRNG } from "../../../utils/SeededRNG.ts";
import { isRouteGrounded } from "../../events/EventEngine.ts";
import { applyAIHubBonuses } from "./aiHubStep.ts";
import { computeRouteOperatingCost } from "../../fleet/CapacityManager.ts";
import {
  getFreightHullMark,
  getPassengerHullMark,
} from "../../tech/TechEffects.ts";

const DEFAULT_TECH_STATE: TechState = {
  purchaseCount: {},
  completedTechIds: [],
  queue: [],
  researchPoints: 0,
  currentResearchId: null,
  researchProgress: 0,
};

// ---------------------------------------------------------------------------
// Route simulation for one AI company (capacity-pool model)
// ---------------------------------------------------------------------------

export interface AIRouteResult {
  revenue: number;
  fuelCost: number;
  tariffCost: number;
  totalCargo: number;
  deliveries: Map<string, Map<CargoTypeT, number>>;
}

/**
 * Simulate all active routes for one AI company for one turn.
 *
 * Uses the same capacity-pool model as TurnSimulator (no per-ship simulation).
 * Revenue is based on standardized base capacities (80 freight / 60 passenger)
 * and scope demand multipliers, keeping AI and player on a single economy.
 */
export function simulateAIRoutes(
  company: AICompany,
  state: GameState,
  market: MarketState,
  rng: SeededRNG,
): AIRouteResult {
  // rng is accepted for API compatibility (future breakdown checks, etc.)
  void rng;

  let totalRevenue = 0;
  let totalFuelCost = 0;
  let totalTariffCost = 0;
  let totalCargo = 0;

  const deliveries = new Map<string, Map<CargoTypeT, number>>();

  for (const route of company.activeRoutes) {
    if (!route.cargoType) continue;
    if (route.paused) continue;

    // Skip grounded routes (embargoes, blockades, border closures)
    const grounded = isRouteGrounded(
      route,
      state.activeEvents,
      state.galaxy.systems,
      state.galaxy.planets,
    );
    if (grounded) continue;

    const scope = getRouteScope(route, state);
    const isPassengers = route.cargoType === CargoType.Passengers;

    // Standardized base capacity (matches TurnSimulator's capacity-pool model).
    // Bumped 10x from the old 60/80 baseline to compensate for removal of the
    // trips-by-distance multiplier. Fixed trips=1 per turn for parity with
    // the player simulator.
    const baseCapacity = isPassengers ? 600 : 800;
    const trips = 1;

    const destMarket = market.planetMarkets[route.destinationPlanetId];
    if (!destMarket) continue;

    const destEntry = destMarket[route.cargoType];
    const price = calculatePrice(destEntry, route.cargoType);

    const moved = baseCapacity * trips;

    // Scope multiplier IS the distance sensitivity (cargo-type-aware).
    const revenueMultiplier = getScopeDemandMultiplier(route.cargoType, scope);

    let revenue = price * moved * revenueMultiplier;

    // Fuel cost: scope-cost-based (matches TurnSimulator). trips=1, so the
    // multiplier is implicit.
    const scopeCost = CAPACITY_COST_BY_SCOPE[scope] ?? 1;
    let fuelCost = scopeCost * 2 * market.fuelPrice;

    // Apply AI hub bonuses to route economics
    const hubBonuses = applyAIHubBonuses(revenue, fuelCost, 0, company.aiHub);
    revenue = hubBonuses.revenue;
    fuelCost = hubBonuses.fuel;

    // Per-turn operating cost (spec §5): 3000 × distanceBand × hullEfficiencyMultiplier
    const techState = company.techState ?? DEFAULT_TECH_STATE;
    const hullMark = isPassengers
      ? getPassengerHullMark(techState)
      : getFreightHullMark(techState);
    const operatingCost = computeRouteOperatingCost(scope, hullMark);
    fuelCost += operatingCost;

    // Tariff
    const tariff = calculateTariff(
      route,
      revenue,
      company.empireId,
      state.galaxy.systems,
      state.galaxy.empires,
    );

    totalRevenue += revenue;
    totalFuelCost += fuelCost;
    totalTariffCost += tariff;
    totalCargo += moved;

    // Track deliveries for saturation
    if (moved > 0) {
      if (!deliveries.has(route.destinationPlanetId)) {
        deliveries.set(route.destinationPlanetId, new Map());
      }
      const planetMap = deliveries.get(route.destinationPlanetId)!;
      const prev = planetMap.get(route.cargoType) ?? 0;
      planetMap.set(route.cargoType, prev + moved);
    }
  }

  return {
    revenue: totalRevenue,
    fuelCost: totalFuelCost,
    tariffCost: totalTariffCost,
    totalCargo,
    deliveries,
  };
}

// ---------------------------------------------------------------------------
// Apply AI saturation to market
// ---------------------------------------------------------------------------

export function applyAISaturation(
  market: MarketState,
  deliveries: Map<string, Map<CargoTypeT, number>>,
): MarketState {
  const updatedMarkets = { ...market.planetMarkets };

  for (const [planetId, cargoMap] of deliveries) {
    if (!updatedMarkets[planetId]) continue;
    const planetMarket = { ...updatedMarkets[planetId] };

    for (const [cargoType, amount] of cargoMap) {
      const entry = planetMarket[cargoType];
      if (!entry) continue;

      const saturationIncrease = amount / (entry.baseDemand * 5);
      planetMarket[cargoType] = {
        ...entry,
        saturation: Math.min(
          1,
          Math.max(0, entry.saturation + saturationIncrease),
        ),
      };
    }

    updatedMarkets[planetId] = planetMarket;
  }

  return { ...market, planetMarkets: updatedMarkets };
}
