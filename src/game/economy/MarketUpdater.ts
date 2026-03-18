import { CargoType } from "../../data/types.ts";
import type {
  CargoType as CargoTypeT,
  MarketState,
  CargoMarketEntry,
  PlanetMarket,
  Trend,
} from "../../data/types.ts";
import {
  BASE_FUEL_PRICE,
  SATURATION_DECAY_RATE,
} from "../../data/constants.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import { calculatePrice } from "./PriceCalculator.ts";

const ALL_CARGO_TYPES: CargoTypeT[] = Object.values(CargoType);

/**
 * Per-turn market update. Returns a new MarketState (does not mutate input).
 *
 * Steps:
 * 1. Decay saturation by SATURATION_DECAY_RATE (multiply by 1 - rate)
 * 2. Random-walk trends with momentum
 * 3. Recalculate currentPrice for every entry
 * 4. Fluctuate fuel price with +-5% random walk, clamped to [50%, 150%] of BASE_FUEL_PRICE
 */
export function updateMarket(
  market: MarketState,
  rng: SeededRNG,
): MarketState {
  const newPlanetMarkets: Record<string, PlanetMarket> = {};

  for (const planetId of Object.keys(market.planetMarkets)) {
    const planetMarket = market.planetMarkets[planetId];
    const newEntries: Partial<Record<CargoTypeT, CargoMarketEntry>> = {};

    for (const cargoType of ALL_CARGO_TYPES) {
      const entry = planetMarket[cargoType];

      // Step 1: Decay saturation
      const newSaturation = entry.saturation * (1 - SATURATION_DECAY_RATE);

      // Step 2: Random-walk trends
      const { trend: newTrend, momentum: newMomentum } = updateTrend(
        entry.trend,
        entry.trendMomentum,
        rng,
      );

      // Build updated entry (without price yet)
      const updatedEntry: CargoMarketEntry = {
        ...entry,
        saturation: newSaturation,
        trend: newTrend,
        trendMomentum: newMomentum,
        eventModifier: entry.eventModifier,
      };

      // Step 3: Recalculate price
      updatedEntry.currentPrice = calculatePrice(updatedEntry, cargoType);

      newEntries[cargoType] = updatedEntry;
    }

    newPlanetMarkets[planetId] = newEntries as PlanetMarket;
  }

  // Step 4: Fluctuate fuel price
  const fuelChange = rng.nextFloat(-0.05, 0.05);
  const newFuelPrice = market.fuelPrice * (1 + fuelChange);
  const minFuel = BASE_FUEL_PRICE * 0.5;
  const maxFuel = BASE_FUEL_PRICE * 1.5;
  const clampedFuelPrice = Math.min(maxFuel, Math.max(minFuel, newFuelPrice));

  return {
    fuelPrice: Math.round(clampedFuelPrice * 100) / 100,
    fuelTrend: market.fuelTrend,
    planetMarkets: newPlanetMarkets,
  };
}

/**
 * Update trend with random walk and momentum.
 *
 * Base shift probabilities (20% chance of any shift):
 *   rising  -> stable (15%), falling (5%)
 *   stable  -> rising (10%), falling (10%)
 *   falling -> stable (15%), rising (5%)
 *
 * Momentum makes consecutive same-direction shifts more likely.
 */
function updateTrend(
  currentTrend: Trend,
  momentum: number,
  rng: SeededRNG,
): { trend: Trend; momentum: number } {
  // 20% base chance of any shift
  if (!rng.chance(0.20)) {
    return { trend: currentTrend, momentum };
  }

  // Momentum bonus: each point of momentum adds 5% to continuing same direction
  const momentumBonus = Math.abs(momentum) * 0.05;

  let newTrend: Trend = currentTrend;

  switch (currentTrend) {
    case "rising": {
      // Base: 15% stable, 5% falling
      // With momentum: harder to shift away from the direction
      const fallChance = Math.max(0.05 - momentumBonus, 0.01);
      const stableChance = Math.max(0.15 - momentumBonus * 0.5, 0.05);

      const roll = rng.next();
      if (roll < fallChance) {
        newTrend = "falling";
      } else if (roll < fallChance + stableChance) {
        newTrend = "stable";
      }
      // else stays rising
      break;
    }
    case "stable": {
      // Base: 10% rising, 10% falling
      // Momentum shifts toward whatever direction momentum points
      const risingChance = momentum > 0 ? 0.10 + momentumBonus : 0.10 - momentumBonus;
      const roll = rng.next();
      if (roll < Math.max(risingChance, 0.02)) {
        newTrend = "rising";
      } else if (roll < Math.max(risingChance, 0.02) + Math.max(0.10 - (momentum > 0 ? momentumBonus : -momentumBonus), 0.02)) {
        newTrend = "falling";
      }
      break;
    }
    case "falling": {
      // Base: 15% stable, 5% rising
      const riseChance = Math.max(0.05 - momentumBonus, 0.01);
      const stableChance = Math.max(0.15 - momentumBonus * 0.5, 0.05);

      const roll = rng.next();
      if (roll < riseChance) {
        newTrend = "rising";
      } else if (roll < riseChance + stableChance) {
        newTrend = "stable";
      }
      // else stays falling
      break;
    }
  }

  // Update momentum based on trend direction
  let newMomentum = momentum;
  if (newTrend === "rising") {
    newMomentum = Math.min(momentum + 1, 5);
  } else if (newTrend === "falling") {
    newMomentum = Math.max(momentum - 1, -5);
  } else {
    // Stable: decay momentum toward 0
    if (newMomentum > 0) newMomentum--;
    else if (newMomentum < 0) newMomentum++;
  }

  return { trend: newTrend, momentum: newMomentum };
}
