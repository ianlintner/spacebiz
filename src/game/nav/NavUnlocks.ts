// Evaluates what nav tabs should be unlocked given current game state.
// Returns the updated unlockedNavTabs array (immutable — returns new array).

import type { GameState, NavTabId } from "../../data/types.ts";
import { NAV_ALWAYS_VISIBLE, NAV_UNLOCK_RULES } from "../../data/constants.ts";

export function evaluateNavUnlocks(state: GameState): NavTabId[] {
  const current = new Set(state.unlockedNavTabs);

  // Always-visible tabs are always in the set
  for (const tab of NAV_ALWAYS_VISIBLE) {
    current.add(tab);
  }

  for (const rule of NAV_UNLOCK_RULES) {
    if (current.has(rule.tabId)) continue; // already unlocked

    // Turn-based unlock
    if (rule.minTurn !== undefined && state.turn >= rule.minTurn) {
      current.add(rule.tabId);
      continue;
    }

    // State-trigger unlocks
    if (rule.trigger !== undefined) {
      switch (rule.trigger) {
        case "first_contract_offer": {
          // Unlock when at least one contract exists in any status
          // (available, active, or completed counts as "offered")
          if (state.contracts.length > 0) {
            current.add(rule.tabId);
          }
          break;
        }
        case "second_empire_unlock": {
          // Unlock empires tab after player has access to 2+ empire IDs
          if (state.unlockedEmpireIds.length >= 2) {
            current.add(rule.tabId);
          }
          break;
        }
        case "hub_available": {
          // Unlock hub tab when a station hub exists
          if (state.stationHub !== null) {
            current.add(rule.tabId);
          }
          break;
        }
      }
    }
  }

  return Array.from(current);
}

/** Returns newly unlocked tabs (tabs in newTabs but not in oldTabs). */
export function getNewlyUnlockedTabs(
  oldTabs: NavTabId[],
  newTabs: NavTabId[],
): NavTabId[] {
  const oldSet = new Set(oldTabs);
  return newTabs.filter((t) => !oldSet.has(t));
}
