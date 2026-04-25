import type { Ship, StorytellerState } from "../../data/types.ts";
import { STARTING_CASH } from "../../data/constants.ts";

/**
 * Calculates a player health score (0–100) based on financial indicators.
 *
 * Factors:
 *   - cashRatio: current cash relative to starting cash (clamped 0–2, mapped to 0–40)
 *   - fleetScore: number of ships (clamped 0–10, mapped to 0–20)
 *   - profitScore: based on lastTurnProfit relative to maintenance costs (mapped to 0–40)
 */
function calculateHealthScore(
  cash: number,
  fleet: Ship[],
  lastTurnProfit: number,
): number {
  // Cash component (0–40 points): ratio of current cash to starting cash
  const cashRatio = Math.max(0, Math.min(cash / STARTING_CASH, 2));
  const cashScore = (cashRatio / 2) * 40;

  // Fleet component (0–20 points): more ships = healthier
  const fleetSize = Math.max(0, Math.min(fleet.length, 10));
  const fleetScore = (fleetSize / 10) * 20;

  // Profit component (0–40 points): recent turn profit
  // A "good" profit is considered to be roughly 10% of starting cash per turn
  const profitTarget = STARTING_CASH * 0.1;
  const profitRatio = Math.max(-1, Math.min(lastTurnProfit / profitTarget, 2));
  // Map from [-1, 2] to [0, 40]
  const profitScore = ((profitRatio + 1) / 3) * 40;

  return Math.round(
    Math.max(0, Math.min(100, cashScore + fleetScore + profitScore)),
  );
}

/**
 * Update the storyteller state based on current game indicators.
 *
 * headwindBias is positive when the player is doing well (sends harder events)
 * and negative when the player is struggling (sends helpful events).
 */
export function updateStorytellerState(
  state: StorytellerState,
  cash: number,
  fleet: Ship[],
  lastTurnProfit: number,
): StorytellerState {
  const playerHealthScore = calculateHealthScore(cash, fleet, lastTurnProfit);

  // Track debt turns
  const turnsInDebt = cash < 0 ? state.turnsInDebt + 1 : 0;

  // Track consecutive profit turns
  const consecutiveProfitTurns =
    lastTurnProfit > 0 ? state.consecutiveProfitTurns + 1 : 0;

  // Calculate headwind bias:
  //   health > 60 → positive bias (headwinds / harder events)
  //   health < 40 → negative bias (tailwinds / helpful events)
  //   40-60 → near zero (neutral)
  let headwindBias = 0;
  if (playerHealthScore > 60) {
    // Scale from 0 at 60 to +1.0 at 100
    headwindBias = (playerHealthScore - 60) / 40;
  } else if (playerHealthScore < 40) {
    // Scale from 0 at 40 to -1.0 at 0
    headwindBias = (playerHealthScore - 40) / 40;
  }

  // Increment turns since last player decision
  const turnsSinceLastDecision = state.turnsSinceLastDecision + 1;

  return {
    playerHealthScore,
    headwindBias,
    turnsInDebt,
    consecutiveProfitTurns,
    turnsSinceLastDecision,
  };
}
