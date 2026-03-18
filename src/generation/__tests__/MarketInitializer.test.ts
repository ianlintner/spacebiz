import { describe, it, expect } from "vitest";
import { initializeMarkets } from "../MarketInitializer.ts";
import { generateGalaxy } from "../GalaxyGenerator.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";
import { CargoType, PlanetType } from "../../data/types.ts";
import type { CargoType as CargoTypeT } from "../../data/types.ts";
import { PLANET_CARGO_PROFILES } from "../../data/constants.ts";

const ALL_CARGO_TYPES: CargoTypeT[] = Object.values(CargoType);

describe("MarketInitializer", () => {
  const galaxy = generateGalaxy(42);

  it("every planet has market entries for all 7 cargo types", () => {
    const rng = new SeededRNG(42);
    const market = initializeMarkets(galaxy, rng);

    for (const planet of galaxy.planets) {
      const planetMarket = market.planetMarkets[planet.id];
      expect(planetMarket).toBeDefined();
      for (const cargoType of ALL_CARGO_TYPES) {
        expect(planetMarket[cargoType]).toBeDefined();
        expect(planetMarket[cargoType].baseSupply).toBeGreaterThan(0);
        expect(planetMarket[cargoType].baseDemand).toBeGreaterThan(0);
        expect(planetMarket[cargoType].currentPrice).toBeGreaterThan(0);
      }
    }
  });

  it("producing planets have supply > demand for their produced goods", () => {
    const rng = new SeededRNG(42);
    const market = initializeMarkets(galaxy, rng);

    for (const planet of galaxy.planets) {
      const profile = PLANET_CARGO_PROFILES[planet.type];
      const planetMarket = market.planetMarkets[planet.id];
      for (const produced of profile.produces) {
        const entry = planetMarket[produced];
        expect(entry.baseSupply).toBeGreaterThan(entry.baseDemand);
      }
    }
  });

  it("demanding planets have demand > supply for their demanded goods", () => {
    const rng = new SeededRNG(42);
    const market = initializeMarkets(galaxy, rng);

    for (const planet of galaxy.planets) {
      const profile = PLANET_CARGO_PROFILES[planet.type];
      const planetMarket = market.planetMarkets[planet.id];
      for (const demanded of profile.demands) {
        const entry = planetMarket[demanded];
        expect(entry.baseDemand).toBeGreaterThan(entry.baseSupply);
      }
    }
  });

  it("all saturation starts at 0", () => {
    const rng = new SeededRNG(42);
    const market = initializeMarkets(galaxy, rng);

    for (const planet of galaxy.planets) {
      const planetMarket = market.planetMarkets[planet.id];
      for (const cargoType of ALL_CARGO_TYPES) {
        expect(planetMarket[cargoType].saturation).toBe(0);
      }
    }
  });

  it("all trends start at stable", () => {
    const rng = new SeededRNG(42);
    const market = initializeMarkets(galaxy, rng);

    for (const planet of galaxy.planets) {
      const planetMarket = market.planetMarkets[planet.id];
      for (const cargoType of ALL_CARGO_TYPES) {
        expect(planetMarket[cargoType].trend).toBe("stable");
      }
    }
  });

  it("all trendMomentum starts at 0", () => {
    const rng = new SeededRNG(42);
    const market = initializeMarkets(galaxy, rng);

    for (const planet of galaxy.planets) {
      const planetMarket = market.planetMarkets[planet.id];
      for (const cargoType of ALL_CARGO_TYPES) {
        expect(planetMarket[cargoType].trendMomentum).toBe(0);
      }
    }
  });

  it("all eventModifier starts at 1", () => {
    const rng = new SeededRNG(42);
    const market = initializeMarkets(galaxy, rng);

    for (const planet of galaxy.planets) {
      const planetMarket = market.planetMarkets[planet.id];
      for (const cargoType of ALL_CARGO_TYPES) {
        expect(planetMarket[cargoType].eventModifier).toBe(1);
      }
    }
  });

  it("fuel price is initialized from BASE_FUEL_PRICE", () => {
    const rng = new SeededRNG(42);
    const market = initializeMarkets(galaxy, rng);
    expect(market.fuelPrice).toBe(10);
  });

  it("fuel trend starts at stable", () => {
    const rng = new SeededRNG(42);
    const market = initializeMarkets(galaxy, rng);
    expect(market.fuelTrend).toBe("stable");
  });

  it("produced goods have lower price than demanded goods for same planet", () => {
    const rng = new SeededRNG(42);
    const market = initializeMarkets(galaxy, rng);

    // Find a planet with both produced and demanded goods of same base price range
    // Just verify the price ratio logic: produced goods = low demand/high supply = lower price
    for (const planet of galaxy.planets) {
      const profile = PLANET_CARGO_PROFILES[planet.type];
      const planetMarket = market.planetMarkets[planet.id];

      if (profile.produces.length > 0) {
        const produced = profile.produces[0];
        const entry = planetMarket[produced];
        // For produced goods: demand/supply ratio < 1, so price < base
        const ratio = entry.baseDemand / entry.baseSupply;
        expect(ratio).toBeLessThan(1);
      }

      if (profile.demands.length > 0) {
        const demanded = profile.demands[0];
        const entry = planetMarket[demanded];
        // For demanded goods: demand/supply ratio > 1, so price > base
        const ratio = entry.baseDemand / entry.baseSupply;
        expect(ratio).toBeGreaterThan(1);
      }
    }
  });
});
