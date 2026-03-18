import type { SeededRNG } from "../utils/SeededRNG.ts";
import { CargoType } from "../data/types.ts";
import type {
  Planet,
  MarketState,
  PlanetMarket,
  CargoMarketEntry,
  CargoType as CargoTypeT,
} from "../data/types.ts";
import {
  PLANET_CARGO_PROFILES,
  BASE_CARGO_PRICES,
  BASE_FUEL_PRICE,
} from "../data/constants.ts";
import type { GalaxyData } from "./GalaxyGenerator.ts";

const ALL_CARGO_TYPES: CargoTypeT[] = Object.values(CargoType);

export function initializeMarkets(
  galaxyData: GalaxyData,
  rng: SeededRNG,
): MarketState {
  const planetMarkets: Record<string, PlanetMarket> = {};

  for (const planet of galaxyData.planets) {
    planetMarkets[planet.id] = createPlanetMarket(planet, rng);
  }

  return {
    fuelPrice: BASE_FUEL_PRICE,
    fuelTrend: "stable",
    planetMarkets,
  };
}

function createPlanetMarket(planet: Planet, rng: SeededRNG): PlanetMarket {
  const profile = PLANET_CARGO_PROFILES[planet.type];
  const producedSet = new Set<CargoTypeT>(profile.produces);
  const demandedSet = new Set<CargoTypeT>(profile.demands);

  const entries: Partial<Record<CargoTypeT, CargoMarketEntry>> = {};

  for (const cargoType of ALL_CARGO_TYPES) {
    let baseSupply: number;
    let baseDemand: number;

    if (producedSet.has(cargoType)) {
      // Planet produces this: high supply, low demand
      baseSupply = rng.nextFloat(60, 100);
      baseDemand = rng.nextFloat(10, 30);
    } else if (demandedSet.has(cargoType)) {
      // Planet demands this: low supply, high demand
      baseSupply = rng.nextFloat(10, 30);
      baseDemand = rng.nextFloat(60, 100);
    } else {
      // Neutral: moderate supply and demand
      baseSupply = rng.nextFloat(30, 50);
      baseDemand = rng.nextFloat(30, 50);
    }

    const basePrice = BASE_CARGO_PRICES[cargoType];
    const ratio = baseDemand / baseSupply;
    const currentPrice = Math.round(basePrice * ratio * 100) / 100;

    entries[cargoType] = {
      baseSupply,
      baseDemand,
      currentPrice,
      saturation: 0,
      trend: "stable",
      trendMomentum: 0,
      eventModifier: 1,
    };
  }

  return entries as PlanetMarket;
}
