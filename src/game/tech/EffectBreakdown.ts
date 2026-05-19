import type { TechEffect, TechState } from "../../data/types.ts";
import { TECH_GRAPH } from "../../data/constants.ts";

export interface EffectSource {
  techId: string;
  techName: string;
  contribution: number;
}

export interface EffectEntry {
  effectType: TechEffect["type"];
  /** Display label (e.g. "Fuel Cost", "Route Slots"). */
  label: string;
  /** How to format the value (percent for multipliers, flat for counts). */
  format: "percent" | "flat";
  /** Net value across all sources. For percent effects this is a fraction (e.g. -0.05). */
  value: number;
  /** UI sign — for color coding. Negative fuel/cost is "positive" for the player; we keep raw sign here and let the UI decide. */
  sign: "positive" | "negative";
  sources: EffectSource[];
}

// Display metadata per effect type. Format rule:
//   percent — value is a fraction; UI renders as ±X%
//   flat    — value is a number; UI renders as ±N
const EFFECT_META: Record<
  TechEffect["type"],
  { label: string; format: "percent" | "flat" }
> = {
  addRouteSlots: { label: "Route Slots", format: "flat" },
  modifyLicenseFee: { label: "License Fees", format: "percent" },
  modifyTariff: { label: "Tariffs", format: "percent" },
  modifyMaintenance: { label: "Maintenance", format: "percent" },
  modifyFuel: { label: "Fuel Cost", format: "percent" },
  modifyConditionDecay: { label: "Condition Decay", format: "percent" },
  modifyRevenue: { label: "Route Revenue", format: "percent" },
  addTripsPerTurn: { label: "Trips per Turn", format: "flat" },
  addCargoTypesPerPair: { label: "Cargo Types / Pair", format: "flat" },
  modifySaturation: { label: "Saturation Floor", format: "percent" },
  modifyEventDuration: { label: "Event Duration", format: "percent" },
  modifyEventCash: { label: "Event Cash", format: "percent" },
  addAutoRepair: { label: "Auto-Repair / Turn", format: "flat" },
  modifyOverhaulCost: { label: "Overhaul Cost", format: "percent" },
  addEmbargoImmunity: { label: "Embargo Immunity", format: "flat" },
  addMothballRefund: { label: "Mothball Refund", format: "percent" },
  addBreakdownRevenue: { label: "Breakdown Revenue", format: "percent" },
  addMarketForecast: { label: "Market Forecast", format: "flat" },
  addSaturationDisplay: { label: "Saturation Display", format: "flat" },
  addMarketReset: { label: "Market Resets", format: "flat" },
  addRPPerTurn: { label: "RP per Turn", format: "flat" },
  addFreightCapacity: { label: "Freight Capacity", format: "flat" },
  addPassengerCapacity: { label: "Passenger Capacity", format: "flat" },
  upgradeFreightHull: { label: "Freight Hull Mark", format: "flat" },
  upgradePassengerHull: { label: "Passenger Hull Mark", format: "flat" },
};

export function getEffectBreakdown(tech: TechState): EffectEntry[] {
  // Map of effectType → accumulator
  const byType = new Map<
    TechEffect["type"],
    { value: number; sources: Map<string, EffectSource> }
  >();

  for (const [techId, count] of Object.entries(tech.purchaseCount)) {
    if (count <= 0) continue;
    const node = TECH_GRAPH.find((n) => n.id === techId);
    if (!node) continue;
    for (const effect of node.effects) {
      const contribution = effect.value * count;
      const entry = byType.get(effect.type) ?? {
        value: 0,
        sources: new Map(),
      };
      entry.value += contribution;
      const existing = entry.sources.get(techId);
      if (existing) {
        existing.contribution += contribution;
      } else {
        entry.sources.set(techId, {
          techId,
          techName: node.name,
          contribution,
        });
      }
      byType.set(effect.type, entry);
    }
  }

  const result: EffectEntry[] = [];
  for (const [effectType, agg] of byType) {
    if (agg.value === 0) continue;
    const meta = EFFECT_META[effectType];
    result.push({
      effectType,
      label: meta.label,
      format: meta.format,
      value: agg.value,
      sign: agg.value > 0 ? "positive" : "negative",
      sources: [...agg.sources.values()],
    });
  }
  return result;
}
