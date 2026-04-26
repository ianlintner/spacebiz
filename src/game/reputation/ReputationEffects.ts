import type { GameState, ReputationTier, Contract } from "../../data/types.ts";
import { ContractStatus } from "../../data/types.ts";

// ---------------------------------------------------------------------------
// Reputation Tier Computation
// ---------------------------------------------------------------------------

/**
 * Compute the reputation tier label from a numeric reputation score.
 * notorious  : < 25
 * unknown    : 25–49
 * respected  : 50–74
 * renowned   : 75–89
 * legendary  : 90+
 */
export function computeReputationTier(reputation: number): ReputationTier {
  if (reputation >= 90) return "legendary";
  if (reputation >= 75) return "renowned";
  if (reputation >= 50) return "respected";
  if (reputation >= 25) return "unknown";
  return "notorious";
}

// ---------------------------------------------------------------------------
// License Fee Multiplier
// ---------------------------------------------------------------------------

/**
 * Reputation-based license fee multiplier.
 *   rep >= 50 → 0.90 (10% discount — trusted trader)
 *   rep <  25 → 1.20 (20% surcharge — notorious operators pay more)
 *   else      → 1.00 (neutral)
 */
export function getLicenseFeeMultiplier(reputation: number): number {
  if (reputation >= 50) return 0.9;
  if (reputation < 25) return 1.2;
  return 1.0;
}

// ---------------------------------------------------------------------------
// Tariff Multiplier
// ---------------------------------------------------------------------------

/**
 * Reputation-based tariff surcharge from non-allied empires.
 * Alliance always overrides (tariff is already 0 from diplomatic status).
 * For non-allied empires:
 *   rep < 25 → 1.20 (+20% extra tariff)
 *   else     → 1.00 (no change)
 *
 * @param reputation     Player's current reputation score
 * @param diplomaticStatus  The diplomatic status string for the relevant empire
 */
export function getReputationTariffMultiplier(
  reputation: number,
  diplomaticStatus: string,
): number {
  // Alliance means no tariff at all — multiplier is moot
  if (diplomaticStatus === "alliance") return 1.0;
  if (reputation < 25) return 1.2;
  return 1.0;
}

// ---------------------------------------------------------------------------
// Premium Contract Access
// ---------------------------------------------------------------------------

/**
 * Whether the player has unlocked premium contract access.
 * Requires reputation >= 75 (renowned or higher).
 */
export function hasPremiumContractAccess(reputation: number): boolean {
  return reputation >= 75;
}

// ---------------------------------------------------------------------------
// Premium Contract Generation
// ---------------------------------------------------------------------------

/**
 * Create a premium variant of a base contract:
 *   - 2× rewardCash
 *   - 2× depositPaid
 *   - 70% of base durationTurns (rounded up, min 1)
 *   - Status set to Available
 */
export function makePremiumContract(baseContract: Contract): Contract {
  const premiumDuration = Math.max(
    1,
    Math.ceil(baseContract.durationTurns * 0.7),
  );
  return {
    ...baseContract,
    id: `${baseContract.id}-premium`,
    rewardCash: baseContract.rewardCash * 2,
    depositPaid: baseContract.depositPaid * 2,
    durationTurns: premiumDuration,
    turnsRemaining: premiumDuration,
    status: ContractStatus.Available,
    linkedRouteId: null,
    turnsWithoutShip: 0,
  };
}

// ---------------------------------------------------------------------------
// State Helper
// ---------------------------------------------------------------------------

/**
 * Derive reputation tier from game state history.
 * Returns the letter grade corresponding to the last turn's net profit,
 * or 'neutral' if no history exists.
 * Used by portrait expressions to determine the current mood.
 */
export function getLastTurnGrade(state: GameState): string {
  const last = state.history[state.history.length - 1];
  if (!last) return "neutral";
  const profit = last.netProfit;
  if (profit >= 50000) return "S";
  if (profit >= 20000) return "A";
  if (profit >= 5000) return "B";
  if (profit >= 0) return "C";
  if (profit >= -10000) return "D";
  return "F";
}
