import type { GameState, TechEffect } from "../../data/types.ts";
import { TECH_TREE } from "../../data/constants.ts";

// ---------------------------------------------------------------------------
// Tech Effect Queries
// ---------------------------------------------------------------------------

/**
 * Get the cumulative value of a specific effect type across all completed techs.
 */
export function getTechEffectTotal(
  state: GameState,
  effectType: TechEffect["type"],
  target?: "friendly" | "neutral" | "hostile" | "all",
): number {
  let total = 0;
  for (const techId of state.tech.completedTechIds) {
    const tech = TECH_TREE.find((t) => t.id === techId);
    if (!tech) continue;
    for (const effect of tech.effects) {
      if (effect.type !== effectType) continue;
      if (
        target &&
        effect.target &&
        effect.target !== target &&
        effect.target !== "all"
      )
        continue;
      total += effect.value;
    }
  }
  return total;
}

/**
 * Check if a specific tech effect exists in any completed tech.
 */
export function hasTechEffect(
  state: GameState,
  effectType: TechEffect["type"],
): boolean {
  for (const techId of state.tech.completedTechIds) {
    const tech = TECH_TREE.find((t) => t.id === techId);
    if (!tech) continue;
    if (tech.effects.some((e) => e.type === effectType)) return true;
  }
  return false;
}

/**
 * Get the extra route slots granted by completed tech.
 */
export function getTechRouteSlotBonus(state: GameState): number {
  return getTechEffectTotal(state, "addRouteSlots");
}

/**
 * Get the license fee multiplier (1.0 = base, 0.9 = -10%, etc.).
 */
export function getLicenseFeeMultiplier(state: GameState): number {
  return 1 + getTechEffectTotal(state, "modifyLicenseFee");
}

/**
 * Get the tariff multiplier for a given empire disposition.
 */
export function getTariffMultiplier(
  state: GameState,
  disposition: "friendly" | "neutral" | "hostile",
): number {
  // Gather effects that apply to this disposition or to "all"
  let total = 0;
  for (const techId of state.tech.completedTechIds) {
    const tech = TECH_TREE.find((t) => t.id === techId);
    if (!tech) continue;
    for (const effect of tech.effects) {
      if (effect.type !== "modifyTariff") continue;
      if (
        !effect.target ||
        effect.target === "all" ||
        effect.target === disposition
      ) {
        total += effect.value;
      }
    }
  }
  return Math.max(0, 1 + total);
}

/**
 * Get the maintenance cost multiplier.
 */
export function getMaintenanceMultiplier(state: GameState): number {
  return Math.max(0, 1 + getTechEffectTotal(state, "modifyMaintenance"));
}

/**
 * Get the fuel cost multiplier.
 */
export function getFuelMultiplier(state: GameState): number {
  return Math.max(0, 1 + getTechEffectTotal(state, "modifyFuel"));
}

/**
 * Get the revenue multiplier from tech.
 */
export function getRevenueMultiplier(state: GameState): number {
  return 1 + getTechEffectTotal(state, "modifyRevenue");
}

/**
 * Get the condition decay multiplier (e.g. 0.7 = 30% slower).
 */
export function getConditionDecayMultiplier(state: GameState): number {
  return Math.max(0, 1 + getTechEffectTotal(state, "modifyConditionDecay"));
}

/**
 * Get the auto-repair value per turn.
 */
export function getAutoRepairPerTurn(state: GameState): number {
  return getTechEffectTotal(state, "addAutoRepair");
}

/**
 * Get the bonus trips per turn for intra-empire routes.
 */
export function getIntraEmpireTripBonus(state: GameState): number {
  return getTechEffectTotal(state, "addTripsPerTurn");
}
