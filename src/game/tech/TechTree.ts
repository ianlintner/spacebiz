import type { GameState, TechState, Technology } from "../../data/types.ts";
import {
  TECH_TREE,
  BASE_RP_PER_TURN,
  RP_DIVERSITY_THRESHOLD,
  RP_RESEARCH_PLANET_BONUS,
} from "../../data/constants.ts";

// ---------------------------------------------------------------------------
// Tech Research Manager
// ---------------------------------------------------------------------------

/**
 * Check if a technology is available for research (prerequisites met).
 */
export function isTechAvailable(techId: string, tech: TechState): boolean {
  if (tech.completedTechIds.includes(techId)) return false;
  if (tech.currentResearchId === techId) return false;

  const techDef = TECH_TREE.find((t) => t.id === techId);
  if (!techDef) return false;

  // Must complete all lower tiers in the same branch first
  if (techDef.tier > 1) {
    const prerequisites = TECH_TREE.filter(
      (t) => t.branch === techDef.branch && t.tier < techDef.tier,
    );
    for (const prereq of prerequisites) {
      if (!tech.completedTechIds.includes(prereq.id)) return false;
    }
  }

  return true;
}

/**
 * Get all available technologies for research.
 */
export function getAvailableTechs(tech: TechState): Technology[] {
  return TECH_TREE.filter((t) => isTechAvailable(t.id, tech));
}

/**
 * Set the current research target.
 * Returns updated TechState or null if invalid.
 */
export function setResearchTarget(
  techId: string,
  tech: TechState,
): TechState | null {
  if (!isTechAvailable(techId, tech)) return null;

  return {
    ...tech,
    currentResearchId: techId,
    // Keep accumulated progress — it carries over
  };
}

/**
 * Calculate total RP earned this turn from all sources.
 */
export function calculateRPPerTurn(state: GameState): number {
  let rp = BASE_RP_PER_TURN;

  // Diversity bonus: +1 RP if trading N+ distinct cargo types
  const distinctCargos = new Set(
    state.activeRoutes
      .filter((r) => r.cargoType && r.assignedShipIds.length > 0)
      .map((r) => r.cargoType),
  );
  if (distinctCargos.size >= RP_DIVERSITY_THRESHOLD) {
    rp += 1;
  }

  // Tech world bonus: +0.5 per route to/from techWorld-type planets
  const researchPlanets = new Set(
    state.galaxy.planets.filter((p) => p.type === "techWorld").map((p) => p.id),
  );
  let researchRouteCount = 0;
  for (const route of state.activeRoutes) {
    if (route.assignedShipIds.length === 0) continue;
    if (
      researchPlanets.has(route.originPlanetId) ||
      researchPlanets.has(route.destinationPlanetId)
    ) {
      researchRouteCount++;
    }
  }
  rp += Math.floor(researchRouteCount * RP_RESEARCH_PLANET_BONUS);

  return rp;
}

/**
 * Process tech research for a turn.
 * Accumulates RP, checks for tech completion, carries over excess RP.
 */
export function processResearch(
  state: GameState,
  rpThisTurn: number,
): TechState {
  const tech = { ...state.tech };
  tech.researchPoints += rpThisTurn;

  if (!tech.currentResearchId) {
    tech.researchProgress += rpThisTurn;
    return tech;
  }

  const currentTech = TECH_TREE.find((t) => t.id === tech.currentResearchId);
  if (!currentTech) {
    tech.researchProgress += rpThisTurn;
    return tech;
  }

  tech.researchProgress += rpThisTurn;

  // Check completion
  if (tech.researchProgress >= currentTech.rpCost) {
    const excess = tech.researchProgress - currentTech.rpCost;
    tech.completedTechIds = [...tech.completedTechIds, currentTech.id];
    tech.currentResearchId = null;
    tech.researchProgress = excess;
  }

  return tech;
}

/**
 * Get the current technology being researched (or null).
 */
export function getCurrentResearch(tech: TechState): Technology | null {
  if (!tech.currentResearchId) return null;
  return TECH_TREE.find((t) => t.id === tech.currentResearchId) ?? null;
}

/**
 * Get progress fraction for current research (0.0 to 1.0).
 */
export function getResearchProgress(tech: TechState): number {
  if (!tech.currentResearchId) return 0;
  const currentTech = TECH_TREE.find((t) => t.id === tech.currentResearchId);
  if (!currentTech) return 0;
  return Math.min(1, tech.researchProgress / currentTech.rpCost);
}
