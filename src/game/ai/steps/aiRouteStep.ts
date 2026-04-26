import { CargoType } from "../../../data/types.ts";
import type {
  AICompany,
  GameState,
  MarketState,
  CargoType as CargoTypeT,
} from "../../../data/types.ts";
import { BREAKDOWN_THRESHOLD } from "../../../data/constants.ts";
import { calculateTripsPerTurn } from "../../routes/RouteManager.ts";
import { calculatePrice } from "../../economy/PriceCalculator.ts";
import { calculateTariff } from "../../routes/TariffCalculator.ts";
import type { SeededRNG } from "../../../utils/SeededRNG.ts";
import { isRouteGrounded } from "../../events/EventEngine.ts";
import { applyAIHubBonuses } from "./aiHubStep.ts";

// ---------------------------------------------------------------------------
// Route simulation for one AI company
// ---------------------------------------------------------------------------

export interface AIRouteResult {
  revenue: number;
  fuelCost: number;
  tariffCost: number;
  totalCargo: number;
  deliveries: Map<string, Map<CargoTypeT, number>>;
}

export function simulateAIRoutes(
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

    // Skip grounded routes (embargoes, blockades, border closures)
    const grounded = isRouteGrounded(
      route,
      state.activeEvents,
      state.galaxy.systems,
      state.galaxy.planets,
    );
    if (grounded) continue;

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
      let revenue = price * moved;
      let fuelCost =
        route.distance * 2 * ship.fuelEfficiency * market.fuelPrice * trips;

      // Apply AI hub bonuses to route economics
      const hubBonuses = applyAIHubBonuses(revenue, fuelCost, 0, company.aiHub);
      revenue = hubBonuses.revenue;
      fuelCost = hubBonuses.fuel;

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
