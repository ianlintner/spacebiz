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
import { BREAKDOWN_THRESHOLD } from "../../data/constants.ts";
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
} from "../events/EventEngine.ts";
import { updateStorytellerState } from "../events/Storyteller.ts";
import { generateTurnMessages } from "../adviser/AdviserEngine.ts";
import { simulateAITurns } from "../ai/AISimulator.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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

  const trips = calculateTripsPerTurn(route.distance, ship.speed);

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
      trips,
      breakdowns: 0,
    };
  }

  const destEntry = destMarket[route.cargoType];
  const price = calculatePrice(destEntry, route.cargoType);

  const isPassengers = route.cargoType === CargoType.Passengers;
  const capacity = isPassengers ? ship.passengerCapacity : ship.cargoCapacity;

  const totalCargoMoved = capacity * trips;
  const revenue = price * totalCargoMoved;

  // Fuel cost = distance * 2 * fuelEfficiency * fuelPrice * trips
  const fuelCost =
    route.distance * 2 * ship.fuelEfficiency * state.market.fuelPrice * trips;

  return {
    revenue: Math.round(revenue * 100) / 100,
    fuelCost: Math.round(fuelCost * 100) / 100,
    cargoMoved: isPassengers ? 0 : totalCargoMoved,
    passengersMoved: isPassengers ? totalCargoMoved : 0,
    trips,
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

      const saturationIncrease = amount / (entry.baseDemand * 5);
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
    let routeRevenue = 0;
    let routeFuelCost = 0;
    let routeCargoMoved = 0;
    let routePassengersMoved = 0;
    let routeTrips = 0;
    let routeBreakdowns = 0;

    for (const shipId of route.assignedShipIds) {
      const ship = nextState.fleet.find((s) => s.id === shipId);
      if (!ship) continue;

      const result = simulateShipOnRoute(ship, route, nextState, rng);
      routeRevenue += result.revenue;
      routeFuelCost += result.fuelCost;
      routeCargoMoved += result.cargoMoved;
      routePassengersMoved += result.passengersMoved;
      routeTrips += result.trips;
      routeBreakdowns += result.breakdowns;
    }

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
    );
    totalTariffCosts += tariff;
  }
  totalTariffCosts = Math.round(totalTariffCosts * 100) / 100;

  // ----- Step 3: Update saturation at destination planets -----
  nextState = updateSaturation(nextState, deliveriesByPlanet);

  // ----- Step 4: Calculate maintenance costs -----
  const maintenanceCosts = calculateMaintenanceCosts(nextState.fleet);

  // ----- Step 5: Process loans -----
  const { updatedLoans, totalInterest } = processLoans(nextState.loans);
  nextState = { ...nextState, loans: updatedLoans };

  // ----- Step 6: Age fleet -----
  const agedFleet = ageFleet(nextState.fleet, rng);
  nextState = { ...nextState, fleet: agedFleet };

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

  // ----- Step 9: Calculate net profit and update cash -----
  const netProfit =
    totalRevenue -
    totalFuelCosts -
    maintenanceCosts -
    totalInterest -
    totalTariffCosts;
  const newCash = nextState.cash + netProfit;
  nextState = { ...nextState, cash: Math.round(newCash * 100) / 100 };

  // ----- Step 10: Update storyteller -----
  const updatedStoryteller = updateStorytellerState(
    nextState.storyteller,
    nextState.cash,
    nextState.fleet,
    netProfit,
  );
  nextState = { ...nextState, storyteller: updatedStoryteller };

  // ----- Step 11: Build TurnResult -----
  const turnResult: TurnResult = {
    turn: nextState.turn,
    revenue: Math.round(totalRevenue * 100) / 100,
    fuelCosts: Math.round(totalFuelCosts * 100) / 100,
    maintenanceCosts: Math.round(maintenanceCosts * 100) / 100,
    loanPayments: totalInterest,
    tariffCosts: totalTariffCosts,
    otherCosts: 0,
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

  return nextState;
}
