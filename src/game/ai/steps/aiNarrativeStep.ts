import type {
  AICompany,
  GameState,
  ActiveAINarrativeEffect,
  AITurnSummary,
} from "../../../data/types.ts";
import { AI_NARRATIVE_TEMPLATES } from "../../events/AINarrativeDefinitions.ts";
import type { SeededRNG } from "../../../utils/SeededRNG.ts";

const NARRATIVE_BASE_CHANCE = 0.18;
const PER_AI_INTENSITY_BONUS = 0.12;

export interface NarrativeApplyResult {
  cashAdjustment: number;
  reputationAdjustment: number;
  beat?: AITurnSummary["narrativeBeat"];
  activeNarrativeEffects: ActiveAINarrativeEffect[];
}

function pickFlavor(
  company: AICompany,
  state: GameState,
  rng: SeededRNG,
): "boon" | "bane" {
  const live = state.aiCompanies.filter((c) => !c.bankrupt);
  if (live.length === 0) return rng.chance(0.5) ? "boon" : "bane";
  const cashes = live.map((c) => c.cash);
  const max = Math.max(...cashes);
  const min = Math.min(...cashes);
  const range = max - min || 1;
  const rank = (company.cash - min) / range;
  return rng.chance(rank) ? "bane" : "boon";
}

function substitute(text: string, company: AICompany, state: GameState): string {
  let out = text.replace(/\{company\}/g, company.name);
  if (out.includes("{empire}")) {
    const empire = state.galaxy.empires.find((e) => e.id === company.empireId);
    out = out.replace(/\{empire\}/g, empire?.name ?? "the empire");
  }
  return out;
}

function weightedPick<T extends { weight: number }>(
  rng: SeededRNG,
  items: T[],
): T | null {
  if (items.length === 0) return null;
  const total = items.reduce((s, x) => s + x.weight, 0);
  if (total <= 0) return items[0];
  let roll = rng.nextFloat(0, total);
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function applyEffectsToTurn(
  effects: ActiveAINarrativeEffect[],
  turnRevenue: number,
  turnMaintenance: number,
): { cashAdjustment: number; reputationAdjustment: number } {
  let cashAdjustment = 0;
  let reputationAdjustment = 0;
  for (const effect of effects) {
    if (effect.revenueMultiplier !== undefined) {
      cashAdjustment += turnRevenue * (effect.revenueMultiplier - 1);
    }
    if (effect.maintenanceMultiplier !== undefined) {
      cashAdjustment -= turnMaintenance * (effect.maintenanceMultiplier - 1);
    }
  }
  return { cashAdjustment, reputationAdjustment };
}

/**
 * Decide whether the storyteller fires a narrative beat for this AI this turn.
 * If it fires, the one-shot deltas (cashDelta, reputationDelta) are returned
 * for immediate application, and the multiplier effects are added to
 * activeNarrativeEffects to tick down on subsequent turns.
 *
 * Existing activeNarrativeEffects are also evaluated against this turn's
 * revenue/maintenance numbers and contribute to cashAdjustment.
 */
export function applyAINarrativeEvents(
  company: AICompany,
  state: GameState,
  rng: SeededRNG,
  turnRevenue: number,
  turnMaintenance: number,
): NarrativeApplyResult {
  // 1. Tick down existing effects (consume one turn).
  const existingActive: ActiveAINarrativeEffect[] = (
    company.activeNarrativeEffects ?? []
  )
    .map((e) => ({ ...e, remainingTurns: e.remainingTurns - 1 }))
    .filter((e) => e.remainingTurns > 0);

  // 2. Apply existing-effect multipliers to this turn's numbers.
  const { cashAdjustment: existingCash, reputationAdjustment: existingRep } =
    applyEffectsToTurn(existingActive, turnRevenue, turnMaintenance);

  // 3. Decide whether to fire a fresh beat.
  let cashAdjustment = existingCash;
  let reputationAdjustment = existingRep;
  let beat: AITurnSummary["narrativeBeat"] | undefined;
  let nextActive = existingActive;

  // Avoid stacking: don't fire a new beat if the AI already has 2+ active effects.
  const headwindBias = state.storyteller.headwindBias;
  // Rivals do BETTER when player is doing well (negative headwindBias means player struggling, so AI should flounder).
  // Use the opposite of the player's bias to skew AI fortunes — when player struggles, AI gets banes; when player dominates, AI gets boons (catch-up for trailing AI is handled by pickFlavor).
  let chance = NARRATIVE_BASE_CHANCE + Math.abs(headwindBias) * PER_AI_INTENSITY_BONUS;
  if (existingActive.length >= 2) chance = 0;

  if (rng.nextFloat(0, 1) < chance) {
    const flavor = pickFlavor(company, state, rng);
    const eligible = AI_NARRATIVE_TEMPLATES.filter((t) => t.flavor === flavor);
    const template = weightedPick(rng, eligible);
    if (template) {
      const headline = substitute(template.headline, company, state);
      beat = {
        templateId: template.id,
        headline,
        tooltip: template.tooltip,
        flavor: template.flavor,
      };

      // One-shot deltas
      if (template.effect.cashDelta) {
        cashAdjustment += template.effect.cashDelta;
      }
      if (template.effect.reputationDelta) {
        reputationAdjustment += template.effect.reputationDelta;
      }

      // If the effect carries multiplier components or persists, retain it.
      const persistsBeyondThisTurn = template.effect.duration > 1;
      const hasMultiplier =
        template.effect.revenueMultiplier !== undefined ||
        template.effect.maintenanceMultiplier !== undefined;

      if (hasMultiplier) {
        // Apply this turn's multiplier contribution immediately.
        const thisTurn = applyEffectsToTurn(
          [
            {
              templateId: template.id,
              headline,
              remainingTurns: template.effect.duration,
              ...template.effect,
            },
          ],
          turnRevenue,
          turnMaintenance,
        );
        cashAdjustment += thisTurn.cashAdjustment;

        if (persistsBeyondThisTurn) {
          nextActive = [
            ...existingActive,
            {
              templateId: template.id,
              headline,
              remainingTurns: template.effect.duration - 1,
              ...template.effect,
            },
          ];
        }
      }
    }
  }

  return {
    cashAdjustment,
    reputationAdjustment,
    beat,
    activeNarrativeEffects: nextActive,
  };
}
