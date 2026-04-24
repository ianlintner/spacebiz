import { AIPersonality } from "../../../data/types.ts";
import type {
  AICompany,
  AIHubState,
  GameState,
} from "../../../data/types.ts";

// ---------------------------------------------------------------------------
// AI Hub Logic (Wave 3 — Track 3.3)
// ---------------------------------------------------------------------------

// AI hub upgrade schedule (turn numbers at which each tier upgrade occurs)
const AI_HUB_UPGRADE_TURNS = [10, 20, 30] as const;

// Per-tier bonus increments (additive stacking)
const AI_HUB_REVENUE_BONUS_PER_TIER = 0.03; // +3% revenue
const AI_HUB_FUEL_BONUS_PER_TIER = -0.03; // -3% fuel cost
const AI_HUB_MAINTENANCE_BONUS_PER_TIER = -0.02; // -2% maintenance

/** Maximum hub tier for AI companies */
const AI_HUB_MAX_TIER = 3;

/**
 * Build the initial (zero-state) AIHubState.
 */
function buildDefaultAIHub(): AIHubState {
  return {
    tier: 0,
    bonusRevenueMultiplier: 1.0,
    bonusFuelMultiplier: 1.0,
    bonusMaintenanceMultiplier: 1.0,
    lastUpgradeTurn: -1,
  };
}

/**
 * Compute the hub state multipliers for a given tier.
 * Each tier stacks on top of the previous.
 */
function buildHubMultipliers(
  tier: number,
  personality: (typeof AIPersonality)[keyof typeof AIPersonality],
): Pick<
  AIHubState,
  "bonusRevenueMultiplier" | "bonusFuelMultiplier" | "bonusMaintenanceMultiplier"
> {
  // Base increments per tier
  let revBonus = tier * AI_HUB_REVENUE_BONUS_PER_TIER;
  let fuelBonus = tier * AI_HUB_FUEL_BONUS_PER_TIER;
  let maintBonus = tier * AI_HUB_MAINTENANCE_BONUS_PER_TIER;

  // Personality skews (slight emphasis on primary benefit)
  switch (personality) {
    case AIPersonality.AggressiveExpander:
      // Prioritizes revenue (extra 1% per tier)
      revBonus += tier * 0.01;
      break;
    case AIPersonality.SteadyHauler:
      // Prioritizes maintenance reduction (extra 1% per tier)
      maintBonus -= tier * 0.01;
      break;
    case AIPersonality.CherryPicker:
      // Prioritizes fuel reduction (extra 1% per tier)
      fuelBonus -= tier * 0.01;
      break;
  }

  return {
    bonusRevenueMultiplier: 1.0 + revBonus,
    bonusFuelMultiplier: 1.0 + fuelBonus,
    bonusMaintenanceMultiplier: 1.0 + maintBonus,
  };
}

/**
 * Process AI hub upgrades for one turn.
 *
 * Upgrades occur at turns 10, 20, and 30.
 * Each tier adds compound bonuses to revenue, fuel, and maintenance.
 */
export function processAIHub(
  company: AICompany,
  state: GameState,
): AICompany {
  const currentHub: AIHubState = company.aiHub ?? buildDefaultAIHub();

  // Already at max tier
  if (currentHub.tier >= AI_HUB_MAX_TIER) {
    return company.aiHub ? company : { ...company, aiHub: currentHub };
  }

  // Check if this turn triggers an upgrade
  const targetTier = currentHub.tier + 1;
  const upgradeTurn = AI_HUB_UPGRADE_TURNS[currentHub.tier]; // tier 0→1 at turn 10, etc.

  if (upgradeTurn === undefined || state.turn < upgradeTurn) {
    // No upgrade yet — return with initialized hub if needed
    return company.aiHub ? company : { ...company, aiHub: currentHub };
  }

  // Don't upgrade twice on the same turn
  if (currentHub.lastUpgradeTurn === state.turn) {
    return company.aiHub ? company : { ...company, aiHub: currentHub };
  }

  // Perform upgrade
  const multipliers = buildHubMultipliers(targetTier, company.personality);

  const upgradedHub: AIHubState = {
    ...currentHub,
    tier: targetTier,
    lastUpgradeTurn: state.turn,
    ...multipliers,
  };

  return { ...company, aiHub: upgradedHub };
}

/**
 * Apply hub bonuses to AI company economic metrics.
 * Returns adjusted revenue, fuel cost, and maintenance cost.
 *
 * Used in aiRouteStep to modify per-route economics.
 */
export function applyAIHubBonuses(
  baseRevenue: number,
  baseFuel: number,
  baseMaint: number,
  aiHub: AIHubState | undefined,
): { revenue: number; fuel: number; maintenance: number } {
  if (!aiHub || aiHub.tier === 0) {
    return { revenue: baseRevenue, fuel: baseFuel, maintenance: baseMaint };
  }

  return {
    revenue: baseRevenue * aiHub.bonusRevenueMultiplier,
    fuel: baseFuel * aiHub.bonusFuelMultiplier,
    maintenance: baseMaint * aiHub.bonusMaintenanceMultiplier,
  };
}
