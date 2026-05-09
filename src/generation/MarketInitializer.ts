import type { SeededRNG } from "../utils/SeededRNG.ts";
import { CargoType } from "../data/types.ts";
import type {
  Planet,
  MarketState,
  PlanetMarket,
  CargoMarketEntry,
  CargoType as CargoTypeT,
} from "../data/types.ts";
import { BASE_CARGO_PRICES, BASE_FUEL_PRICE } from "../data/constants.ts";
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
  const producedSet = new Set<CargoTypeT>(planet.productionTags);
  const demandedSet = new Set<CargoTypeT>(planet.consumptionTags);

  // Derive passenger volume from population. Population is normalized
  // 0–1 in generation, so scale it to a 15–100 range.
  const paxVolume = 15 + planet.population * 85; // [15, 100]

  const entries: Partial<Record<CargoTypeT, CargoMarketEntry>> = {};

  // productionScale (0.4–1.8) amplifies supply quantities for producing planets.
  const scale = planet.productionScale;

  for (const cargoType of ALL_CARGO_TYPES) {
    let baseSupply: number;
    let baseDemand: number;

    if (cargoType === CargoType.Passengers) {
      // Passenger handling: population-based demand differential.
      // High-population worlds (paxVolume ≥ 70) are demand hotspots;
      // low-population worlds have surplus (more people want to leave).
      if (paxVolume >= 70) {
        // High demand destination
        baseSupply = rng.nextFloat(15, 30);
        baseDemand = rng.nextFloat(paxVolume * 0.7, paxVolume);
      } else if (paxVolume >= 40) {
        // Moderate — balanced but leaning toward demand
        baseSupply = rng.nextFloat(25, 45);
        baseDemand = rng.nextFloat(40, 65);
      } else {
        // Low-volume — surplus, people want to leave
        baseSupply = rng.nextFloat(50, 80);
        baseDemand = rng.nextFloat(10, 25);
      }
    } else if (producedSet.has(cargoType)) {
      // Planet produces this cargo via its biome: high supply (scaled), low
      // demand. Floor the scale at 0.6 for the supply calc only — biomes like
      // Outpost (productionScale 0.5) with the −30% RNG tail otherwise dip
      // below the demand range and break the producer-surplus invariant.
      const supplyScale = Math.max(0.6, scale);
      baseSupply = rng.nextFloat(60, 100) * supplyScale;
      baseDemand = rng.nextFloat(10, 30);
    } else if (demandedSet.has(cargoType)) {
      // Planet consumes this cargo: low supply, high demand.
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
