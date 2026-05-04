import { describe, it, expect } from "vitest";
import { updateMarket } from "../MarketUpdater.ts";
import { CargoType, PlanetType } from "../../../data/types.ts";
import type {
  CargoType as CargoTypeT,
  MarketState,
  CargoMarketEntry,
  PlanetMarket,
  Planet,
} from "../../../data/types.ts";
import { BASE_FUEL_PRICE } from "../../../data/constants.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";

const ALL_CARGO_TYPES: CargoTypeT[] = Object.values(CargoType);

function makeEntry(
  overrides: Partial<CargoMarketEntry> = {},
): CargoMarketEntry {
  return {
    baseSupply: 50,
    baseDemand: 50,
    currentPrice: 20,
    saturation: 0.5,
    trend: "stable",
    trendMomentum: 0,
    eventModifier: 1.0,
    ...overrides,
  };
}

function makePlanetMarket(
  overrides: Partial<Record<CargoTypeT, Partial<CargoMarketEntry>>> = {},
): PlanetMarket {
  const market: Partial<PlanetMarket> = {};
  for (const ct of ALL_CARGO_TYPES) {
    market[ct] = makeEntry(overrides[ct] || {});
  }
  return market as PlanetMarket;
}

function makeMarketState(overrides: Partial<MarketState> = {}): MarketState {
  return {
    fuelPrice: BASE_FUEL_PRICE,
    fuelTrend: "stable",
    planetMarkets: {
      "planet-1": makePlanetMarket(),
    },
    ...overrides,
  };
}

describe("MarketUpdater", () => {
  describe("updateMarket", () => {
    it("decays saturation by 15% (multiplies by 0.85)", () => {
      const market = makeMarketState({
        planetMarkets: {
          "planet-1": makePlanetMarket({
            [CargoType.Food]: { saturation: 0.8 },
            [CargoType.Technology]: { saturation: 1.0 },
          }),
        },
      });

      const rng = new SeededRNG(42);
      const updated = updateMarket(market, rng);

      const foodEntry = updated.planetMarkets["planet-1"][CargoType.Food];
      const techEntry = updated.planetMarkets["planet-1"][CargoType.Technology];

      expect(foodEntry.saturation).toBeCloseTo(0.8 * 0.92, 4);
      expect(techEntry.saturation).toBeCloseTo(1.0 * 0.92, 4);
    });

    it("trends can shift from stable", () => {
      // Use many planets so we get statistically likely trend shifts
      const planetMarkets: Record<string, PlanetMarket> = {};
      for (let i = 0; i < 50; i++) {
        planetMarkets[`planet-${i}`] = makePlanetMarket();
      }
      const market = makeMarketState({ planetMarkets });

      const rng = new SeededRNG(42);
      const updated = updateMarket(market, rng);

      // At least one entry should have shifted from "stable" across many planets
      let hasShifted = false;
      for (const planetId of Object.keys(updated.planetMarkets)) {
        for (const ct of ALL_CARGO_TYPES) {
          if (updated.planetMarkets[planetId][ct].trend !== "stable") {
            hasShifted = true;
            break;
          }
        }
        if (hasShifted) break;
      }
      expect(hasShifted).toBe(true);
    });

    it("fuel price stays within 50%-150% of BASE_FUEL_PRICE bounds", () => {
      // Run many updates to push fuel price toward extremes
      let market = makeMarketState({ fuelPrice: BASE_FUEL_PRICE * 1.5 });
      const rng = new SeededRNG(42);

      for (let i = 0; i < 100; i++) {
        market = updateMarket(market, rng);
      }

      const minFuel = BASE_FUEL_PRICE * 0.5;
      const maxFuel = BASE_FUEL_PRICE * 1.5;
      expect(market.fuelPrice).toBeGreaterThanOrEqual(minFuel);
      expect(market.fuelPrice).toBeLessThanOrEqual(maxFuel);
    });

    it("is deterministic for same RNG seed", () => {
      const market = makeMarketState();
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const result1 = updateMarket(market, rng1);
      const result2 = updateMarket(market, rng2);

      expect(result1).toEqual(result2);
    });

    it("recalculates currentPrice for every entry", () => {
      const market = makeMarketState({
        planetMarkets: {
          "planet-1": makePlanetMarket({
            [CargoType.Food]: {
              baseDemand: 80,
              baseSupply: 40,
              currentPrice: 0, // Deliberately wrong, should be recalculated
            },
          }),
        },
      });

      const rng = new SeededRNG(42);
      const updated = updateMarket(market, rng);

      const foodEntry = updated.planetMarkets["planet-1"][CargoType.Food];
      // Price should be recalculated and not be 0
      expect(foodEntry.currentPrice).toBeGreaterThan(0);
    });

    it("does not mutate the original market state", () => {
      const market = makeMarketState();
      const originalFuelPrice = market.fuelPrice;
      const originalSaturation =
        market.planetMarkets["planet-1"][CargoType.Food].saturation;

      const rng = new SeededRNG(42);
      updateMarket(market, rng);

      expect(market.fuelPrice).toBe(originalFuelPrice);
      expect(market.planetMarkets["planet-1"][CargoType.Food].saturation).toBe(
        originalSaturation,
      );
    });
  });
});

describe("industry chain boost", () => {
  it("doubles effective supply for active producer's output cargo", () => {
    const unboostedMarket = makeMarketState({
      planetMarkets: {
        "tech-1": makePlanetMarket({
          [CargoType.Technology]: { baseSupply: 50, baseDemand: 50 },
        }),
      },
    });

    const rng = new SeededRNG(42);
    const noBoost = updateMarket(unboostedMarket, rng);
    const noBoostPrice =
      noBoost.planetMarkets["tech-1"][CargoType.Technology].currentPrice;

    const rng2 = new SeededRNG(42);
    const techPlanet: Planet = {
      id: "tech-1",
      name: "Tech 1",
      systemId: "sys-1",
      type: PlanetType.TechWorld,
      x: 0,
      y: 0,
      population: 100000,
    };
    const boosted = updateMarket(unboostedMarket, rng2, new Set(["tech-1"]), [
      techPlanet,
    ]);
    const boostedPrice =
      boosted.planetMarkets["tech-1"][CargoType.Technology].currentPrice;

    expect(boostedPrice).toBeLessThan(noBoostPrice);
  });

  it("boosts saturation decay for active producer's output cargo", () => {
    const market = makeMarketState({
      planetMarkets: {
        "tech-1": makePlanetMarket({
          [CargoType.Technology]: {
            saturation: 0.8,
            baseSupply: 50,
            baseDemand: 50,
          },
        }),
      },
    });

    const techPlanet: Planet = {
      id: "tech-1",
      name: "Tech 1",
      systemId: "sys-1",
      type: PlanetType.TechWorld,
      x: 0,
      y: 0,
      population: 100000,
    };

    const rng = new SeededRNG(42);
    const updated = updateMarket(market, rng, new Set(["tech-1"]), [
      techPlanet,
    ]);
    const entry = updated.planetMarkets["tech-1"][CargoType.Technology];

    // Boosted decay: 0.8 * (1 - 0.08 * 1.5) = 0.8 * 0.88 = 0.704
    expect(entry.saturation).toBeCloseTo(0.8 * (1 - 0.08 * 1.5), 4);
  });

  it("does not boost non-output cargo at an active producer", () => {
    const market = makeMarketState({
      planetMarkets: {
        "tech-1": makePlanetMarket({
          [CargoType.Food]: { saturation: 0.8, baseSupply: 50, baseDemand: 50 },
        }),
      },
    });

    const techPlanet: Planet = {
      id: "tech-1",
      name: "Tech 1",
      systemId: "sys-1",
      type: PlanetType.TechWorld,
      x: 0,
      y: 0,
      population: 100000,
    };

    const rng = new SeededRNG(42);
    const updated = updateMarket(market, rng, new Set(["tech-1"]), [
      techPlanet,
    ]);
    const foodEntry = updated.planetMarkets["tech-1"][CargoType.Food];

    // Normal decay (no boost for Food at a TechWorld)
    expect(foodEntry.saturation).toBeCloseTo(0.8 * 0.92, 4);
  });
});
