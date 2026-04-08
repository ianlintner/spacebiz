import type { GameState } from "../../data/types.ts";
import { AIPersonality } from "../../data/types.ts";

/**
 * Convert a freshly-created game state to full-AI mode.
 * The player's empire becomes controlled by an AI company.
 * The player's fleet/routes are given to this new AI.
 * The original player cash is used.
 */
export function convertToFullAIState(state: GameState): GameState {
  const playerAI = {
    id: "ai-player",
    name: state.companyName,
    empireId: state.playerEmpireId,
    cash: state.cash,
    fleet: state.fleet.map((ship) => ({ ...ship })),
    activeRoutes: state.activeRoutes.map((route) => ({ ...route })),
    reputation: state.reputation,
    totalCargoDelivered: 0,
    personality: AIPersonality.SteadyHauler,
    bankrupt: false,
  };

  return {
    ...state,
    fleet: [],
    activeRoutes: [],
    cash: 0,
    aiCompanies: [playerAI, ...state.aiCompanies],
  };
}
