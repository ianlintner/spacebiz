import { CargoType, AIPersonality, ShipClass } from "../../../data/types.ts";
import type {
  AICompany,
  GameState,
  Ship,
  ActiveRoute,
  Planet,
  MarketState,
} from "../../../data/types.ts";
import {
  SHIP_TEMPLATES,
  AI_BUY_THRESHOLD_MULTIPLIER,
  AI_MAX_ROUTES,
  AI_MAX_FLEET,
  AI_MAX_PURCHASES_PER_TURN,
  AI_PERSONALITY_SLOTS,
  AI_SLOT_GROWTH_INTERVAL,
  OVERHAUL_COST_RATIO,
  OVERHAUL_RESTORE_CONDITION,
  AI_OVERHAUL_CONDITION,
  AI_MAX_SHIP_SPEND_RATIO,
} from "../../../data/constants.ts";
import {
  calculateDistance,
  calculateTripsPerTurn,
  calculateLicenseFee,
} from "../../routes/RouteManager.ts";
import { calculatePrice } from "../../economy/PriceCalculator.ts";
import { calculateShipValue } from "../../fleet/FleetManager.ts";
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
// AI decision-making
// ---------------------------------------------------------------------------

export interface DecisionResult {
  fleet: Ship[];
  routes: ActiveRoute[];
  cash: number;
}

export function makeAIDecisions(
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

  // ── Overhaul worn-out ships before they break down ──
  currentFleet = currentFleet.map((ship) => {
    if (ship.condition >= AI_OVERHAUL_CONDITION) return ship;
    const cost = ship.purchaseCost * OVERHAUL_COST_RATIO;
    if (currentCash >= cost) {
      currentCash -= cost;
      return { ...ship, condition: OVERHAUL_RESTORE_CONDITION };
    }
    return ship;
  });

  // ── Abandon unprofitable routes ──
  // Estimate per-route profit; drop routes that are losing money
  currentRoutes = currentRoutes.filter((route) => {
    if (!route.cargoType) return true; // keep even if no cargo assignment
    const assignedShips = currentFleet.filter(
      (s) => s.assignedRouteId === route.id,
    );
    if (assignedShips.length === 0) return true; // no ships to evaluate

    let routeProfit = 0;
    for (const ship of assignedShips) {
      const trips = calculateTripsPerTurn(route.distance, ship.speed);
      const destMarket = market.planetMarkets[route.destinationPlanetId];
      if (!destMarket) continue;
      const destEntry = destMarket[route.cargoType];
      const price = calculatePrice(destEntry, route.cargoType);
      const isPassengers = route.cargoType === CargoType.Passengers;
      const capacity = isPassengers
        ? ship.passengerCapacity
        : ship.cargoCapacity;
      const revenue = price * capacity * trips;
      const fuelCost =
        route.distance * 2 * ship.fuelEfficiency * market.fuelPrice * trips;
      routeProfit += revenue - fuelCost;
    }

    if (routeProfit < 0) {
      // Unassign ships from this route
      currentFleet = currentFleet.map((s) =>
        s.assignedRouteId === route.id ? { ...s, assignedRouteId: null } : s,
      );
      return false; // drop the route
    }
    return true;
  });

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
      currentFleet,
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

export function pickShipClassForPersonality(
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

    case AIPersonality.SteadyHauler: {
      // Limit spend to AI_MAX_SHIP_SPEND_RATIO of current cash — avoid going broke on one ship
      const maxSpend = cash * AI_MAX_SHIP_SPEND_RATIO;
      const prudent = affordable.filter(
        (sc) => SHIP_TEMPLATES[sc].purchaseCost <= maxSpend,
      );
      const pool = prudent.length > 0 ? prudent : affordable;
      // Buy the highest-capacity cargo ship affordable within budget
      pool.sort(
        (a, b) =>
          SHIP_TEMPLATES[b].cargoCapacity - SHIP_TEMPLATES[a].cargoCapacity,
      );
      return pool[0];
    }

    case AIPersonality.CherryPicker:
      // Pick ships by efficiency ratio: (speed × cargoCapacity) / cost
      // This balances speed with earning potential per credit spent
      affordable.sort((a, b) => {
        const ta = SHIP_TEMPLATES[a];
        const tb = SHIP_TEMPLATES[b];
        const effA =
          (ta.speed * Math.max(ta.cargoCapacity, ta.passengerCapacity)) /
          ta.purchaseCost;
        const effB =
          (tb.speed * Math.max(tb.cargoCapacity, tb.passengerCapacity)) /
          tb.purchaseCost;
        return effB - effA;
      });
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
  currentFleet: Ship[],
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

  // Accept profitable routes always. When most ships are idle (desperate),
  // also accept marginal routes that aren't deeply unprofitable — better
  // than sitting idle earning nothing.
  // CherryPickers are more selective — they require higher profit margins.
  const totalShips = company.fleet.length;
  const idleRatio = totalShips > 0 ? idleShips.length / totalShips : 0;
  const desperate = idleRatio > 0.5;
  const isCherryPicker = company.personality === AIPersonality.CherryPicker;
  const cherryMinProfit = isCherryPicker ? 200 : 0;
  const profitFloor = desperate ? -500 : cherryMinProfit;

  if (!bestRoute || bestRoute.profit <= profitFloor) return null;

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

  const updatedFleet = currentFleet.map((s) =>
    s.id === bestShip.id ? { ...s, assignedRouteId: newRoute.id } : s,
  );

  return {
    routes: [...existingRoutes, newRoute],
    fleet: updatedFleet,
  };
}
