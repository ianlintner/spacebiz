import type { GameState } from "../data/types.ts";
import { getLastTurnGrade } from "../game/reputation/ReputationEffects.ts";

// ── Portrait Expression types ───────────────────────────────────────────────

/** Visual expression state for CEO / adviser portraits */
export type PortraitExpression = "happy" | "neutral" | "worried" | "angry";

/**
 * Derive the appropriate portrait expression from the current game state.
 *
 * Priority order:
 *  1. Low reputation (< 25) → angry
 *  2. Low health score (< 30) → worried
 *  3. Recent S/A grade turn → happy
 *  4. Recent D/F grade turn → worried
 *  5. Default → neutral
 */
export function getExpressionFromGameState(
  state: GameState,
): PortraitExpression {
  if (state.reputation < 25) return "angry";
  if (state.storyteller.playerHealthScore < 30) return "worried";
  const grade = getLastTurnGrade(state);
  if (grade === "A" || grade === "S") return "happy";
  if (grade === "D" || grade === "F") return "worried";
  return "neutral";
}
