import { AIPersonality, TechBranch } from "../../../data/types.ts";
import type { AICompany, GameState, TechState } from "../../../data/types.ts";
import { TECH_GRAPH, AI_TECH_STRATEGIES } from "../../../data/constants.ts";
import {
  effectiveCost,
  applyPurchase,
  isTechAvailable,
} from "../../tech/TechTree.ts";
import type { SeededRNG } from "../../../utils/SeededRNG.ts";

// ---------------------------------------------------------------------------
// AI Tech Research (Wave 3 — Track 3.1, rewritten for strategy arrays)
// ---------------------------------------------------------------------------

// AI RP accumulation per turn (flat — no diversity bonus)
const AI_RP_PER_TURN = 1;

// Cheap tech threshold for opportunistic grabs
const OPPORTUNISTIC_COST_CAP = 8;

// Probability of taking an opportunistic cheap tech instead of strategy target
const OPPORTUNISTIC_CHANCE = 0.1;

/**
 * Map AIPersonality value → AI_TECH_STRATEGIES key.
 * Since AIPersonality values ARE the strategy keys, this is a passthrough,
 * but kept explicit for clarity and type safety.
 */
function personalityToStrategyKey(
  personality: (typeof AIPersonality)[keyof typeof AIPersonality],
): string {
  return personality;
}

/**
 * Get which tech branch an AI should research based on personality.
 *  - AggressiveExpander → Logistics (route slots, schedule efficiency)
 *  - SteadyHauler → Engineering (maintenance/fuel savings, more uptime)
 *  - CherryPicker → Crisis (event mitigation, breakdown protection)
 *
 * NOTE: Intelligence branch is intentionally excluded from AI to preserve
 * info asymmetry — the player should have exclusive access to market intel.
 *
 * @deprecated Used only by IntelLevel.ts for the intel-view tech branch display.
 *   New AI decisions use strategy arrays via getNextStrategyTarget instead.
 */
export function getAITechBranch(
  personality: (typeof AIPersonality)[keyof typeof AIPersonality],
): (typeof TechBranch)[keyof typeof TechBranch] {
  switch (personality) {
    case AIPersonality.AggressiveExpander:
      return TechBranch.Logistics;
    case AIPersonality.SteadyHauler:
      return TechBranch.Engineering;
    case AIPersonality.CherryPicker:
      return TechBranch.Crisis;
    default:
      return TechBranch.Engineering;
  }
}

/**
 * Find the next tech the AI should purchase according to its strategy array.
 *
 * The strategy array is an ordered list of tech IDs, potentially with repeats
 * to express "buy this N times". We compare the desired count (number of
 * occurrences of each id up to the current position) against purchaseCount.
 *
 * Returns the first id where purchaseCount < desired count AND the tech is
 * currently available (adjacency satisfied). Returns null if the strategy is
 * complete or the next required tech is not yet available.
 */
export function getNextStrategyTarget(
  strategyKey: string,
  tech: TechState,
): string | null {
  const strategy =
    AI_TECH_STRATEGIES[strategyKey] ?? AI_TECH_STRATEGIES["steadyHauler"];

  // Build wanted counts: how many times each id appears in strategy array
  const wantedCounts: Record<string, number> = {};
  for (const id of strategy) {
    wantedCounts[id] = (wantedCounts[id] ?? 0) + 1;
  }

  // Walk the strategy in order; return first id we haven't bought enough yet
  // (preserves ordering so earlier priorities are fulfilled first)
  for (const id of strategy) {
    const have = tech.purchaseCount[id] ?? 0;
    const want = wantedCounts[id];
    if (have < want && isTechAvailable(id, tech)) return id;
  }

  return null;
}

/**
 * Find a cheap (rpCost <= OPPORTUNISTIC_COST_CAP) available tech that is not
 * already in the strategy path, for occasional opportunistic purchases.
 * Returns null if none exists.
 */
function getOpportunisticTarget(
  strategyKey: string,
  tech: TechState,
): string | null {
  const strategy =
    AI_TECH_STRATEGIES[strategyKey] ?? AI_TECH_STRATEGIES["steadyHauler"];
  const strategySet = new Set(strategy);

  const candidates = TECH_GRAPH.filter(
    (t) =>
      t.rpCost <= OPPORTUNISTIC_COST_CAP &&
      !strategySet.has(t.id) &&
      isTechAvailable(t.id, tech),
  );

  if (candidates.length === 0) return null;
  return candidates[0].id;
}

/**
 * Process AI tech research for one turn.
 * - Initialises techState if missing
 * - Accumulates 1 RP per turn
 * - 10% chance: buys a cheap adjacent tech opportunistically
 * - Otherwise: follows the company's strategy array (purchaseCount-based)
 * - Deducts RP when purchasing; excess carries over
 */
export function processAITech(
  company: AICompany,
  _state: GameState,
  rng: SeededRNG,
): AICompany {
  // Initialize tech state if not present
  let techState: TechState = company.techState ?? {
    researchPoints: 0,
    completedTechIds: [],
    currentResearchId: null,
    researchProgress: 0,
    purchaseCount: {},
    queue: [],
  };

  // Accumulate 1 RP per turn
  techState = {
    ...techState,
    researchPoints: techState.researchPoints + AI_RP_PER_TURN,
  };

  const strategyKey = personalityToStrategyKey(company.personality);

  // Determine target tech (opportunistic 10% or strategy-driven)
  let targetId: string | null = null;

  if (rng.next() < OPPORTUNISTIC_CHANCE) {
    targetId = getOpportunisticTarget(strategyKey, techState);
  }

  if (!targetId) {
    targetId = getNextStrategyTarget(strategyKey, techState);
  }

  // Purchase if we have a target and enough RP
  if (targetId !== null) {
    const cost = effectiveCost(targetId, techState);
    if (techState.researchPoints >= cost) {
      techState = applyPurchase(targetId, {
        ...techState,
        researchPoints: techState.researchPoints - cost,
      });
      // Keep currentResearchId in sync for display/intel purposes
      techState = {
        ...techState,
        currentResearchId: null,
        researchProgress: 0,
      };
    } else {
      // Saving up — note the target for display purposes
      techState = {
        ...techState,
        currentResearchId: targetId,
        researchProgress: techState.researchPoints,
      };
    }
  }

  return { ...company, techState };
}

/**
 * Get the maintenance multiplier from AI tech.
 * Mirrors getMaintenanceMultiplier from TechEffects.ts but works on TechState.
 */
export function getAIMaintenanceMultiplier(techState: TechState): number {
  let total = 0;
  for (const techId of techState.completedTechIds) {
    const tech = TECH_GRAPH.find((t) => t.id === techId);
    if (!tech) continue;
    for (const effect of tech.effects) {
      if (effect.type === "modifyMaintenance") {
        total += effect.value;
      }
    }
  }
  return Math.max(0, 1 + total);
}

/**
 * Get the fuel multiplier from AI tech.
 */
export function getAIFuelMultiplier(techState: TechState): number {
  let total = 0;
  for (const techId of techState.completedTechIds) {
    const tech = TECH_GRAPH.find((t) => t.id === techId);
    if (!tech) continue;
    for (const effect of tech.effects) {
      if (effect.type === "modifyFuel") {
        total += effect.value;
      }
    }
  }
  return Math.max(0, 1 + total);
}

/**
 * Get the revenue multiplier from AI tech.
 */
export function getAIRevenueMultiplier(techState: TechState): number {
  let total = 0;
  for (const techId of techState.completedTechIds) {
    const tech = TECH_GRAPH.find((t) => t.id === techId);
    if (!tech) continue;
    for (const effect of tech.effects) {
      if (effect.type === "modifyRevenue") {
        total += effect.value;
      }
    }
  }
  return 1 + total;
}
