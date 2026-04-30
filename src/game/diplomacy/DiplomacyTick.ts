import type { GameState, StandingTag } from "../../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../../data/types.ts";
import { expireTags } from "./StandingTags.ts";
import { pruneExpiredCooldowns } from "./Cooldowns.ts";

const HOSTILE_DRIFT_FLOOR = 30;

function driftToward50(value: number): number {
  if (value < HOSTILE_DRIFT_FLOOR) return value;
  if (value > 50) return value - 1;
  if (value < 50) return value + 1;
  return value;
}

function driftMap(map: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) {
    next[k] = driftToward50(v);
  }
  return next;
}

function expireAllTags(
  byTarget: Record<string, readonly StandingTag[]>,
  currentTurn: number,
): Record<string, readonly StandingTag[]> {
  const next: Record<string, readonly StandingTag[]> = {};
  for (const [k, tags] of Object.entries(byTarget)) {
    next[k] = expireTags(tags, currentTurn);
  }
  return next;
}

/**
 * Per-turn tick for diplomacy state:
 *   - drift empire-side standing (state.empireReputation) and rival-side
 *     standing (state.diplomacy.rivalStanding) one step toward 50, except
 *     when below the hostile floor;
 *   - expire tags whose expiresOnTurn <= currentTurn;
 *   - drop cooldowns whose untilTurn <= currentTurn;
 *   - reset actionsResolvedThisTurn.
 */
export function tickDiplomacyState(state: GameState): GameState {
  const t = state.turn;
  const d = state.diplomacy ?? EMPTY_DIPLOMACY_STATE;
  return {
    ...state,
    empireReputation: state.empireReputation
      ? driftMap(state.empireReputation)
      : state.empireReputation,
    diplomacy: {
      ...d,
      rivalStanding: driftMap(d.rivalStanding),
      empireTags: expireAllTags(d.empireTags, t),
      rivalTags: expireAllTags(d.rivalTags, t),
      cooldowns: pruneExpiredCooldowns(d.cooldowns, t),
      actionsResolvedThisTurn: 0,
    },
  };
}
