import type { GameState } from "../../data/types.ts";
import { scoutRouteEntry } from "./RouteMarket.ts";

/**
 * Scout a route market entry, revealing its exact profit.
 *
 * Costs SCOUT_COST_AP action points + SCOUT_COST_CASH cash.
 * Sets entry.scouted = true and entry.exactProfitPerTurn = computed value.
 *
 * @throws Error with one of: 'Insufficient AP', 'Insufficient cash',
 *   'Entry not found', 'Already scouted'
 */
export function scoutRoute(state: GameState, entryId: string): GameState {
  const result = scoutRouteEntry(state, entryId);

  if (!result.success) {
    throw new Error(result.reason ?? "Scout failed");
  }

  return result.updatedState;
}
