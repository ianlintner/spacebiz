import type { Contract, Ship, GameState } from "../../data/types.ts";
import { CargoType } from "../../data/types.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShipMatchResult {
  shipId: string | null;
  ship: Ship | null;
  matchScore: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Scoring constants
// ---------------------------------------------------------------------------

const SCORE_CARGO_CAPACITY_MET = 100;
const SCORE_PASSENGER_CAPACITY_MET = 50;
const SCORE_CONDITION_MAX = 30;
const SCORE_CONDITION_PENALTY = -20;
const SCORE_CONDITION_PENALTY_THRESHOLD = 50;
const SCORE_SPEED_MULTIPLIER = 5;
const SCORE_SPEED_MAX = 25;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Find the best idle ship for a given contract.
 *
 * Scoring (higher is better):
 *   +100  cargo capacity >= required amount
 *   +50   passenger capacity >= required passengers (ferry contracts)
 *   +0–30 ship condition (condition/100 * 30)
 *   −20   if condition < 50 (risky)
 *   +0–25 ship speed (speed * 5, capped at 25)
 *
 * Returns the highest-scoring idle ship, or null if none are available.
 */
export function findBestShipForContract(
  contract: Contract,
  state: GameState,
): ShipMatchResult {
  const idleShips = state.fleet.filter((s) => s.assignedRouteId === null);

  if (idleShips.length === 0) {
    return {
      shipId: null,
      ship: null,
      matchScore: 0,
      reason: "No idle ships available.",
    };
  }

  const isPassengerContract = contract.cargoType === CargoType.Passengers;

  let bestShip: Ship | null = null;
  let bestScore = -Infinity;

  for (const ship of idleShips) {
    let score = 0;

    // Cargo capacity check
    // For non-passenger contracts, cargoCapacity is used.
    // For passenger contracts, passengerCapacity is the relevant measure.
    if (!isPassengerContract) {
      if (ship.cargoCapacity > 0) {
        score += SCORE_CARGO_CAPACITY_MET;
      }
    } else {
      // Passenger ferry: passengerCapacity is the primary criterion
      if (ship.passengerCapacity > 0) {
        score += SCORE_PASSENGER_CAPACITY_MET;
      }
      // Cargo capacity gives no extra benefit for passenger contracts —
      // a dedicated ferry should always beat a pure cargo ship.
    }

    // Condition score: 0–30
    const conditionScore = (ship.condition / 100) * SCORE_CONDITION_MAX;
    score += conditionScore;

    // Condition penalty for risky ships
    if (ship.condition < SCORE_CONDITION_PENALTY_THRESHOLD) {
      score += SCORE_CONDITION_PENALTY;
    }

    // Speed score: capped at SCORE_SPEED_MAX
    const speedScore = Math.min(
      ship.speed * SCORE_SPEED_MULTIPLIER,
      SCORE_SPEED_MAX,
    );
    score += speedScore;

    if (score > bestScore) {
      bestScore = score;
      bestShip = ship;
    }
  }

  if (!bestShip) {
    return {
      shipId: null,
      ship: null,
      matchScore: 0,
      reason: "No suitable ship found.",
    };
  }

  const reason = buildReason(bestShip, isPassengerContract);

  return {
    shipId: bestShip.id,
    ship: bestShip,
    matchScore: bestScore,
    reason,
  };
}

/**
 * Assign a ship to the route linked to a contract.
 *
 * Updates:
 *   - `fleet`: sets ship.assignedRouteId to the contract's linkedRouteId
 *   - `activeRoutes`: adds shipId to route.assignedShipIds
 *
 * No-ops if contract has no linkedRouteId or ship/route not found.
 */
export function autoAssignShipToContract(
  contractId: string,
  shipId: string,
  state: GameState,
): GameState {
  const contract = state.contracts.find((c) => c.id === contractId);
  if (!contract || !contract.linkedRouteId) return state;

  const routeId = contract.linkedRouteId;

  const ship = state.fleet.find((s) => s.id === shipId);
  const route = state.activeRoutes.find((r) => r.id === routeId);
  if (!ship || !route) return state;

  // Assign the ship to the route
  const updatedFleet = state.fleet.map((s) =>
    s.id === shipId ? { ...s, assignedRouteId: routeId } : s,
  );

  const updatedRoutes = state.activeRoutes.map((r) =>
    r.id === routeId
      ? { ...r, assignedShipIds: [...r.assignedShipIds, shipId] }
      : r,
  );

  return {
    ...state,
    fleet: updatedFleet,
    activeRoutes: updatedRoutes,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildReason(ship: Ship, isPassengerContract: boolean): string {
  const parts: string[] = [];

  if (isPassengerContract) {
    parts.push(
      ship.passengerCapacity > 0
        ? `passenger capacity: ${ship.passengerCapacity}`
        : "no passenger capacity",
    );
  } else {
    parts.push(
      ship.cargoCapacity > 0
        ? `cargo capacity: ${ship.cargoCapacity}`
        : "no cargo capacity",
    );
  }

  parts.push(`condition: ${ship.condition}%`);
  parts.push(`speed: ${ship.speed}`);

  return `Best match — ${parts.join(", ")}.`;
}
