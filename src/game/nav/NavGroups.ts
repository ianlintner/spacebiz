// Nav groupings for the left sidebar. Replaces the flat 10-icon nav with
// 4 standalone verbs + 2 grouped icons (Empire, Ops). Each group renders a
// SceneTabBar at the top of its content area for in-group navigation.
//
// The grouping is presentation-only — NavTabId / NavUnlocks logic still
// operates per-scene. A group's nav icon is "active" iff any of its scenes
// is the active content scene.

import type { GameState, NavTabId } from "../../data/types.ts";

/**
 * Maps Phaser scene keys to the NavTabId that gates their unlock.
 * Scenes without a corresponding NavTabId (e.g. DiplomacyScene) are
 * treated as always unlocked by callers.
 */
export const SCENE_TO_NAV_TAB: Record<string, NavTabId> = {
  GalaxyMapScene: "map",
  RoutesScene: "routes",
  FleetScene: "fleet",
  ContractsScene: "contracts",
  MarketScene: "market",
  TechTreeScene: "research",
  FinanceScene: "finance",
  EmpireScene: "empires",
  CompetitionScene: "rivals",
  StationBuilderScene: "hub",
};

export interface NavGroup {
  /** Stable id (used for last-visited tracking). */
  id: string;
  /** Tooltip / accessibility label for the nav icon. */
  label: string;
  /** Nav icon texture key. */
  icon: string;
  /**
   * Scene keys, in tab order (left → right). The first scene is the
   * fallback default when no urgency / last-visited info applies.
   */
  scenes: string[];
}

export const NAV_GROUPS: NavGroup[] = [
  { id: "map", label: "Map", icon: "icon-map", scenes: ["GalaxyMapScene"] },
  {
    id: "routes",
    label: "Routes",
    icon: "icon-routes",
    scenes: ["RoutesScene"],
  },
  { id: "fleet", label: "Fleet", icon: "icon-fleet", scenes: ["FleetScene"] },
  {
    id: "finance",
    label: "Finance",
    icon: "icon-finance",
    scenes: ["FinanceScene"],
  },
  {
    id: "empire",
    label: "Empire",
    icon: "icon-empire",
    scenes: [
      "EmpireScene",
      "DiplomacyScene",
      "CompetitionScene",
      "ContractsScene",
    ],
  },
  {
    id: "ops",
    label: "Ops",
    icon: "icon-hub",
    scenes: ["TechTreeScene", "StationBuilderScene"],
  },
];

/** Find the group that owns the given scene key, or null if standalone-not-in-group. */
export function findGroupForScene(sceneKey: string): NavGroup | null {
  for (const g of NAV_GROUPS) {
    if (g.scenes.includes(sceneKey)) return g;
  }
  return null;
}

/**
 * Returns true if the scene currently has an urgent signal worth surfacing
 * (e.g. waiting input, negative cash, idle research). Mirrors the rules in
 * `GameHUDScene.updateNavBadges` for the 5 scenes that already have badges,
 * and adds rules for the grouped scenes that didn't.
 *
 * EmpireScene currently has no urgency signal (would need a `viewedEmpireIds`
 * field on GameState to detect "newly unlocked, unviewed"). Diplomacy and
 * Competition use state-trigger rules that don't require schema changes.
 */
export function hasSceneUrgency(sceneKey: string, state: GameState): boolean {
  if (state.phase !== "planning") return false;

  switch (sceneKey) {
    case "RoutesScene":
      return state.activeRoutes.length === 0;

    case "FleetScene": {
      const unassigned = state.fleet.filter((s) => !s.assignedRouteId);
      const avgCond =
        state.fleet.length > 0
          ? state.fleet.reduce((sum, s) => sum + s.condition, 0) /
            state.fleet.length
          : 100;
      return (
        (unassigned.length > 0 && state.activeRoutes.length > 0) ||
        (avgCond < 50 && state.fleet.length > 0)
      );
    }

    case "FinanceScene":
      return state.cash < 0;

    case "ContractsScene":
      return (state.contracts ?? []).some((c) => c.status === "available");

    case "TechTreeScene":
      return !state.tech?.currentResearchId;

    case "EmpireScene":
      return false;

    case "DiplomacyScene":
      // A relation involving the player flipped status this turn.
      return (state.diplomaticRelations ?? []).some(
        (r) =>
          r.turnsInCurrentStatus === 0 &&
          (r.empireA === state.playerEmpireId ||
            r.empireB === state.playerEmpireId),
      );

    case "CompetitionScene":
      // A rival went bankrupt (or was replaced) this turn.
      return state.aiCompanies.some((c) => c.bankruptTurn === state.turn);

    case "StationBuilderScene":
      return false;

    default:
      return false;
  }
}

/**
 * Resolve which scene to open when the player clicks a group icon.
 *
 * Priority (per user choice "C with B fallback"):
 *   1. **Urgency** — if any tab in the group has `hasSceneUrgency`, jump there
 *      (left-to-right tab order breaks ties).
 *   2. **Last visited in-session** — if the player previously had a tab in
 *      this group open, return to it.
 *   3. **First tab** — sensible default for fresh sessions.
 */
export function resolveDefaultTab(
  group: NavGroup,
  state: GameState,
  lastVisitedByGroup: Map<string, string>,
): string {
  for (const sceneKey of group.scenes) {
    if (hasSceneUrgency(sceneKey, state)) return sceneKey;
  }
  const last = lastVisitedByGroup.get(group.id);
  if (last && group.scenes.includes(last)) return last;
  return group.scenes[0];
}
