import type { CargoMarketEntry, CargoType } from "../../data/types.ts";
import {
  BASE_CARGO_PRICES,
  SATURATION_PRICE_IMPACT,
} from "../../data/constants.ts";

/**
 * Calculate the current price for a cargo type at a given market entry.
 *
 * Formula:
 *   price = basePrice * demandMultiplier * (1 - saturation * SATURATION_PRICE_IMPACT) * trendModifier * eventModifier
 *
 * Where:
 *   - basePrice comes from BASE_CARGO_PRICES
 *   - demandMultiplier = baseDemand / baseSupply, clamped to [0.5, 3.0]
 *   - saturation is 0-1 (0-100%)
 *   - trendModifier: rising=1.15, stable=1.0, falling=0.85
 *   - eventModifier from CargoMarketEntry.eventModifier (default 1.0)
 */
export function calculatePrice(
  entry: CargoMarketEntry,
  cargoType: CargoType,
): number {
  const basePrice = BASE_CARGO_PRICES[cargoType];

  // Demand/supply ratio, clamped to [0.5, 3.0]
  const rawRatio = entry.baseDemand / entry.baseSupply;
  const demandMultiplier = Math.min(3.0, Math.max(0.5, rawRatio));

  // Saturation reduces price: 0 saturation = no reduction, 1.0 saturation = 60% reduction
  const saturationFactor = 1 - entry.saturation * SATURATION_PRICE_IMPACT;

  // Trend modifier
  const trendModifier = getTrendModifier(entry.trend);

  // Event modifier (default 1.0)
  const eventModifier = entry.eventModifier;

  const price =
    basePrice *
    demandMultiplier *
    saturationFactor *
    trendModifier *
    eventModifier;

  // Round to 2 decimal places
  return Math.round(price * 100) / 100;
}

function getTrendModifier(trend: CargoMarketEntry["trend"]): number {
  switch (trend) {
    case "rising":
      return 1.15;
    case "stable":
      return 1.0;
    case "falling":
      return 0.85;
  }
}
