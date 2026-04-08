import { CargoType, AIPersonality, ShipClass } from "../../data/types.ts";
import type {
  AICompany,
  GameState,
  Ship,
  ActiveRoute,
  Planet,
  MarketState,
  CargoType as CargoTypeT,
  AITurnSummary,
} from "../../data/types.ts";
import {
  SHIP_TEMPLATES,
  BREAKDOWN_THRESHOLD,
  AI_BUY_THRESHOLD_MULTIPLIER,
  AI_MAX_ROUTES,
  AI_MAX_FLEET,
  AI_MAX_PURCHASES_PER_TURN,
  AI_PERSONALITY_SLOTS,
  AI_SLOT_GROWTH_INTERVAL,
  OVERHAUL_COST_RATIO,
  OVERHAUL_RESTORE_CONDITION,
} from "../../data/constants.ts";
import {
  calculateTripsPerTurn,
  calculateLicenseFee,
} from "../routes/RouteManager.ts";
import { calculatePrice } from "../economy/PriceCalculator.ts";
import {
  ageFleet,
  calculateMaintenanceCosts,
  calculateShipValue,
} from "../fleet/FleetManager.ts";
import { calculateTariff } from "../routes/TariffCalculator.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";

// ---------------------------------------------------------------------------
// AI turn simulation
// ---------------------------------------------------------------------------

/**
 * Simulate one turn for all AI companies. Returns updated companies,
 * updated market state (with AI saturation), and turn summaries.
 */
export function simulateAITurns(
  state: GameState,
  rng: SeededRNG,
): {
  aiCompanies: AICompany[];
  marketUpdate: MarketState;
  summaries: AITurnSummary[];
} {
  let marketState = state.market;
  const summaries: AITurnSummary[] = [];

  const updatedCompanies = state.aiCompanies.map((company) => {
    if (company.bankrupt) {
      summaries.push({
        companyId: company.id,
        companyName: company.name,
        revenue: 0,
        netProfit: 0,
        cashAtEnd: company.cash,
        routeCount: 0,
        fleetSize: 0,
        bankrupt: true,
      });
      return company;
    }

    // 1. Run routes — earn revenue and pay fuel+tariffs
    const routeResult = simulateAIRoutes(company, state, marketState, rng);

    // 2. Update saturation from AI deliveries
    marketState = applyAISaturation(marketState, routeResult.deliveries);

    // 3. Maintenance
    const maintenanceCosts = calculateMaintenanceCosts(company.fleet);

    // 4. Age fleet
    const agedFleet = ageFleet(company.fleet, rng);

    // 5. Net profit
    const netProfit =
      routeResult.revenue -
      routeResult.fuelCost -
      routeResult.tariffCost -
      maintenanceCosts;
    let newCash = company.cash + netProfit;

    // 6. AI decisions (buy ships, open routes)
    let updatedFleet = [...agedFleet];
    let updatedRoutes = [...company.activeRoutes];
    const decisionResult = makeAIDecisions(
      company,
      updatedFleet,
      updatedRoutes,
      newCash,
      state,
      marketState,
      rng,
    );
    updatedFleet = decisionResult.fleet;
    updatedRoutes = decisionResult.routes;
    newCash = decisionResult.cash;

    // 7. Check bankruptcy
    const totalFleetValue = updatedFleet.reduce(
      (sum, s) => sum + calculateShipValue(s),
      0,
    );
    const bankrupt = newCash < 0 && totalFleetValue < Math.abs(newCash);

    const updatedCompany: AICompany = {
      ...company,
      cash: Math.round(newCash * 100) / 100,
      fleet: updatedFleet,
      activeRoutes: bankrupt ? [] : updatedRoutes,
      totalCargoDelivered: company.totalCargoDelivered + routeResult.totalCargo,
      bankrupt,
    };

    summaries.push({
      companyId: company.id,
      companyName: company.name,
      revenue: Math.round(routeResult.revenue * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      cashAtEnd: updatedCompany.cash,
      routeCount: updatedCompany.activeRoutes.length,
      fleetSize: updatedCompany.fleet.length,
      bankrupt: updatedCompany.bankrupt,
    });

    return updatedCompany;
  });

  return {
    aiCompanies: updatedCompanies,
    marketUpdate: marketState,
    summaries,
  };
}

// ---------------------------------------------------------------------------
// Route simulation for one AI company
// ---------------------------------------------------------------------------

interface AIRouteResult {
  revenue: number;
  fuelCost: number;
  tariffCost: number;
  totalCargo: number;
  deliveries: Map<string, Map<CargoTypeT, number>>;
}

function simulateAIRoutes(
  company: AICompany,
  state: GameState,
  market: MarketState,
  rng: SeededRNG,
): AIRouteResult {
  let totalRevenue = 0;
  let totalFuelCost = 0;
  let totalTariffCost = 0;
  let totalCargo = 0;

  const deliveries = new Map<string, Map<CargoTypeT, number>>();

  for (const route of company.activeRoutes) {
    if (!route.cargoType) continue;

    for (const shipId of route.assignedShipIds) {
      const ship = company.fleet.find((s) => s.id === shipId);
      if (!ship) continue;

      // Breakdown check
      if (
        ship.condition < BREAKDOWN_THRESHOLD &&
        rng.chance(1 - ship.condition / 100)
      ) {
        totalFuelCost +=
          route.distance * 2 * ship.fuelEfficiency * market.fuelPrice;
        continue;
      }

      const trips = calculateTripsPerTurn(route.distance, ship.speed);
      const destMarket = market.planetMarkets[route.destinationPlanetId];
      if (!destMarket) continue;

      const destEntry = destMarket[route.cargoType];
      const price = calculatePrice(destEntry, route.cargoType);

      const isPassengers = route.cargoType === CargoType.Passengers;
      const capacity = isPassengers
        ? ship.passengerCapacity
        : ship.cargoCapacity;

      const moved = capacity * trips;
      const revenue = price * moved;
      const fuelCost =
        route.distance * 2 * ship.fuelEfficiency * market.fuelPrice * trips;

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

function applyAISaturation(
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

// ---------------------------------------------------------------------------
// AI slot calculation
// ---------------------------------------------------------------------------

function getAISlotLimit(
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
// AI decision-making
// ---------------------------------------------------------------------------

interface DecisionResult {
  fleet: Ship[];
  routes: ActiveRoute[];
  cash: number;
}

function makeAIDecisions(
  company: AICompany,
  fleet: Ship[],
  routes: ActiveRoute[],
  cash: number,
  state: GameState,
  market: MarketState,
  rng: SeededRNG,
): DecisionResult {
  let currentFleet = fleet;
  let currentRoutes = routes;
  let currentCash = cash;

  // Find cheapest ship cost for buy threshold
  const cheapestShipCost = Math.min(
    ...Object.values(SHIP_TEMPLATES).map((t) => t.purchaseCost),
  );

  // ── Buy ships (may buy multiple per turn) ──
  const buyThreshold = cheapestShipCost * AI_BUY_THRESHOLD_MULTIPLIER;
  let purchasesMade = 0;

  while (
    currentCash > buyThreshold &&
    purchasesMade < AI_MAX_PURCHASES_PER_TURN &&
    currentFleet.filter((s) => !s.assignedRouteId).length < 2 &&
    currentFleet.length < AI_MAX_FLEET
  ) {
    // Pick a ship class based on personality
    const shipClass = pickShipClassForPersonality(
      company.personality,
      currentCash,
      rng,
    );
    if (!shipClass) break;

    const template = SHIP_TEMPLATES[shipClass];
    if (template.purchaseCost > currentCash) break;

    const newShip: Ship = {
      id: `${company.id}-ship-${currentFleet.length}`,
      name: template.name,
      class: template.class,
      cargoCapacity: template.cargoCapacity,
      passengerCapacity: template.passengerCapacity,
      speed: template.speed,
      fuelEfficiency: template.fuelEfficiency,
      reliability: template.baseReliability,
      age: 0,
      condition: 100,
      purchaseCost: template.purchaseCost,
      maintenanceCost: template.baseMaintenance,
      assignedRouteId: null,
    };
    currentFleet = [...currentFleet, newShip];
    currentCash -= template.purchaseCost;
    purchasesMade++;
  }

  // ── Open routes (may open multiple per turn) ──
  const aiSlotLimit = getAISlotLimit(company.personality, state.turn);
  let routeAttempts = 0;
  const maxRouteAttempts = 2;
  while (
    currentRoutes.length < aiSlotLimit &&
    routeAttempts < maxRouteAttempts
  ) {
    const newIdleShips = currentFleet.filter((s) => !s.assignedRouteId);
    if (newIdleShips.length === 0) break;

    const routeResult = openAIRoute(
      company,
      newIdleShips,
      currentRoutes,
      state,
      market,
      rng,
    );
    if (!routeResult) break;

    // Deduct license fee for the new route
    const newRoute = routeResult.routes[routeResult.routes.length - 1];
    const licenseFee = calculateLicenseFee(
      newRoute.distance,
      currentRoutes.length,
    );
    if (currentCash >= licenseFee) {
      currentRoutes = routeResult.routes;
      currentFleet = routeResult.fleet;
      currentCash -= licenseFee;
    } else {
      break;
    }
    routeAttempts++;
  }

  // ── Sell idle ships when cash is critically low ──
  if (currentCash < 0) {
    const idleToSell = currentFleet
      .filter((s) => !s.assignedRouteId)
      .sort((a, b) => calculateShipValue(b) - calculateShipValue(a));
    for (const ship of idleToSell) {
      if (currentCash >= 0) break;
      const salePrice = calculateShipValue(ship);
      currentFleet = currentFleet.filter((s) => s.id !== ship.id);
      currentCash += salePrice;
    }
  }

  return { fleet: currentFleet, routes: currentRoutes, cash: currentCash };
}

function pickShipClassForPersonality(
  personality: (typeof AIPersonality)[keyof typeof AIPersonality],
  cash: number,
  rng: SeededRNG,
): ShipClass | null {
  const affordable = (Object.keys(SHIP_TEMPLATES) as ShipClass[]).filter(
    (sc) => SHIP_TEMPLATES[sc].purchaseCost <= cash,
  );
  if (affordable.length === 0) return null;

  switch (personality) {
    case AIPersonality.AggressiveExpander:
      // Buy upper-mid range ship — aggressive but not reckless
      affordable.sort(
        (a, b) =>
          SHIP_TEMPLATES[b].purchaseCost - SHIP_TEMPLATES[a].purchaseCost,
      );
      // Pick from upper third, not always the most expensive
      return affordable[
        Math.min(Math.floor(affordable.length / 3), affordable.length - 1)
      ];

    case AIPersonality.SteadyHauler:
      // Buy the highest-capacity cargo ship affordable
      affordable.sort(
        (a, b) =>
          SHIP_TEMPLATES[b].cargoCapacity - SHIP_TEMPLATES[a].cargoCapacity,
      );
      // Pick the best cargo hauler, not the middle
      return affordable[0];

    case AIPersonality.CherryPicker:
      // Buy fast ships for high-margin routes
      affordable.sort(
        (a, b) => SHIP_TEMPLATES[b].speed - SHIP_TEMPLATES[a].speed,
      );
      return affordable[0];

    default:
      return rng.pick(affordable);
  }
}

// ---------------------------------------------------------------------------
// Route opening logic
// ---------------------------------------------------------------------------

function openAIRoute(
  company: AICompany,
  idleShips: Ship[],
  existingRoutes: ActiveRoute[],
  state: GameState,
  market: MarketState,
  rng: SeededRNG,
): { routes: ActiveRoute[]; fleet: Ship[] } | null {
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

  // Score candidate routes
  const existingRouteKeys = new Set(
    existingRoutes.map((r) => `${r.originPlanetId}→${r.destinationPlanetId}`),
  );

  const cargoTypes = Object.values(CargoType) as CargoTypeT[];
  let bestProfit = -Infinity;
  let bestRoute: {
    origin: Planet;
    dest: Planet;
    cargoType: CargoTypeT;
    distance: number;
    profit: number;
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
      const key = `${origin.id}→${dest.id}`;
      if (existingRouteKeys.has(key)) continue;

      const destMarket = market.planetMarkets[dest.id];
      if (!destMarket) continue;

      // Calculate distance
      let distance: number;
      if (origin.systemId === dest.systemId) {
        const dx = origin.x - dest.x;
        const dy = origin.y - dest.y;
        distance = Math.sqrt(dx * dx + dy * dy);
      } else {
        const sys1 = systems.find((s) => s.id === origin.systemId);
        const sys2 = systems.find((s) => s.id === dest.systemId);
        if (!sys1 || !sys2) continue;
        const dx = sys1.x - sys2.x;
        const dy = sys1.y - sys2.y;
        distance = Math.sqrt(dx * dx + dy * dy);
      }

      // Find best cargo for this route
      for (const cargoType of cargoTypes) {
        const entry = destMarket[cargoType];
        const price = calculatePrice(entry, cargoType);
        const isPassenger = cargoType === CargoType.Passengers;

        // Find best idle ship for this cargo
        const ship = idleShips.find((s) =>
          isPassenger ? s.passengerCapacity > 0 : s.cargoCapacity > 0,
        );
        if (!ship) continue;

        const capacity = isPassenger
          ? ship.passengerCapacity
          : ship.cargoCapacity;
        const trips = calculateTripsPerTurn(distance, ship.speed);
        const revenue = trips * capacity * price;
        const fuelCost =
          trips * distance * 2 * ship.fuelEfficiency * market.fuelPrice;

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
          bestRoute = { origin, dest, cargoType, distance, profit };
        }
      }
    }
  }

  if (!bestRoute || bestRoute.profit <= 0) return null;

  // Create the route and assign the best idle ship
  const isPassenger = bestRoute.cargoType === CargoType.Passengers;
  const bestShip = idleShips.find((s) =>
    isPassenger ? s.passengerCapacity > 0 : s.cargoCapacity > 0,
  );
  if (!bestShip) return null;

  const newRoute: ActiveRoute = {
    id: `${company.id}-route-${existingRoutes.length}-${rng.nextInt(0, 9999)}`,
    originPlanetId: bestRoute.origin.id,
    destinationPlanetId: bestRoute.dest.id,
    distance: bestRoute.distance,
    assignedShipIds: [bestShip.id],
    cargoType: bestRoute.cargoType,
  };

  const updatedFleet = company.fleet.map((s) =>
    s.id === bestShip.id ? { ...s, assignedRouteId: newRoute.id } : s,
  );

  return {
    routes: [...existingRoutes, newRoute],
    fleet: updatedFleet,
  };
}
