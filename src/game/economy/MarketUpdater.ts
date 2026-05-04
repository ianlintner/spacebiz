import { CargoType } from "../../data/types.ts";
import type {
  CargoType as CargoTypeT,
  MarketState,
  CargoMarketEntry,
  Planet,
  PlanetMarket,
  Trend,
} from "../../data/types.ts";
import {
  BASE_FUEL_PRICE,
  SATURATION_DECAY_RATE,
  PLANET_CARGO_PROFILES,
  INDUSTRY_INPUT_SUPPLY_MULTIPLIER,
  INDUSTRY_INPUT_DECAY_MULTIPLIER,
} from "../../data/constants.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import { calculatePrice } from "./PriceCalculator.ts";

const ALL_CARGO_TYPES: CargoTypeT[] = Object.values(CargoType);

/**
 * Per-turn market update. Returns a new MarketState (does not mutate input).
 *
 * Steps:
 * 1. Decay saturation (boosted for active industry producer output)
 * 2. Random-walk trends with momentum
 * 3. Recalculate currentPrice (boosted supply for active industry producer output)
 * 4. Fluctuate fuel price with +-0.5 walk, clamped to [50%, 150%] of BASE_FUEL_PRICE
 *
 * activeProducerIds: set of planet IDs whose industry input is active this turn.
 * planets: the galaxy planet list, needed to look up planet type → output cargo.
 * Both default to empty — omitting them disables the industry boost (used by tests
 * that pre-date the feature).
 */
export function updateMarket(
  market: MarketState,
  rng: SeededRNG,
  activeProducerIds: Set<string> = new Set(),
  planets: Planet[] = [],
): MarketState {
  const planetById = new Map(planets.map((p) => [p.id, p]));
  const newPlanetMarkets: Record<string, PlanetMarket> = {};

  for (const planetId of Object.keys(market.planetMarkets)) {
    const planetMarket = market.planetMarkets[planetId];
    const newEntries: Partial<Record<CargoTypeT, CargoMarketEntry>> = {};

    const planet = planetById.get(planetId);
    const isActiveProducer = activeProducerIds.has(planetId);
    const outputCargo: CargoTypeT | null = planet
      ? (PLANET_CARGO_PROFILES[planet.type]?.produces[0] ?? null)
      : null;

    for (const cargoType of ALL_CARGO_TYPES) {
      const entry = planetMarket[cargoType];

      const isOutputCargo = isActiveProducer && cargoType === outputCargo;

      // Step 1: Decay saturation (1.5× faster when input is active)
      const decayRate = isOutputCargo
        ? SATURATION_DECAY_RATE * INDUSTRY_INPUT_DECAY_MULTIPLIER
        : SATURATION_DECAY_RATE;
      const newSaturation = entry.saturation * (1 - decayRate);

      // Step 2: Random-walk trends
      const { trend: newTrend, momentum: newMomentum } = updateTrend(
        entry.trend,
        entry.trendMomentum,
        rng,
      );

      const updatedEntry: CargoMarketEntry = {
        ...entry,
        saturation: newSaturation,
        trend: newTrend,
        trendMomentum: newMomentum,
        eventModifier: entry.eventModifier,
      };

      // Step 3: Recalculate price — apply supply multiplier transiently for
      // active producer output (baseSupply is not mutated; the boost only
      // affects the recalculated currentPrice each turn).
      const effectiveEntry: CargoMarketEntry = isOutputCargo
        ? {
            ...updatedEntry,
            baseSupply:
              updatedEntry.baseSupply * INDUSTRY_INPUT_SUPPLY_MULTIPLIER,
          }
        : updatedEntry;
      updatedEntry.currentPrice = calculatePrice(effectiveEntry, cargoType);

      newEntries[cargoType] = updatedEntry;
    }

    newPlanetMarkets[planetId] = newEntries as PlanetMarket;
  }

  // Step 4: Fluctuate fuel price (additive walk to avoid drift)
  const fuelChange = rng.nextFloat(-0.5, 0.5);
  const newFuelPrice = market.fuelPrice + fuelChange;
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
  if (!rng.chance(0.2)) {
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
      const risingChance =
        momentum > 0 ? 0.1 + momentumBonus : 0.1 - momentumBonus;
      const roll = rng.next();
      if (roll < Math.max(risingChance, 0.02)) {
        newTrend = "rising";
      } else if (
        roll <
        Math.max(risingChance, 0.02) +
          Math.max(0.1 - (momentum > 0 ? momentumBonus : -momentumBonus), 0.02)
      ) {
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
