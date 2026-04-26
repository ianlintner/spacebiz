import { AIPersonality, TechBranch } from "../../../data/types.ts";
import type { AICompany, GameState, TechState } from "../../../data/types.ts";
import { TECH_TREE } from "../../../data/constants.ts";
import type { SeededRNG } from "../../../utils/SeededRNG.ts";

// ---------------------------------------------------------------------------
// AI Tech Research (Wave 3 — Track 3.1)
// ---------------------------------------------------------------------------

// AI RP accumulation per turn (flat — no diversity bonus)
const AI_RP_PER_TURN = 1;

// AI skips T4 techs — too expensive for the AI simulation budget
const AI_MAX_TECH_TIER = 3;

/**
 * Get which tech branch an AI should research based on personality.
 *  - AggressiveExpander → Engineering (maintenance/fuel savings, more uptime)
 *  - SteadyHauler → Logistics (route slots, lower license fees)
 *  - CherryPicker → Crisis (event mitigation, breakdown protection)
 *
 * NOTE: Intelligence branch is intentionally excluded from AI to preserve
 * info asymmetry — the player should have exclusive access to market intel.
 */
export function getAITechBranch(
  personality: (typeof AIPersonality)[keyof typeof AIPersonality],
): (typeof TechBranch)[keyof typeof TechBranch] {
  switch (personality) {
    case AIPersonality.AggressiveExpander:
      return TechBranch.Engineering;
    case AIPersonality.SteadyHauler:
      return TechBranch.Logistics;
    case AIPersonality.CherryPicker:
      return TechBranch.Crisis;
    default:
      return TechBranch.Engineering;
  }
}

/**
 * Get the next tech to research in the AI's assigned branch.
 * Returns the lowest-tier un-completed tech in the branch (up to AI_MAX_TECH_TIER).
 */
function getNextTechInBranch(
  branch: (typeof TechBranch)[keyof typeof TechBranch],
  techState: TechState,
): string | null {
  const branchTechs = TECH_TREE.filter(
    (t) =>
      t.branch === branch &&
      t.tier <= AI_MAX_TECH_TIER &&
      !techState.completedTechIds.includes(t.id),
  ).sort((a, b) => a.tier - b.tier);

  if (branchTechs.length === 0) return null;

  const next = branchTechs[0];

  // Verify prerequisites are met (all lower tiers in branch complete)
  if (next.tier > 1) {
    const prereqs = TECH_TREE.filter(
      (t) => t.branch === next.branch && t.tier < next.tier,
    );
    const allMet = prereqs.every((p) =>
      techState.completedTechIds.includes(p.id),
    );
    if (!allMet) return null;
  }

  return next.id;
}

/**
 * Process AI tech research for one turn.
 * - Initializes techState if missing
 * - Picks the next tech in personality-assigned branch if not currently researching
 * - Accumulates 1 RP per turn
 * - Completes tech when RP >= cost (excess carries over)
 */
export function processAITech(
  company: AICompany,
  _state: GameState,
  _rng: SeededRNG,
): AICompany {
  // Initialize tech state if not present
  let techState: TechState = company.techState ?? {
    researchPoints: 0,
    completedTechIds: [],
    currentResearchId: null,
    researchProgress: 0,
  };

  // Pick branch based on personality if no current research queued
  if (!techState.currentResearchId) {
    const branch = getAITechBranch(company.personality);
    const nextTechId = getNextTechInBranch(branch, techState);
    if (nextTechId) {
      techState = { ...techState, currentResearchId: nextTechId };
    }
  }

  // Accumulate 1 RP per turn
  techState = {
    ...techState,
    researchPoints: techState.researchPoints + AI_RP_PER_TURN,
    researchProgress: techState.researchProgress + AI_RP_PER_TURN,
  };

  // Check for tech completion
  if (techState.currentResearchId) {
    const currentTech = TECH_TREE.find(
      (t) => t.id === techState.currentResearchId,
    );
    if (currentTech && techState.researchProgress >= currentTech.rpCost) {
      const excess = techState.researchProgress - currentTech.rpCost;
      techState = {
        ...techState,
        completedTechIds: [...techState.completedTechIds, currentTech.id],
        currentResearchId: null,
        researchProgress: excess,
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
    const tech = TECH_TREE.find((t) => t.id === techId);
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
    const tech = TECH_TREE.find((t) => t.id === techId);
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
    const tech = TECH_TREE.find((t) => t.id === techId);
    if (!tech) continue;
    for (const effect of tech.effects) {
      if (effect.type === "modifyRevenue") {
        total += effect.value;
      }
    }
  }
  return 1 + total;
}
