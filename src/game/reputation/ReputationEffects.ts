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

// ---------------------------------------------------------------------------
// Per-Empire Reputation
// ---------------------------------------------------------------------------

/** Default reputation for an empire the player has no recorded standing with. */
export const DEFAULT_EMPIRE_REPUTATION = 50;

/**
 * Read the player's reputation with a specific empire. Falls back to the
 * default neutral value when the entry is missing (e.g. v6 saves, or an
 * empire the player has never interacted with).
 */
export function getEmpireRep(state: GameState, empireId: string): number {
  return state.empireReputation?.[empireId] ?? DEFAULT_EMPIRE_REPUTATION;
}

/**
 * Return a new `empireReputation` map with the given empire's reputation
 * adjusted by `delta`, clamped to [0, 100]. Pure — does not mutate state.
 * Callers should pass the result to `gameStore.update({ empireReputation: ... })`.
 */
export function adjustEmpireRep(
  state: GameState,
  empireId: string,
  delta: number,
): Record<string, number> {
  const current = getEmpireRep(state, empireId);
  const next = Math.max(0, Math.min(100, current + delta));
  return { ...(state.empireReputation ?? {}), [empireId]: next };
}

/**
 * Compute the "fame" reputation — a single global score derived from the
 * player's standing across all empires. Used for cross-empire gates that
 * don't have a single subject empire (premium contract access, scoring,
 * portrait expressions, etc.).
 *
 * Strategy: weighted blend of mean and max. The mean keeps notorious players
 * from gaming the system by being legendary in one empire; the max ensures
 * a player respected nowhere but legendary in their home empire still feels
 * recognised.
 *   fame = 0.6 * mean + 0.4 * max
 *
 * When `empireReputation` is empty/missing, falls back to the legacy global
 * `state.reputation` so Phase 1 does not change any gameplay numbers.
 */
export function computeFameRep(state: GameState): number {
  const map = state.empireReputation;
  if (!map) return state.reputation;
  const values = Object.values(map);
  if (values.length === 0) return state.reputation;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const max = values.reduce((a, b) => Math.max(a, b), 0);
  return Math.round(0.6 * mean + 0.4 * max);
}

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
