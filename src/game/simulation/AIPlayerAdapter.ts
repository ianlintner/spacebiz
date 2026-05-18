import type { GameState } from "../../data/types.ts";
import { AIPersonality } from "../../data/types.ts";

/**
 * Convert a freshly-created game state to full-AI mode.
 *
 * The player's empire becomes controlled by an AI company. Active routes
 * and cash transfer to that AI; ships no longer exist in the capacity-pool
 * model, so there's no fleet to transfer.
 */
export function convertToFullAIState(state: GameState): GameState {
  const playerAI = {
    id: "ai-player",
    name: state.companyName,
    empireId: state.playerEmpireId,
    cash: state.cash,
    activeRoutes: state.activeRoutes.map((route) => ({ ...route })),
    reputation: state.reputation,
    totalCargoDelivered: 0,
    personality: AIPersonality.SteadyHauler,
    bankrupt: false,
    ceoName: state.ceoName,
    ceoPortrait: state.ceoPortrait,
  };

  return {
    ...state,
    activeRoutes: [],
    cash: 0,
    aiCompanies: [playerAI, ...state.aiCompanies],
  };
}
