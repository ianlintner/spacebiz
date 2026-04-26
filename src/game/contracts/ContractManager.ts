import type { GameState, Contract } from "../../data/types.ts";
import { ContractType, ContractStatus } from "../../data/types.ts";
import {
  CONTRACT_FAILURE_REP_PENALTY,
  CONTRACT_UNASSIGNED_SHIP_LIMIT,
  SLOT_PER_EMPIRE_UNLOCK,
} from "../../data/constants.ts";
import { createRoute } from "../routes/RouteManager.ts";
import { calculateDistance } from "../routes/RouteManager.ts";
import type { NegotiationChoice } from "./ContractNegotiation.ts";
import { applyNegotiation } from "./ContractNegotiation.ts";
import {
  findBestShipForContract,
  autoAssignShipToContract,
} from "./ContractShipMatcher.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";

// ---------------------------------------------------------------------------
// Contract Lifecycle
// ---------------------------------------------------------------------------

/**
 * Accept a contract: create a linked route and mark the contract active.
 * Returns a partial GameState update (caller merges).
 */
export function acceptContract(
  contractId: string,
  state: GameState,
): Partial<GameState> | null {
  const contract = state.contracts.find(
    (c) => c.id === contractId && c.status === ContractStatus.Available,
  );
  if (!contract) return null;

  const { planets, systems } = state.galaxy;
  const origin = planets.find((p) => p.id === contract.originPlanetId);
  const dest = planets.find((p) => p.id === contract.destinationPlanetId);
  if (!origin || !dest) return null;

  const distance = calculateDistance(origin, dest, systems);
  const route = createRoute(origin.id, dest.id, distance, contract.cargoType);

  const updatedContracts = state.contracts.map((c) =>
    c.id === contractId
      ? {
          ...c,
          status: ContractStatus.Active as typeof c.status,
          linkedRouteId: route.id,
        }
      : c,
  );

  // Deduct deposit
  const cash = state.cash - contract.depositPaid;

  return {
    contracts: updatedContracts,
    activeRoutes: [...state.activeRoutes, route],
    cash,
  };
}

/**
 * Abandon an active contract (player-initiated).
 * Applies failure penalties.
 */
export function abandonContract(
  contractId: string,
  state: GameState,
): Partial<GameState> | null {
  const contract = state.contracts.find(
    (c) => c.id === contractId && c.status === ContractStatus.Active,
  );
  if (!contract) return null;

  return applyContractFailure(contract, state);
}

/**
 * Process contract progress at end of turn.
 * Ticks duration, checks for ship assignment, completes/fails contracts.
 */
export function processContracts(state: GameState): Partial<GameState> {
  let updatedContracts = [...state.contracts];
  let cash = state.cash;
  let reputation = state.reputation;
  let researchPoints = state.tech.researchPoints;
  let routeSlots = state.routeSlots;
  let unlockedEmpireIds = [...state.unlockedEmpireIds];
  let activeRoutes = [...state.activeRoutes];

  for (let i = 0; i < updatedContracts.length; i++) {
    const c = updatedContracts[i];
    if (c.status !== ContractStatus.Active) continue;

    // Check if route still exists and has a ship assigned
    const linkedRoute = activeRoutes.find((r) => r.id === c.linkedRouteId);
    const hasShip = linkedRoute
      ? linkedRoute.assignedShipIds.length > 0
      : false;

    let turnsWithoutShip = c.turnsWithoutShip;
    if (!hasShip) {
      turnsWithoutShip++;
    } else {
      turnsWithoutShip = 0;
    }

    // Route was deleted or no ship for too long → fail
    if (!linkedRoute || turnsWithoutShip >= CONTRACT_UNASSIGNED_SHIP_LIMIT) {
      const failResult = applyContractFailureToValues(
        c,
        reputation,
        unlockedEmpireIds,
      );
      reputation = failResult.reputation;
      updatedContracts[i] = {
        ...c,
        status: ContractStatus.Failed,
        turnsWithoutShip,
      };
      continue;
    }

    // Tick duration
    const turnsRemaining = c.turnsRemaining - 1;

    if (turnsRemaining <= 0) {
      // Contract completed — apply rewards
      cash += c.rewardCash + c.depositPaid; // refund deposit + reward
      reputation += c.rewardReputation;
      researchPoints += c.rewardResearchPoints;

      if (
        c.type === ContractType.EmpireUnlock &&
        c.targetEmpireId &&
        !unlockedEmpireIds.includes(c.targetEmpireId)
      ) {
        unlockedEmpireIds = [...unlockedEmpireIds, c.targetEmpireId];
        routeSlots += SLOT_PER_EMPIRE_UNLOCK;
      }

      updatedContracts[i] = {
        ...c,
        turnsRemaining: 0,
        turnsWithoutShip,
        status: ContractStatus.Completed,
      };
    } else {
      updatedContracts[i] = { ...c, turnsRemaining, turnsWithoutShip };
    }
  }

  return {
    contracts: updatedContracts,
    cash,
    reputation,
    routeSlots,
    unlockedEmpireIds,
    activeRoutes,
    tech: { ...state.tech, researchPoints },
  };
}

// ---------------------------------------------------------------------------
// Negotiation + Accept + Auto-assign
// ---------------------------------------------------------------------------

/**
 * Accept a contract with a negotiation choice applied.
 *
 * Steps:
 *   1. Locate the contract.
 *   2. Apply negotiation to get modified terms.
 *   3. Accept the contract (create linked route, deduct deposit).
 *   4. Auto-assign the best idle ship to the newly created route.
 *
 * Returns the updated GameState, or the original state if the contract
 * cannot be found / is not available.
 */
export function acceptContractWithNegotiation(
  contractId: string,
  choice: NegotiationChoice,
  state: GameState,
  rng: SeededRNG,
): GameState {
  const contract = state.contracts.find(
    (c) => c.id === contractId && c.status === ContractStatus.Available,
  );
  if (!contract) return state;

  // 1. Apply negotiation to get updated contract terms
  const { negotiatedContract } = applyNegotiation(contract, choice, state, rng);

  // 2. Temporarily substitute negotiated contract so acceptContract sees it
  const stateWithNegotiated: GameState = {
    ...state,
    contracts: state.contracts.map((c) =>
      c.id === contractId ? negotiatedContract : c,
    ),
  };

  // 3. Accept: creates route, deducts deposit
  const patch = acceptContract(contractId, stateWithNegotiated);
  if (!patch) return state;

  let updatedState: GameState = { ...stateWithNegotiated, ...patch };

  // 4. Auto-assign best idle ship
  const match = findBestShipForContract(negotiatedContract, updatedState);
  if (match.shipId !== null) {
    updatedState = autoAssignShipToContract(
      contractId,
      match.shipId,
      updatedState,
    );
  }

  return updatedState;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function applyContractFailure(
  contract: Contract,
  state: GameState,
): Partial<GameState> {
  const result = applyContractFailureToValues(
    contract,
    state.reputation,
    state.unlockedEmpireIds,
  );

  const updatedContracts = state.contracts.map((c) =>
    c.id === contract.id
      ? { ...c, status: ContractStatus.Failed as typeof c.status }
      : c,
  );

  return {
    contracts: updatedContracts,
    reputation: result.reputation,
    // Deposit is forfeited (already deducted on accept)
  };
}

function applyContractFailureToValues(
  contract: Contract,
  reputation: number,
  _unlockedEmpireIds: string[],
): { reputation: number } {
  // Apply reputation penalty, scaled to contract importance
  let repPenalty = CONTRACT_FAILURE_REP_PENALTY;
  if (contract.type === ContractType.EmpireUnlock) {
    repPenalty = Math.round(repPenalty * 1.5);
  }

  return {
    reputation: Math.max(0, reputation + repPenalty),
  };
}
