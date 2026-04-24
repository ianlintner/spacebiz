import { TECH_TREE } from "../../data/constants.ts";
import type { AICompany, GameState } from "../../data/types.ts";
import { TechBranch } from "../../data/types.ts";
import { getAITechBranch } from "../ai/steps/aiTechStep.ts";

// ---------------------------------------------------------------------------
// Intel Level — gates rival visibility based on Intelligence tech (Wave 3.4)
// ---------------------------------------------------------------------------

export type IntelTier = 0 | 1 | 2 | 3 | 4;

/**
 * A view of a rival company filtered by the player's Intel tier.
 *
 * - Tier 0 (no intel tech): rank, score, companyName, ceoName only
 * - Tier 1 (intelligence_1): + techBranch, techTier
 * - Tier 2 (intelligence_2): + hubTier, contractsCompleted
 * - Tier 3 (intelligence_3): + routeCount, fleetSize
 * - Tier 4 (intelligence_4): + cash
 */
export interface RivalIntelView {
  companyId: string;
  companyName: string;
  ceoName: string;
  // Always visible:
  rank: number;
  score: number;
  bankrupt: boolean;
  // Intel T1+:
  techBranch?: string;
  techTier?: number;
  // Intel T2+:
  hubTier?: number;
  contractsCompleted?: number;
  // Intel T3+:
  routeCount?: number;
  fleetSize?: number;
  // Intel T4+:
  cash?: number;
}

/**
 * Determine the player's current Intel tier from completed Intelligence techs.
 * Returns 0-4 based on how many Intelligence branch techs are completed.
 */
export function getIntelTier(state: GameState): IntelTier {
  const intelligenceTechs = TECH_TREE.filter(
    (t) => t.branch === TechBranch.Intelligence,
  ).sort((a, b) => a.tier - b.tier);

  let tier = 0;
  for (const tech of intelligenceTechs) {
    if (state.tech.completedTechIds.includes(tech.id)) {
      tier = tech.tier;
    }
  }

  return Math.min(4, tier) as IntelTier;
}

/**
 * Build a rival view object with fields populated up to the given Intel tier.
 * Fields above the current tier are omitted (undefined).
 *
 * @param company The AI company to view
 * @param intelTier The player's current Intel tier (0-4)
 * @param rank The company's rank in the leaderboard (1-based)
 * @param score The company's computed score
 */
export function buildRivalView(
  company: AICompany,
  intelTier: IntelTier,
  rank: number = 0,
  score: number = 0,
): RivalIntelView {
  const view: RivalIntelView = {
    companyId: company.id,
    companyName: company.name,
    ceoName: company.ceoName,
    rank,
    score,
    bankrupt: company.bankrupt,
  };

  // Tier 1: tech branch + tech tier
  if (intelTier >= 1) {
    const branch = getAITechBranch(company.personality);
    view.techBranch = branch;

    // Tech tier = highest completed tier in their assigned branch
    const completedIds = company.techState?.completedTechIds ?? [];
    const branchTechs = TECH_TREE.filter(
      (t) => t.branch === branch && completedIds.includes(t.id),
    );
    view.techTier = branchTechs.length > 0
      ? Math.max(...branchTechs.map((t) => t.tier))
      : 0;
  }

  // Tier 2: hub tier + contracts completed
  if (intelTier >= 2) {
    view.hubTier = company.aiHub?.tier ?? 0;
    view.contractsCompleted = company.contractsCompleted ?? 0;
  }

  // Tier 3: route count + fleet size
  if (intelTier >= 3) {
    view.routeCount = company.activeRoutes.length;
    view.fleetSize = company.fleet.length;
  }

  // Tier 4: cash
  if (intelTier >= 4) {
    view.cash = company.cash;
  }

  return view;
}

/**
 * Get a human-readable description of what the next Intel tier unlocks.
 * Returns null if already at max tier.
 */
export function getNextIntelUnlockDescription(
  intelTier: IntelTier,
): string | null {
  switch (intelTier) {
    case 0:
      return "Research Intelligence T1 to reveal rivals' tech branch and tier";
    case 1:
      return "Research Intelligence T2 to reveal rivals' hub level and contract history";
    case 2:
      return "Research Intelligence T3 to reveal rivals' route count and fleet size";
    case 3:
      return "Research Intelligence T4 to reveal rivals' cash reserves";
    case 4:
      return null; // max tier
  }
}
