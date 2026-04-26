import { CargoType } from "../../data/types.ts";
import type {
  GameState,
  Ship,
  ActiveRoute,
  TurnResult,
  RoutePerformance,
  CargoType as CargoTypeT,
  Loan,
} from "../../data/types.ts";
import { buildTurnBrief } from "../turn/TurnBriefBuilder.ts";
import { evaluateNavUnlocks } from "../nav/NavUnlocks.ts";
import {
  BREAKDOWN_THRESHOLD,
  INTRA_SYSTEM_REVENUE_MULTIPLIER,
  DISTANCE_PREMIUM_RATE,
  DISTANCE_PREMIUM_CAP,
} from "../../data/constants.ts";
import { calculatePrice } from "../economy/PriceCalculator.ts";
import { updateMarket } from "../economy/MarketUpdater.ts";
import {
  ageFleet,
  calculateMaintenanceCosts,
  calculateShipValue,
} from "../fleet/FleetManager.ts";
import { calculateTripsPerTurn } from "../routes/RouteManager.ts";
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
import { simulateAITurns } from "../ai/AISimulator.ts";
import { processContracts } from "../contracts/ContractManager.ts";
import { calculateRPPerTurn, processResearch } from "../tech/TechTree.ts";
import {
  getMaintenanceMultiplier,
  getFuelMultiplier,
  getRevenueMultiplier,
} from "../tech/TechEffects.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import { processDiplomacyTurn } from "../empire/DiplomacyManager.ts";
import { getHubUpkeep } from "../hub/HubManager.ts";
import {
  getRepairBonus,
  getRPBonus,
  getTariffMultiplier,
  getSaturationMultiplier,
} from "../hub/HubBonusCalculator.ts";
import { tickRouteMarket } from "../routes/RouteMarket.ts";
import { computeReputationTier } from "../reputation/ReputationEffects.ts";

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

interface ShipRouteResult {
  revenue: number;
  fuelCost: number;
  cargoMoved: number;
  passengersMoved: number;
  trips: number;
  breakdowns: number;
}

/**
 * Simulate a single ship on a route for one turn.
 */
function simulateShipOnRoute(
  ship: Ship,
  route: ActiveRoute,
  state: GameState,
  rng: SeededRNG,
  activeEvents: GameEvent[],
): ShipRouteResult {
  if (!route.cargoType) {
    return {
      revenue: 0,
      fuelCost: 0,
      cargoMoved: 0,
      passengersMoved: 0,
      trips: 0,
      breakdowns: 0,
    };
  }

  const rawTrips = calculateTripsPerTurn(route.distance, ship.speed);

  // Apply speed modifier from active events (e.g. pirate activity, solar flare)
  const speedMod = getRouteSpeedModifier(activeEvents, route);
  const effectiveTrips = Math.max(0, Math.floor(rawTrips * speedMod));

  // Check for breakdown
  const brokeDown =
    ship.condition < BREAKDOWN_THRESHOLD &&
    rng.chance(1 - ship.condition / 100);

  if (brokeDown) {
    // Ship breaks down: 0 revenue, partial fuel for 1 trip
    const partialFuelCost =
      route.distance * 2 * ship.fuelEfficiency * state.market.fuelPrice;
    return {
      revenue: 0,
      fuelCost: partialFuelCost,
      cargoMoved: 0,
      passengersMoved: 0,
      trips: 0,
      breakdowns: 1,
    };
  }

  // Normal operation
  const destMarket = state.market.planetMarkets[route.destinationPlanetId];
  if (!destMarket) {
    return {
      revenue: 0,
      fuelCost: 0,
      cargoMoved: 0,
      passengersMoved: 0,
      trips: effectiveTrips,
      breakdowns: 0,
    };
  }

  const destEntry = destMarket[route.cargoType];
  const price = calculatePrice(destEntry, route.cargoType);

  const isPassengers = route.cargoType === CargoType.Passengers;

  // Block passenger routes affected by quarantine or similar events
  if (isPassengers && isPassengerRouteBlocked(activeEvents, route)) {
    const fuelCost =
      route.distance *
      2 *
      ship.fuelEfficiency *
      state.market.fuelPrice *
      effectiveTrips;
    return {
      revenue: 0,
      fuelCost: Math.round(fuelCost * 100) / 100,
      cargoMoved: 0,
      passengersMoved: 0,
      trips: effectiveTrips,
      breakdowns: 0,
    };
  }

  const capacity = isPassengers ? ship.passengerCapacity : ship.cargoCapacity;

  const totalCargoMoved = capacity * effectiveTrips;
  const originSysId = planetToSystemId(route.originPlanetId);
  const destSysId = planetToSystemId(route.destinationPlanetId);
  const isIntraSystem = originSysId !== null && originSysId === destSysId;
  const distancePremium = Math.min(
    DISTANCE_PREMIUM_CAP,
    route.distance * DISTANCE_PREMIUM_RATE,
  );
  const revenueMultiplier = isIntraSystem
    ? INTRA_SYSTEM_REVENUE_MULTIPLIER
    : 1 + distancePremium;
  const revenue = price * totalCargoMoved * revenueMultiplier;

  // Fuel cost = distance * 2 * fuelEfficiency * fuelPrice * effectiveTrips
  const fuelCost =
    route.distance *
    2 *
    ship.fuelEfficiency *
    state.market.fuelPrice *
    effectiveTrips;

  return {
    revenue: Math.round(revenue * 100) / 100,
    fuelCost: Math.round(fuelCost * 100) / 100,
    cargoMoved: isPassengers ? 0 : totalCargoMoved,
    passengersMoved: isPassengers ? totalCargoMoved : 0,
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
 * Bankruptcy: cash < 0 and fleet total value < |cash| and turnsInDebt >= 2.
 */
function checkBankruptcy(
  cash: number,
  fleet: Ship[],
  turnsInDebt: number,
): boolean {
  if (cash >= 0) return false;

  const totalFleetValue = fleet.reduce(
    (sum, ship) => sum + calculateShipValue(ship),
    0,
  );

  // Insufficient assets to cover debt
  const insufficientAssets = totalFleetValue < Math.abs(cash);

  return insufficientAssets && turnsInDebt >= 2;
}

// ---------------------------------------------------------------------------
// Main simulation function
// ---------------------------------------------------------------------------

/**
 * Simulate one turn of the game. Pure function — returns a new GameState
 * without mutating the input.
 */
export function simulateTurn(state: GameState, rng: SeededRNG): GameState {
  let nextState = { ...state };

  // ----- Step 1 & 2: Route simulation (revenue, fuel, breakdowns) -----
  let totalRevenue = 0;
  let totalFuelCosts = 0;
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

  // Tech multipliers applied to all routes
  const revenueMultiplier = getRevenueMultiplier(nextState);
  const fuelMultiplier = getFuelMultiplier(nextState);

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
        nextState.fleet,
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

    let routeRevenue = 0;
    let routeFuelCost = 0;
    let routeCargoMoved = 0;
    let routePassengersMoved = 0;
    let routeTrips = 0;
    let routeBreakdowns = 0;

    for (const shipId of route.assignedShipIds) {
      const ship = nextState.fleet.find((s) => s.id === shipId);
      if (!ship) continue;

      const result = simulateShipOnRoute(
        ship,
        route,
        nextState,
        rng,
        nextState.activeEvents,
      );
      routeRevenue += result.revenue;
      routeFuelCost += result.fuelCost;
      routeCargoMoved += result.cargoMoved;
      routePassengersMoved += result.passengersMoved;
      routeTrips += result.trips;
      routeBreakdowns += result.breakdowns;
    }

    // Apply tech multipliers
    routeRevenue *= revenueMultiplier;
    routeFuelCost *= fuelMultiplier;

    totalRevenue += routeRevenue;
    totalFuelCosts += routeFuelCost;
    totalPassengers += routePassengersMoved;

    // Track cargo delivered by type
    if (route.cargoType) {
      if (route.cargoType === CargoType.Passengers) {
        cargoDelivered[CargoType.Passengers] += routePassengersMoved;
      } else {
        cargoDelivered[route.cargoType] += routeCargoMoved;
      }

      // Track for saturation update
      const totalDelivered = routeCargoMoved + routePassengersMoved;
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
      trips: routeTrips,
      revenue: Math.round(routeRevenue * 100) / 100,
      fuelCost: Math.round(routeFuelCost * 100) / 100,
      cargoMoved: routeCargoMoved,
      passengersMoved: routePassengersMoved,
      breakdowns: routeBreakdowns,
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

  // ----- Step 4: Calculate maintenance costs -----
  const maintenanceCosts =
    calculateMaintenanceCosts(nextState.fleet) *
    getMaintenanceMultiplier(nextState);

  // ----- Step 4b: Hub upkeep -----
  const hubUpkeep = nextState.stationHub
    ? getHubUpkeep(nextState.stationHub)
    : 0;

  // ----- Step 5: Process loans -----
  const { updatedLoans, totalInterest } = processLoans(nextState.loans);
  nextState = { ...nextState, loans: updatedLoans };

  // ----- Step 6: Age fleet -----
  const agedFleet = ageFleet(nextState.fleet, rng);

  // ----- Step 6a: Apply hub Repair Bay bonus -----
  const repairBonus =
    nextState.stationHub && nextState.stationHub.systemId
      ? getRepairBonus(nextState.stationHub, nextState.stationHub.systemId)
      : 0;
  const repairedFleet =
    repairBonus > 0
      ? agedFleet.map((ship) => {
          // Only boost ships on routes touching the hub system
          if (!ship.assignedRouteId) return ship;
          const route = nextState.activeRoutes.find(
            (r) => r.id === ship.assignedRouteId,
          );
          if (!route) return ship;
          const hubSysId = nextState.stationHub!.systemId;
          const originSysId = planetToSystemId(route.originPlanetId);
          const destSysId = planetToSystemId(route.destinationPlanetId);
          if (originSysId !== hubSysId && destSysId !== hubSysId) return ship;
          return {
            ...ship,
            condition: Math.min(100, ship.condition + repairBonus),
          };
        })
      : agedFleet;
  nextState = { ...nextState, fleet: repairedFleet };

  // ----- Step 6b: Simulate AI company turns -----
  const aiResult = simulateAITurns(nextState, rng);
  nextState = {
    ...nextState,
    aiCompanies: aiResult.aiCompanies,
    market: aiResult.marketUpdate,
  };

  // ----- Step 7: Market evolution -----
  const updatedMarket = updateMarket(nextState.market, rng);
  nextState = { ...nextState, market: updatedMarket };

  // ----- Step 8: Events -----
  const newEvents = selectEvents(
    rng,
    nextState.storyteller,
    nextState.galaxy,
    nextState.activeRoutes,
  );

  // Apply each new event's effects
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

  // ----- Step 8b: Process contracts -----
  const contractResult = processContracts(nextState);
  nextState = { ...nextState, ...contractResult };

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
    maintenanceCosts -
    totalInterest -
    totalTariffCosts -
    totalMothballFees -
    hubUpkeep;
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
    nextState.fleet,
    netProfit,
  );
  // If player resolved a choice this turn, the +1 in updateStorytellerState brings it to 0
  nextState = { ...nextState, storyteller: updatedStoryteller };

  // ----- Step 11: Build TurnResult -----
  const turnResult: TurnResult = {
    turn: nextState.turn,
    revenue: Math.round(totalRevenue * 100) / 100,
    fuelCosts: Math.round(totalFuelCosts * 100) / 100,
    maintenanceCosts: Math.round(maintenanceCosts * 100) / 100,
    loanPayments: totalInterest,
    tariffCosts: totalTariffCosts,
    otherCosts: totalMothballFees + hubUpkeep,
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
  const adviserMessages = generateTurnMessages(nextState, turnResult);
  nextState = {
    ...nextState,
    adviser: {
      ...nextState.adviser,
      pendingMessages: [
        ...nextState.adviser.pendingMessages,
        ...adviserMessages,
      ],
    },
  };

  // ----- Step 12: Advance turn counter and check end conditions -----
  const nextTurn = nextState.turn + 1;
  nextState = { ...nextState, turn: nextTurn };

  // Check bankruptcy
  if (
    checkBankruptcy(
      nextState.cash,
      nextState.fleet,
      nextState.storyteller.turnsInDebt,
    )
  ) {
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
