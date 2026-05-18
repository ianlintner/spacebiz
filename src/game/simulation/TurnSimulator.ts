import { CargoType } from "../../data/types.ts";
import type {
  GameState,
  ActiveRoute,
  TurnResult,
  RoutePerformance,
  CargoType as CargoTypeT,
  Loan,
} from "../../data/types.ts";
import { buildTurnBrief } from "../turn/TurnBriefBuilder.ts";
import { evaluateNavUnlocks } from "../nav/NavUnlocks.ts";
import {
  HULL_REVENUE_MULT,
  CAPACITY_COST_BY_SCOPE,
} from "../../data/constants.ts";
import { RouteScope } from "../../data/types.ts";
import {
  getRouteScope,
  getScopeDemandMultiplier,
} from "../routes/RouteManager.ts";
import { calculatePrice } from "../economy/PriceCalculator.ts";
import { updateMarket } from "../economy/MarketUpdater.ts";
import { getActiveProducers } from "../economy/IndustryChain.ts";
import { calculateTariff } from "../routes/TariffCalculator.ts";
import {
  selectEvents,
  applyEventEffects,
  tickEvents,
  isRouteGrounded,
  calculateMothballFee,
  getRouteSpeedModifier,
  isPassengerRouteBlocked,
} from "../events/EventEngine.ts";
import { applyCharterTurn } from "../charters/CharterManager.ts";
import {
  processCharterAuctionsTurn,
  pruneResolvedAuctions,
} from "../charters/CharterAuction.ts";
import {
  tickEventChains,
  checkChainTriggers,
} from "../events/ChoiceEventResolver.ts";
import type { GameEvent } from "../../data/types.ts";
import {
  updateStorytellerState,
  selectDilemma,
  recordDilemmaFired,
} from "../events/Storyteller.ts";
import { generateTurnMessages } from "../adviser/AdviserEngine.ts";
import { generateRivalMessages } from "../rivals/RivalMessageGenerator.ts";
import { simulateAITurns } from "../ai/AISimulator.ts";
import { processContracts } from "../contracts/ContractManager.ts";
import {
  expireAvailableContracts,
  generateContracts,
} from "../contracts/ContractGenerator.ts";
import { calculateRPPerTurn, processResearch } from "../tech/TechTree.ts";
import {
  getFuelMultiplier,
  getRevenueMultiplier,
} from "../tech/TechEffects.ts";
import {
  getCapacityCostForScope,
  computeOvercapacityFactors,
  computeRouteOperatingCost,
  computeUtilization,
} from "../fleet/CapacityManager.ts";
import {
  getFreightHullMark,
  getPassengerHullMark,
  getTotalFreightCapacity,
  getTotalPassengerCapacity,
} from "../tech/TechEffects.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";
import { rosterTick } from "../../generation/news/universeRoster.ts";
import { processDiplomacyTurn } from "../empire/DiplomacyManager.ts";
import { getHubUpkeep } from "../hub/HubManager.ts";
import {
  getRPBonus,
  getTariffMultiplier,
  getSaturationMultiplier,
} from "../hub/HubBonusCalculator.ts";
import { tickRouteMarket } from "../routes/RouteMarket.ts";
import {
  tickPopulation,
  type PopulationTickState,
} from "../economy/PopulationLoop.ts";
import { computeCompanyBonuses } from "../economy/CompanyBonusCalculator.ts";
import type { SpecialId } from "../../data/types.ts";
import { computeReputationTier } from "../reputation/ReputationEffects.ts";
import { processQueuedDiplomacyActions } from "../diplomacy/DiplomacyResolver.ts";
import { selectDiplomacyOffer } from "../diplomacy/DiplomacyAI.ts";
import { tickDiplomacyState } from "../diplomacy/DiplomacyTick.ts";

const MAX_TURN_REPORT_WORLD_LINES = 8;
const ROSTER_HISTORY_MAX = 10;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Score a dilemma's intensity (0–4 scale) for storyteller pacing.
 * Heuristic: take the largest scaled-cash hit across all options, normalized
 * against starting cash. Bigger swings = bigger intensity = longer cooldown.
 */
function computeDilemmaIntensity(event: {
  options: Array<{ effects: Array<{ type: string; value?: number }> }>;
}): number {
  let maxMagnitude = 0;
  for (const opt of event.options) {
    for (const eff of opt.effects) {
      if (eff.type === "modifyCash" && typeof eff.value === "number") {
        maxMagnitude = Math.max(maxMagnitude, Math.abs(eff.value));
      } else if (
        eff.type === "modifyReputation" &&
        typeof eff.value === "number"
      ) {
        // 1 rep ≈ §200 of intensity for normalization purposes
        maxMagnitude = Math.max(maxMagnitude, Math.abs(eff.value) * 200);
      }
    }
  }
  // §0–§15k → 0–3 intensity, §15k+ → 3–4
  if (maxMagnitude < 15000) return maxMagnitude / 5000;
  return Math.min(4, 3 + (maxMagnitude - 15000) / 15000);
}

/** Extract system ID from planet ID: "planet-{si}-{syi}-{pi}" → "system-{si}-{syi}" */
function planetToSystemId(planetId: string): string | null {
  const parts = planetId.split("-");
  if (parts.length >= 4 && parts[0] === "planet") {
    return `system-${parts[1]}-${parts[2]}`;
  }
  return null;
}

interface RouteSimResult {
  revenue: number;
  fuelCost: number;
  operatingCost: number;
  cargoMoved: number;
  passengersMoved: number;
  trips: number;
  breakdowns: number;
}

/**
 * Simulate a route for one turn using the capacity-pool model.
 * No per-ship simulation — revenue and costs are derived from hull marks,
 * utilization factors, and scope-based formulas.
 */
function simulateRoute(
  route: ActiveRoute,
  state: GameState,
  rng: SeededRNG,
  activeEvents: GameEvent[],
  freightHullMark: 1 | 2 | 3 | 4 | 5,
  passengerHullMark: 1 | 2 | 3 | 4 | 5,
  freightOvercrowding: { revenueMultiplier: number; costMultiplier: number },
  passengerOvercrowding: { revenueMultiplier: number; costMultiplier: number },
  cubicSoftener: number,
  restraintBonusFreight: number,
  restraintBonusPassenger: number,
  hasAI5MkVSynergy: boolean,
): RouteSimResult {
  if (!route.cargoType) {
    return {
      revenue: 0,
      fuelCost: 0,
      operatingCost: 0,
      cargoMoved: 0,
      passengersMoved: 0,
      trips: 0,
      breakdowns: 0,
    };
  }

  const scope = getRouteScope(route, state);
  const isPassenger = route.cargoType === CargoType.Passengers;
  const hullMark = isPassenger ? passengerHullMark : freightHullMark;
  const hullRevMult = HULL_REVENUE_MULT[hullMark];
  const overcrowding = isPassenger
    ? passengerOvercrowding
    : freightOvercrowding;
  const adjustedCostMult =
    1 + (overcrowding.costMultiplier - 1) * cubicSoftener;
  const restraintBonus = isPassenger
    ? restraintBonusPassenger
    : restraintBonusFreight;
  const galacticSynergy =
    hasAI5MkVSynergy && scope === RouteScope.Galactic ? 1.1 : 1.0;

  // Fixed 1 trip per turn — distance sensitivity now lives in the scope-demand
  // multiplier table (see SCOPE_DEMAND_MULTIPLIERS in constants.ts). The
  // speed modifier from events (solar storms, etc.) still reduces throughput;
  // effectiveTrips is now a [0, 1+] multiplier rather than a trip count.
  const speedMod = getRouteSpeedModifier(activeEvents, route);
  const effectiveTrips = Math.max(0, speedMod);

  // Breakdown: random chance when overcrowding cost is severe (> 50% above normal)
  const overcrowdingFactor = Math.max(0, overcrowding.costMultiplier - 1);
  const breakdownChance =
    overcrowdingFactor > 0.5 ? (overcrowdingFactor - 0.5) * 0.4 : 0;
  const brokeDown = breakdownChance > 0 && rng.chance(breakdownChance);

  if (brokeDown) {
    const scopeCost = CAPACITY_COST_BY_SCOPE[scope] ?? 1;
    const fuelCost = scopeCost * state.market.fuelPrice;
    const operatingCost =
      computeRouteOperatingCost(scope, hullMark) * adjustedCostMult;
    return {
      revenue: 0,
      fuelCost: Math.round(fuelCost * 100) / 100,
      operatingCost: Math.round(operatingCost * 100) / 100,
      cargoMoved: 0,
      passengersMoved: 0,
      trips: 0,
      breakdowns: 1,
    };
  }

  // No market data → no revenue, still pay operating costs
  const destMarket = state.market.planetMarkets[route.destinationPlanetId];
  if (!destMarket) {
    const operatingCost =
      computeRouteOperatingCost(scope, hullMark) * adjustedCostMult;
    return {
      revenue: 0,
      fuelCost: 0,
      operatingCost: Math.round(operatingCost * 100) / 100,
      cargoMoved: 0,
      passengersMoved: 0,
      trips: effectiveTrips,
      breakdowns: 0,
    };
  }

  // Quarantine blocks passenger routes
  if (isPassenger && isPassengerRouteBlocked(activeEvents, route)) {
    const scopeCost = CAPACITY_COST_BY_SCOPE[scope] ?? 1;
    const fuelMultiplier = getFuelMultiplier(state);
    const fuelCost =
      scopeCost * 2 * state.market.fuelPrice * effectiveTrips * fuelMultiplier;
    const operatingCost =
      computeRouteOperatingCost(scope, hullMark) * adjustedCostMult;
    return {
      revenue: 0,
      fuelCost: Math.round(fuelCost * 100) / 100,
      operatingCost: Math.round(operatingCost * 100) / 100,
      cargoMoved: 0,
      passengersMoved: 0,
      trips: effectiveTrips,
      breakdowns: 0,
    };
  }

  const destEntry = destMarket[route.cargoType];
  const price = calculatePrice(destEntry, route.cargoType);

  // Base capacity per route type (standardized). Bumped 10x from the old
  // 60/80 baseline to compensate for the removal of the trips-by-distance
  // multiplier (formerly clamped to ~10 trips/turn for most routes).
  const baseCapacity = isPassenger ? 600 : 800;
  const totalMoved = baseCapacity * effectiveTrips;

  // Scope multiplier IS the distance sensitivity now (cargo-type-aware).
  const revenueMultiplier = getScopeDemandMultiplier(route.cargoType, scope);

  const revenueModifier = getRevenueMultiplier(state);
  const rawRevenue =
    price *
    totalMoved *
    revenueMultiplier *
    hullRevMult *
    overcrowding.revenueMultiplier *
    restraintBonus *
    galacticSynergy *
    revenueModifier;

  // Fuel cost: scope-cost-based (replaces per-ship fuelEfficiency)
  const scopeCost = CAPACITY_COST_BY_SCOPE[scope] ?? 1;
  const fuelMultiplier = getFuelMultiplier(state);
  const fuelCost =
    scopeCost * 2 * state.market.fuelPrice * effectiveTrips * fuelMultiplier;

  // Operating cost per route per turn
  const operatingCost =
    computeRouteOperatingCost(scope, hullMark) * adjustedCostMult;

  return {
    revenue: Math.round(rawRevenue * 100) / 100,
    fuelCost: Math.round(fuelCost * 100) / 100,
    operatingCost: Math.round(operatingCost * 100) / 100,
    cargoMoved: isPassenger ? 0 : totalMoved,
    passengersMoved: isPassenger ? totalMoved : 0,
    trips: effectiveTrips,
    breakdowns: 0,
  };
}

/**
 * Update saturation at destination planets based on cargo delivered.
 */
function updateSaturation(
  state: GameState,
  deliveries: Map<string, Map<CargoTypeT, number>>,
): GameState {
  const updatedMarkets = { ...state.market.planetMarkets };

  for (const [planetId, cargoMap] of deliveries) {
    if (!updatedMarkets[planetId]) continue;

    const planetMarket = { ...updatedMarkets[planetId] };

    for (const [cargoType, amount] of cargoMap) {
      const entry = planetMarket[cargoType];
      if (!entry) continue;

      // Hub CargoWarehouse reduces saturation buildup in nearby systems
      const sysId = planetToSystemId(planetId);
      const satMult = sysId
        ? getSaturationMultiplier(
            state.stationHub,
            sysId,
            state.hyperlanes ?? [],
          )
        : 1.0;

      const saturationIncrease = (amount / (entry.baseDemand * 5)) * satMult;
      const newSaturation = Math.min(
        1,
        Math.max(0, entry.saturation + saturationIncrease),
      );

      planetMarket[cargoType] = {
        ...entry,
        saturation: newSaturation,
      };
    }

    updatedMarkets[planetId] = planetMarket;
  }

  return {
    ...state,
    market: {
      ...state.market,
      planetMarkets: updatedMarkets,
    },
  };
}

/**
 * Process loan interest payments. Returns updated loans and total interest paid.
 */
function processLoans(loans: Loan[]): {
  updatedLoans: Loan[];
  totalInterest: number;
} {
  let totalInterest = 0;

  const updatedLoans = loans.map((loan) => {
    const interest = loan.remainingBalance * loan.interestRate;
    totalInterest += interest;
    return {
      ...loan,
      remainingBalance: loan.remainingBalance + interest,
    };
  });

  return { updatedLoans, totalInterest: Math.round(totalInterest * 100) / 100 };
}

/**
 * Check if the player has gone bankrupt.
 * Bankruptcy: cash < 0 and turnsInDebt >= 2.
 */
function checkBankruptcy(cash: number, turnsInDebt: number): boolean {
  if (cash >= 0) return false;
  return turnsInDebt >= 2;
}

function appendTurnReportLines(state: GameState, lines: string[]): GameState {
  if (lines.length === 0) return state;
  const prevDigest = state.turnReport?.diplomacyDigest ?? [];
  return {
    ...state,
    turnReport: {
      ...(state.turnReport ?? {}),
      diplomacyDigest: [...prevDigest, ...lines].slice(
        -MAX_TURN_REPORT_WORLD_LINES,
      ),
    },
  };
}

// ---------------------------------------------------------------------------
// Main simulation function
// ---------------------------------------------------------------------------

/**
 * Simulate one turn of the game. Pure function — returns a new GameState
 * without mutating the input.
 */
export function simulateTurn(state: GameState, rng: SeededRNG): GameState {
  let nextState: GameState = { ...state, turnReport: {} };

  // ----- Step 1: Compute fleet capacity and utilization -----
  const freightHullMark = getFreightHullMark(nextState.tech);
  const passengerHullMark = getPassengerHullMark(nextState.tech);
  const totalFC = getTotalFreightCapacity(nextState.tech);
  const totalPC = getTotalPassengerCapacity(nextState.tech);

  let usedFC = 0;
  let usedPC = 0;
  for (const route of nextState.activeRoutes) {
    if (route.paused) continue;
    const scope = getRouteScope(route, nextState);
    const cost = getCapacityCostForScope(scope);
    if (route.cargoType === CargoType.Passengers) usedPC += cost;
    else usedFC += cost;
  }

  const freightUtil = computeUtilization(usedFC, totalFC);
  const passengerUtil = computeUtilization(usedPC, totalPC);
  const freightOvercrowding = computeOvercapacityFactors(freightUtil);
  const passengerOvercrowding = computeOvercapacityFactors(passengerUtil);

  // Logistics AI 4 softens the cubic overcrowding cost curve
  const hasLogisticsAI4 =
    (nextState.tech.purchaseCount["logistics_ai_4"] ?? 0) > 0;
  const cubicSoftener = hasLogisticsAI4 ? 0.8 : 1.0;

  // Logistics AI 2 grants a revenue bonus when utilization ≤ 80%
  const hasLogisticsAI2 =
    (nextState.tech.purchaseCount["logistics_ai_2"] ?? 0) > 0;
  const freightRestraintBonus =
    hasLogisticsAI2 && freightUtil <= 0.8 ? 1.05 : 1.0;
  const passengerRestraintBonus =
    hasLogisticsAI2 && passengerUtil <= 0.8 ? 1.05 : 1.0;

  // Logistics AI 5 + Freight Hull Mk V galactic synergy
  const hasAI5MkVSynergy =
    (nextState.tech.purchaseCount["logistics_ai_5"] ?? 0) > 0 &&
    freightHullMark === 5;

  // ----- Step 2: Route simulation (revenue, fuel, operating costs) -----
  let totalRevenue = 0;
  let totalFuelCosts = 0;
  let totalOperatingCosts = 0;
  let totalPassengers = 0;
  let totalMothballFees = 0;
  const cargoDelivered: Record<CargoTypeT, number> = {
    [CargoType.Passengers]: 0,
    [CargoType.RawMaterials]: 0,
    [CargoType.Food]: 0,
    [CargoType.Technology]: 0,
    [CargoType.Luxury]: 0,
    [CargoType.Hazmat]: 0,
    [CargoType.Medical]: 0,
  };
  const routePerformances: RoutePerformance[] = [];

  // Track deliveries per planet per cargo type for saturation
  const deliveriesByPlanet = new Map<string, Map<CargoTypeT, number>>();

  for (const route of nextState.activeRoutes) {
    // Player-paused routes skip the simulation entirely — no revenue, no fuel
    // burn, no mothball fee. The slot and license fee stay paid so the route
    // can be resumed without re-buying the slot.
    if (route.paused) {
      continue;
    }

    // Check if route is grounded by events (embargo, blockade, etc.)
    const grounded = isRouteGrounded(
      route,
      nextState.activeEvents,
      nextState.galaxy.systems,
      nextState.galaxy.planets,
    );

    if (grounded) {
      // Grounded routes generate no revenue; charge mothball fee instead
      const mothballFee = calculateMothballFee(
        route,
        nextState.activeEvents,
        nextState.galaxy.systems,
        nextState.galaxy.planets,
        nextState,
      );
      totalMothballFees += mothballFee;
      routePerformances.push({
        routeId: route.id,
        trips: 0,
        revenue: 0,
        fuelCost: 0,
        cargoMoved: 0,
        passengersMoved: 0,
        breakdowns: 0,
      });
      continue;
    }

    const result = simulateRoute(
      route,
      nextState,
      rng,
      nextState.activeEvents,
      freightHullMark,
      passengerHullMark,
      freightOvercrowding,
      passengerOvercrowding,
      cubicSoftener,
      freightRestraintBonus,
      passengerRestraintBonus,
      hasAI5MkVSynergy,
    );

    totalRevenue += result.revenue;
    totalFuelCosts += result.fuelCost;
    totalOperatingCosts += result.operatingCost;
    totalPassengers += result.passengersMoved;

    // Track cargo delivered by type
    if (route.cargoType) {
      if (route.cargoType === CargoType.Passengers) {
        cargoDelivered[CargoType.Passengers] += result.passengersMoved;
      } else {
        cargoDelivered[route.cargoType] += result.cargoMoved;
      }

      // Track for saturation update
      const totalDelivered = result.cargoMoved + result.passengersMoved;
      if (totalDelivered > 0) {
        if (!deliveriesByPlanet.has(route.destinationPlanetId)) {
          deliveriesByPlanet.set(route.destinationPlanetId, new Map());
        }
        const planetMap = deliveriesByPlanet.get(route.destinationPlanetId)!;
        const prev = planetMap.get(route.cargoType) ?? 0;
        planetMap.set(route.cargoType, prev + totalDelivered);
      }
    }

    routePerformances.push({
      routeId: route.id,
      trips: result.trips,
      revenue: result.revenue,
      fuelCost: result.fuelCost,
      cargoMoved: result.cargoMoved,
      passengersMoved: result.passengersMoved,
      breakdowns: result.breakdowns,
    });
  }

  // ----- Step 2b: Calculate tariff costs for player routes -----
  let totalTariffCosts = 0;
  for (const rp of routePerformances) {
    if (rp.revenue <= 0) continue;
    const route = nextState.activeRoutes.find((r) => r.id === rp.routeId);
    if (!route) continue;
    const tariff = calculateTariff(
      route,
      rp.revenue,
      nextState.playerEmpireId,
      nextState.galaxy.systems,
      nextState.galaxy.empires,
      nextState.reputation,
      nextState.diplomaticRelations,
    );
    totalTariffCosts += tariff;
  }
  totalTariffCosts *= getTariffMultiplier(nextState.stationHub);
  totalTariffCosts = Math.round(totalTariffCosts * 100) / 100;

  // ----- Step 3: Update saturation at destination planets -----
  nextState = updateSaturation(nextState, deliveriesByPlanet);

  // ----- Step 4b: Hub upkeep -----
  const hubUpkeep = nextState.stationHub
    ? getHubUpkeep(nextState.stationHub)
    : 0;

  // ----- Step 4b2: Charter auction driver (AI bids + resolution) -----
  // Run BEFORE charter upkeep so a player who just won a fixed-term charter
  // doesn't immediately face an upkeep tick (fixed-term has no upkeep anyway,
  // but order keeps semantics clean). Pure — caller applies the partial state.
  const auctionTurn = processCharterAuctionsTurn(nextState);
  if (
    auctionTurn.playerRefund > 0 ||
    auctionTurn.resolvedAuctionIds.length > 0 ||
    auctionTurn.activeAuctions !== (nextState.activeAuctions ?? [])
  ) {
    nextState = {
      ...nextState,
      activeAuctions: pruneResolvedAuctions(
        auctionTurn.activeAuctions,
        nextState.turn,
      ),
      galaxy: { ...nextState.galaxy, empires: auctionTurn.empires },
      charters: auctionTurn.playerCharters,
      aiCompanies: auctionTurn.aiCompanies,
      cash: nextState.cash + auctionTurn.playerRefund,
    };
  }

  // ----- Step 4c: Charter lifecycle (per-turn upkeep + fixed-term expiry) -----
  // Pure step — applies forfeits to empire pools and refunds open slots when
  // charters expire or fail to pay. Linked routes are deleted in the same
  // pass so the player isn't left with phantom routes. AI cash and charters
  // are updated in-place via the returned aiCompanies list.
  const charterTurn = applyCharterTurn(nextState);
  const charterUpkeep = charterTurn.playerUpkeep;
  if (charterTurn.forfeitedRouteIds.length > 0) {
    nextState = {
      ...nextState,
      activeRoutes: nextState.activeRoutes.filter(
        (r) => !charterTurn.forfeitedRouteIds.includes(r.id),
      ),
    };
  }
  nextState = {
    ...nextState,
    charters: charterTurn.playerCharters,
    aiCompanies: charterTurn.aiCompanies,
    galaxy: { ...nextState.galaxy, empires: charterTurn.empires },
  };

  // ----- Step 5: Process loans -----
  const { updatedLoans, totalInterest } = processLoans(nextState.loans);
  nextState = { ...nextState, loans: updatedLoans };

  // ----- Step 6: Simulate AI company turns -----
  const aiResult = simulateAITurns(nextState, rng);
  nextState = {
    ...nextState,
    aiCompanies: aiResult.aiCompanies,
    market: aiResult.marketUpdate,
    contracts: aiResult.contracts,
  };
  nextState = appendTurnReportLines(
    nextState,
    aiResult.summaries
      .filter((s) => s.narrativeBeat !== undefined)
      .map((s) => s.narrativeBeat!.headline),
  );
  nextState = appendTurnReportLines(
    nextState,
    aiResult.contracts.flatMap((contract) => {
      const before = state.contracts.find((c) => c.id === contract.id);
      if (!before || before.aiCompanyId === contract.aiCompanyId) return [];
      const company = aiResult.aiCompanies.find(
        (ai) => ai.id === contract.aiCompanyId,
      );
      if (!company) return [];
      return [`${company.name} accepted a ${contract.type} contract.`];
    }),
  );

  // ----- Step 7: Market evolution -----
  const allRoutesForChain = [
    ...nextState.activeRoutes,
    ...nextState.aiCompanies.flatMap((ai) => ai.activeRoutes),
  ];
  const activeProducerIds = getActiveProducers(
    nextState.galaxy.planets,
    allRoutesForChain,
  );
  const updatedMarket = updateMarket(
    nextState.market,
    rng,
    activeProducerIds,
    nextState.galaxy.planets,
  );
  nextState = { ...nextState, market: updatedMarket };

  // ----- Step 7b: Population tick per planet -----
  // foodBalance = baseSupply - baseDemand for the planet's Food market entry.
  // medicalSatisfied = saturation > 0 for Medical (a route is delivering).
  {
    const prevPopState = nextState.planetPopState ?? {};
    const nextPopState: Record<string, PopulationTickState> = {};
    const updatedPlanets = nextState.galaxy.planets.map((planet) => {
      const planetMarket = nextState.market.planetMarkets[planet.id];
      const foodEntry = planetMarket?.[CargoType.Food];
      const foodBalance = foodEntry
        ? foodEntry.baseSupply - foodEntry.baseDemand
        : 0;
      const medicalEntry = planetMarket?.[CargoType.Medical];
      const medicalSatisfied = medicalEntry
        ? medicalEntry.saturation > 0
        : true;

      const state: PopulationTickState = prevPopState[planet.id] ?? {
        foodDeficitStreak: 0,
        foodSurplusStreak: 0,
      };

      const { newPopulation, newState } = tickPopulation({
        currentPopulation: planet.population,
        foodBalance,
        medicalSatisfied,
        state,
      });

      nextPopState[planet.id] = newState;
      return newPopulation === planet.population
        ? planet
        : { ...planet, population: newPopulation };
    });

    nextState = {
      ...nextState,
      galaxy: { ...nextState.galaxy, planets: updatedPlanets },
      planetPopState: nextPopState,
    };
  }

  // ----- Step 7c: Compute company bonus bundle from active special routes -----
  {
    const activeSpecialRoutes: SpecialId[] = [];
    const planetById = new Map(nextState.galaxy.planets.map((p) => [p.id, p]));
    for (const route of nextState.activeRoutes) {
      if (route.paused) continue;
      const origin = planetById.get(route.originPlanetId);
      const dest = planetById.get(route.destinationPlanetId);
      if (origin?.specialResource)
        activeSpecialRoutes.push(origin.specialResource);
      if (dest?.specialResource) activeSpecialRoutes.push(dest.specialResource);
    }
    nextState = {
      ...nextState,
      companyBonuses: computeCompanyBonuses({ activeSpecialRoutes }),
    };
  }

  // ----- Step 8: Events -----
  const newEvents = selectEvents(
    rng,
    nextState.storyteller,
    nextState.galaxy,
    nextState.activeRoutes,
  );
  const blockingChoiceEvent = newEvents.find(
    (event) =>
      event.requiresChoice && event.choices && event.choices.length > 0,
  );

  // Apply each new event's passive/structural effects immediately. For
  // choice events, option-specific outcomes must live in `choices[].effects`;
  // top-level `effects[]` fire before the player chooses.
  for (const event of newEvents) {
    nextState = applyEventEffects(event, nextState);
  }

  // Tick existing events (count down duration, remove expired)
  const tickedEvents = tickEvents(nextState.activeEvents);

  // Combine: new events + remaining existing events
  nextState = {
    ...nextState,
    activeEvents: [...tickedEvents, ...newEvents],
  };
  nextState = appendTurnReportLines(
    nextState,
    newEvents
      .filter((event) => event.category === "empire")
      .map((event) => event.description),
  );

  if (blockingChoiceEvent?.choices) {
    nextState = {
      ...nextState,
      pendingChoiceEvents: [
        ...nextState.pendingChoiceEvents,
        {
          id: `event-choice-${blockingChoiceEvent.id}`,
          eventId: blockingChoiceEvent.id,
          prompt: blockingChoiceEvent.description,
          options: blockingChoiceEvent.choices.map((choice, index) => ({
            id: `choice-${index}`,
            label: choice.label,
            outcomeDescription: "",
            effects: choice.effects,
          })),
          turnCreated: nextState.turn,
          category:
            blockingChoiceEvent.category === "empire"
              ? "diplomatic"
              : undefined,
        },
      ],
    };
  }

  // ----- Step 8a: Process diplomacy -----
  if (
    nextState.diplomaticRelations &&
    nextState.hyperlanes &&
    nextState.borderPorts
  ) {
    const diplomacyResult = processDiplomacyTurn(
      [...nextState.diplomaticRelations],
      nextState.galaxy.empires,
      nextState.galaxy.systems,
      nextState.hyperlanes,
      [...nextState.borderPorts],
      nextState.turn,
      rng,
    );
    nextState = {
      ...nextState,
      diplomaticRelations: diplomacyResult.relations,
      borderPorts: diplomacyResult.borderPorts,
    };
  }

  // --- Universe roster tick (sports, music, celebrities, crime, military) ---
  if (nextState.universeRoster) {
    // Distinct RNG namespace from galaxy/market streams so roster ticks don't
    // perturb other deterministic systems.
    const rosterRng = new SeededRNG(
      nextState.seed + nextState.turn * 31 + 0x510c,
    );
    // Deep-clone the roster so rosterTick's in-place mutations don't bleed back
    // into the input state (simulateTurn must remain a pure function).
    const rosterClone: typeof nextState.universeRoster = JSON.parse(
      JSON.stringify(nextState.universeRoster),
    );
    const newHistory = rosterTick(rosterClone, rosterRng, nextState.turn);
    nextState = { ...nextState, universeRoster: rosterClone };
    const combined = [...(nextState.rosterHistory ?? []), ...newHistory];
    nextState = {
      ...nextState,
      rosterHistory: combined.slice(-ROSTER_HISTORY_MAX),
    };
  }

  // ----- Step 8a-ii: Tick active event chains (may add new pendingChoiceEvents) -----
  nextState = tickEventChains(nextState, rng);
  // Check if new chains should start
  nextState = checkChainTriggers(nextState, rng);

  // ----- Step 8a-iii: Storyteller-driven dilemma firing -----
  // Skip if a chain step already enqueued a choice this turn (no piling on).
  const hadPendingBefore = state.pendingChoiceEvents.length;
  const hasChoiceFromChainsThisTurn =
    nextState.pendingChoiceEvents.length > hadPendingBefore;
  if (!hasChoiceFromChainsThisTurn) {
    const dilemma = selectDilemma(rng, nextState);
    if (dilemma) {
      const intensity = computeDilemmaIntensity(dilemma);
      nextState = {
        ...nextState,
        pendingChoiceEvents: [...nextState.pendingChoiceEvents, dilemma],
        storyteller: recordDilemmaFired(nextState.storyteller, intensity),
      };
    }
  }

  // ----- Step 8b-i: Process player-initiated diplomacy actions -----
  {
    const result = processQueuedDiplomacyActions(nextState, rng);
    nextState = result.nextState;

    // Surface modal outcomes via pendingChoiceEvents using a minimal
    // ChoiceEvent shape (single "Continue" option, no effects).
    for (const m of result.modalEntries) {
      nextState = {
        ...nextState,
        pendingChoiceEvents: [
          ...nextState.pendingChoiceEvents,
          {
            id: `dipl-out-${nextState.turn}-${m.targetId}-${nextState.pendingChoiceEvents.length}`,
            eventId: `diplomacy:outcome:${m.headline}`,
            prompt: `${m.headline} — ${m.flavor}`,
            options: [
              {
                id: "ack",
                label: "Continue",
                outcomeDescription: "",
                effects: [],
              },
            ],
            turnCreated: nextState.turn,
          },
        ],
      };
    }

    // Append digest entries to the turn report.
    if (result.digestEntries.length > 0) {
      nextState = appendTurnReportLines(
        nextState,
        result.digestEntries.map((d) => d.text),
      );
    }
  }

  // ----- Step 8b-ii: AI-initiated diplomacy offer (shares dilemma slot) -----
  {
    const noChoiceFiredYetThisTurn =
      !hasChoiceFromChainsThisTurn &&
      nextState.pendingChoiceEvents.length === state.pendingChoiceEvents.length;
    if (noChoiceFiredYetThisTurn) {
      const offer = selectDiplomacyOffer(rng, nextState);
      if (offer) {
        nextState = {
          ...nextState,
          pendingChoiceEvents: [...nextState.pendingChoiceEvents, offer],
        };
      }
    }
  }

  // ----- Step 8b-iii: Tick diplomacy (drift, expire, decrement, reset) -----
  nextState = tickDiplomacyState(nextState);

  // ----- Step 8b: Process contracts -----
  const contractsBefore = nextState.contracts;
  const contractResult = processContracts(nextState);
  nextState = { ...nextState, ...contractResult };
  const contractLines = nextState.contracts.flatMap((contract) => {
    const before = contractsBefore.find((c) => c.id === contract.id);
    if (!before || before.status === contract.status) return [];
    if (contract.status === "completed") {
      return [
        `Contract completed: ${contract.type} paid §${(
          contract.rewardCash + contract.depositPaid
        ).toLocaleString("en-US")}.`,
      ];
    }
    if (contract.status === "failed") {
      return [`Contract failed: ${contract.type}.`];
    }
    return [];
  });
  nextState = appendTurnReportLines(nextState, contractLines);

  // ----- Step 8b-iv: Refresh the available contract board -----
  {
    const contractsAfterExpiry = expireAvailableContracts(
      nextState.contracts,
      nextState.turn,
    );
    const generatedContracts = generateContracts(
      { ...nextState, contracts: contractsAfterExpiry },
      rng,
    );
    nextState = {
      ...nextState,
      contracts: [...contractsAfterExpiry, ...generatedContracts],
    };
    nextState = appendTurnReportLines(
      nextState,
      generatedContracts.length > 0
        ? [
            `Contracts posted: ${generatedContracts.length} new offers available.`,
          ]
        : [],
    );
  }

  // ----- Step 8c: Research point accumulation & tech completion -----
  const baseRP = calculateRPPerTurn(nextState);
  const hubRPBonus = getRPBonus(nextState.stationHub);
  const rpThisTurn = baseRP + hubRPBonus;
  const updatedTech = processResearch(nextState, rpThisTurn);
  nextState = { ...nextState, tech: updatedTech };

  // ----- Step 8d: Tick route market (expire old entries, add new ones) -----
  nextState = {
    ...nextState,
    routeMarket: tickRouteMarket(nextState, rng),
  };

  // ----- Step 9: Calculate net profit and update cash -----
  const netProfit =
    totalRevenue -
    totalFuelCosts -
    totalOperatingCosts -
    totalInterest -
    totalTariffCosts -
    totalMothballFees -
    hubUpkeep -
    charterUpkeep;
  const newCash = nextState.cash + netProfit;
  nextState = { ...nextState, cash: Math.round(newCash * 100) / 100 };

  // ----- Step 10: Update storyteller -----
  // Check if the player resolved a choice event this turn BEFORE incrementing the counter,
  // so the increment is skipped on turns where a decision was made.
  const playerMadeDecision =
    state.pendingChoiceEvents.length > nextState.pendingChoiceEvents.length;

  const updatedStoryteller = updateStorytellerState(
    playerMadeDecision
      ? { ...nextState.storyteller, turnsSinceLastDecision: -1 }
      : nextState.storyteller,
    nextState.cash,
    nextState.activeRoutes.length,
    netProfit,
  );
  // If player resolved a choice this turn, the +1 in updateStorytellerState brings it to 0
  nextState = { ...nextState, storyteller: updatedStoryteller };

  // ----- Step 11: Build TurnResult -----
  const turnResult: TurnResult = {
    turn: nextState.turn,
    revenue: Math.round(totalRevenue * 100) / 100,
    fuelCosts: Math.round(totalFuelCosts * 100) / 100,
    maintenanceCosts: Math.round(totalOperatingCosts * 100) / 100,
    loanPayments: totalInterest,
    tariffCosts: totalTariffCosts,
    otherCosts: totalMothballFees + hubUpkeep + charterUpkeep,
    netProfit: Math.round(netProfit * 100) / 100,
    cashAtEnd: nextState.cash,
    cargoDelivered,
    passengersTransported: totalPassengers,
    eventsOccurred: newEvents.map((e) => e.name),
    routePerformance: routePerformances,
    aiSummaries: aiResult.summaries,
  };

  nextState = {
    ...nextState,
    history: [...nextState.history, turnResult],
  };

  // ----- Step 11b: Generate adviser messages -----
  // Cap the queue so a player who never opens Rex's drawer doesn't accumulate
  // 30+ stale messages over many turns.
  const adviserMessages = generateTurnMessages(nextState, turnResult);
  const ADVISER_QUEUE_CAP = 12;
  nextState = {
    ...nextState,
    adviser: {
      ...nextState.adviser,
      pendingMessages: [
        ...nextState.adviser.pendingMessages,
        ...adviserMessages,
      ].slice(-ADVISER_QUEUE_CAP),
    },
  };

  // ----- Step 11c: Generate rival CEO communications -----
  {
    const { messages, cooldownUpdates } = generateRivalMessages(nextState, rng);
    if (messages.length > 0) {
      nextState = {
        ...nextState,
        pendingRivalMessages: [
          ...(nextState.pendingRivalMessages ?? []),
          ...messages,
        ],
        diplomacy: nextState.diplomacy
          ? {
              ...nextState.diplomacy,
              cooldowns: {
                ...nextState.diplomacy.cooldowns,
                ...cooldownUpdates,
              },
            }
          : nextState.diplomacy,
      };
    }
  }

  // ----- Step 12: Advance turn counter and check end conditions -----
  const nextTurn = nextState.turn + 1;
  nextState = { ...nextState, turn: nextTurn };

  // Check bankruptcy
  if (checkBankruptcy(nextState.cash, nextState.storyteller.turnsInDebt)) {
    nextState = {
      ...nextState,
      gameOver: true,
      gameOverReason: "bankruptcy",
    };
  }

  // Check win condition (turn exceeds maxTurns)
  if (nextTurn > nextState.maxTurns) {
    nextState = {
      ...nextState,
      gameOver: true,
      gameOverReason: "completed",
    };
  }

  // ----- Step 13: Reset action points for next planning phase -----
  nextState = {
    ...nextState,
    actionPoints: {
      current: nextState.actionPoints.max,
      max: nextState.actionPoints.max,
    },
  };

  // ----- Step 14: Build turn brief for next planning phase -----
  nextState = {
    ...nextState,
    turnBrief: buildTurnBrief(nextState),
  };

  // ----- Step 15: Evaluate progressive nav tab unlocks -----
  const updatedNavTabs = evaluateNavUnlocks(nextState);
  nextState = { ...nextState, unlockedNavTabs: updatedNavTabs };

  // ----- Step 16: Update derived reputation tier -----
  nextState = {
    ...nextState,
    reputationTier: computeReputationTier(nextState.reputation),
  };

  return nextState;
}
