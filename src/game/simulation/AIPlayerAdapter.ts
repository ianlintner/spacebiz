import type { GameState } from "../../data/types.ts";
import { AIPersonality, ShipClass } from "../../data/types.ts";
import { SHIP_TEMPLATES } from "../../data/constants.ts";

/**
 * Convert a freshly-created game state to full-AI mode.
 * The player's empire becomes controlled by an AI company.
 * The player's fleet/routes are given to this new AI.
 * If the player has no fleet, a starting CargoShuttle is provided.
 * The original player cash is used.
 */
export function convertToFullAIState(state: GameState): GameState {
  // Ensure the converted player gets at least one ship
  let fleet = state.fleet.map((ship) => ({ ...ship }));
  let cash = state.cash;
  if (fleet.length === 0) {
    const template = SHIP_TEMPLATES[ShipClass.CargoShuttle];
    fleet = [
      {
        id: "ai-player-ship-0",
        name: template.name,
        class: template.class,
        cargoCapacity: template.cargoCapacity,
        passengerCapacity: template.passengerCapacity,
        speed: template.speed,
        fuelEfficiency: template.fuelEfficiency,
        reliability: template.baseReliability,
        age: 0,
        condition: 100,
        purchaseCost: template.purchaseCost,
        maintenanceCost: template.baseMaintenance,
        assignedRouteId: null,
      },
    ];
    cash -= template.purchaseCost;
  }

  const playerAI = {
    id: "ai-player",
    name: state.companyName,
    empireId: state.playerEmpireId,
    cash,
    fleet,
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
    fleet: [],
    activeRoutes: [],
    cash: 0,
    aiCompanies: [playerAI, ...state.aiCompanies],
  };
}
