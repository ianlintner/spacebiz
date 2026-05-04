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
  PLANET_PASSENGER_VOLUME,
  PLANET_INDUSTRY_INPUT,
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

  // Passenger volume determines demand profile — high-volume planets
  // attract passengers (high demand), low-volume planets are more like
  // departure points (lower demand, moderate supply).
  const paxVolume = PLANET_PASSENGER_VOLUME[planet.type]; // 15–100

  const entries: Partial<Record<CargoTypeT, CargoMarketEntry>> = {};

  const inputCargo = PLANET_INDUSTRY_INPUT[planet.type];

  for (const cargoType of ALL_CARGO_TYPES) {
    let baseSupply: number;
    let baseDemand: number;

    if (cargoType === CargoType.Passengers) {
      // Use passenger volume to create meaningful demand differentials.
      // High-volume worlds (Hub 100, Resort 80, Terran 80) become demand
      // hotspots; low-volume worlds (Research 15, Mining 20) have surplus.
      if (paxVolume >= 70) {
        // High demand destination — many people want to go here
        baseSupply = rng.nextFloat(15, 30);
        baseDemand = rng.nextFloat(paxVolume * 0.7, paxVolume);
      } else if (paxVolume >= 40) {
        // Moderate — balanced but leaning toward demand
        baseSupply = rng.nextFloat(25, 45);
        baseDemand = rng.nextFloat(40, 65);
      } else {
        // Low-volume — passenger surplus, people want to leave
        baseSupply = rng.nextFloat(50, 80);
        baseDemand = rng.nextFloat(10, 25);
      }
    } else if (inputCargo !== null && cargoType === inputCargo) {
      // Input cargo at its own producer world is a catalyst, not a market good
      baseSupply = rng.nextFloat(5, 15);
      baseDemand = rng.nextFloat(1, 5);
    } else if (producedSet.has(cargoType)) {
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
