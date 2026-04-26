import type {
  GameState,
  Contract,
  ContractType,
  Planet,
  CargoType,
} from "../../data/types.ts";
import {
  ContractType as CT,
  ContractStatus,
  CargoType as CargoTypeEnum,
} from "../../data/types.ts";
import {
  MAX_AVAILABLE_CONTRACTS,
  CONTRACT_FAILURE_COOLDOWN_TURNS,
} from "../../data/constants.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";
import { getEmpireForPlanet } from "../empire/EmpireAccessManager.ts";
import {
  hasPremiumContractAccess,
  makePremiumContract,
} from "../reputation/ReputationEffects.ts";

// ---------------------------------------------------------------------------
// Contract Generation
// ---------------------------------------------------------------------------

/**
 * Generate new available contracts for the current turn.
 * Maintains up to MAX_AVAILABLE_CONTRACTS available offerings.
 * Returns only the newly generated contracts (caller merges with existing).
 */
export function generateContracts(
  state: GameState,
  rng: SeededRNG,
): Contract[] {
  const existingAvailable = state.contracts.filter(
    (c) => c.status === ContractStatus.Available,
  );

  const slotsToFill = MAX_AVAILABLE_CONTRACTS - existingAvailable.length;
  if (slotsToFill <= 0) return [];

  const newContracts: Contract[] = [];

  // Always try to offer one empire unlock contract if eligible
  const empireUnlockContract = tryGenerateEmpireUnlock(state, rng);
  if (empireUnlockContract && slotsToFill > 0) {
    newContracts.push(empireUnlockContract);
  }

  // Fill remaining slots with random contract types
  const remaining = slotsToFill - newContracts.length;
  for (let i = 0; i < remaining; i++) {
    const contract = generateRandomContract(state, rng);
    if (contract) {
      newContracts.push(contract);
    }
  }

  // If player has premium access (rep >= 75), add 1 premium contract based on
  // a random existing generated contract template
  if (hasPremiumContractAccess(state.reputation) && newContracts.length > 0) {
    const baseIndex = rng.nextInt(0, newContracts.length - 1);
    const base = newContracts[baseIndex];
    const premium = makePremiumContract(base);
    newContracts.push(premium);
  }

  return newContracts;
}

/**
 * Expire old available contracts (called each turn).
 * Available contracts that have been around for 3+ turns expire.
 */
export function expireAvailableContracts(
  contracts: Contract[],
  currentTurn: number,
): Contract[] {
  return contracts.map((c) => {
    if (c.status !== ContractStatus.Available) return c;
    // Available contracts expire after they've been offered for a few turns
    // We use the contract id to encode the creation turn
    const creationTurn = getContractCreationTurn(c.id);
    if (currentTurn - creationTurn >= 3) {
      return { ...c, status: ContractStatus.Expired };
    }
    return c;
  });
}

// ---------------------------------------------------------------------------
// Internal Generators
// ---------------------------------------------------------------------------

function tryGenerateEmpireUnlock(
  state: GameState,
  rng: SeededRNG,
): Contract | null {
  const { systems, planets, empires } = state.galaxy;

  // Find locked empires adjacent to any unlocked empire
  const lockedEmpireIds = empires
    .filter((e) => !state.unlockedEmpireIds.includes(e.id))
    .map((e) => e.id);

  if (lockedEmpireIds.length === 0) return null;

  // Check cooldowns: skip empires that recently had a failed contract
  const failedContracts = state.contracts.filter(
    (c) =>
      c.type === CT.EmpireUnlock &&
      c.status === ContractStatus.Failed &&
      c.targetEmpireId,
  );

  const eligibleLocked = lockedEmpireIds.filter((empireId) => {
    // Skip if already has an available/active unlock contract
    const hasExisting = state.contracts.some(
      (c) =>
        c.type === CT.EmpireUnlock &&
        c.targetEmpireId === empireId &&
        (c.status === ContractStatus.Available ||
          c.status === ContractStatus.Active),
    );
    if (hasExisting) return false;

    // Check cooldown from failed attempts
    const lastFail = failedContracts.find((c) => c.targetEmpireId === empireId);
    if (lastFail) {
      const failTurn = getContractCreationTurn(lastFail.id);
      if (state.turn - failTurn < CONTRACT_FAILURE_COOLDOWN_TURNS) {
        return false;
      }
    }

    return true;
  });

  if (eligibleLocked.length === 0) return null;

  // Pick a random locked empire
  const targetEmpireId =
    eligibleLocked[rng.nextInt(0, eligibleLocked.length - 1)];

  // Find origin planet in player's empire and destination in locked empire
  const playerPlanets = planets.filter((p) => {
    const eId = getEmpireForPlanet(p.id, systems, planets);
    return eId === state.playerEmpireId;
  });
  const targetPlanets = planets.filter((p) => {
    const eId = getEmpireForPlanet(p.id, systems, planets);
    return eId === targetEmpireId;
  });

  if (playerPlanets.length === 0 || targetPlanets.length === 0) return null;

  const origin = playerPlanets[rng.nextInt(0, playerPlanets.length - 1)];
  const dest = targetPlanets[rng.nextInt(0, targetPlanets.length - 1)];

  // Empire unlock contracts use a non-passenger cargo type
  const cargoOptions = Object.values(CargoTypeEnum).filter(
    (c) => c !== "passengers",
  ) as CargoType[];
  const cargoType = cargoOptions[rng.nextInt(0, cargoOptions.length - 1)];

  const duration = rng.nextInt(4, 6);

  return {
    id: makeContractId(state.turn, "empireUnlock"),
    type: CT.EmpireUnlock,
    targetEmpireId,
    originPlanetId: origin.id,
    destinationPlanetId: dest.id,
    cargoType,
    durationTurns: duration,
    turnsRemaining: duration,
    rewardCash: 0,
    rewardReputation: 5,
    rewardResearchPoints: 3,
    rewardTariffReduction: null,
    // Empire-unlock contracts open a brand-new cross-empire trade lane —
    // the slot bonus lands in the galactic pool, not the empire pool.
    rewardSlotBonus: { scope: "galactic", amount: 1 },
    depositPaid: 0,
    status: ContractStatus.Available,
    linkedRouteId: null,
    turnsWithoutShip: 0,
  };
}

function generateRandomContract(
  state: GameState,
  rng: SeededRNG,
): Contract | null {
  const { systems, planets } = state.galaxy;

  // Weighted contract type selection (excluding empire unlock)
  const types: Array<{ type: ContractType; weight: number }> = [
    { type: CT.PassengerFerry, weight: 30 },
    { type: CT.EmergencySupply, weight: 25 },
    { type: CT.TradeAlliance, weight: 25 },
    { type: CT.ResearchCourier, weight: 20 },
  ];

  const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
  let roll = rng.nextFloat(0, 1) * totalWeight;
  let contractType: ContractType = CT.PassengerFerry;
  for (const t of types) {
    roll -= t.weight;
    if (roll <= 0) {
      contractType = t.type;
      break;
    }
  }

  // Get accessible planets
  const accessiblePlanets = planets.filter((p) => {
    const eId = getEmpireForPlanet(p.id, systems, planets);
    return eId && state.unlockedEmpireIds.includes(eId);
  });

  if (accessiblePlanets.length < 2) return null;

  const origin =
    accessiblePlanets[rng.nextInt(0, accessiblePlanets.length - 1)];
  let dest: Planet;
  let attempts = 0;
  do {
    dest = accessiblePlanets[rng.nextInt(0, accessiblePlanets.length - 1)];
    attempts++;
  } while (dest.id === origin.id && attempts < 10);
  if (dest.id === origin.id) return null;

  const originEmpireId = getEmpireForPlanet(origin.id, systems, planets);
  const destEmpireId = getEmpireForPlanet(dest.id, systems, planets);

  switch (contractType) {
    case CT.PassengerFerry:
      return makePassengerFerry(state.turn, origin, dest, rng);
    case CT.EmergencySupply:
      return makeEmergencySupply(state.turn, origin, dest, rng);
    case CT.TradeAlliance:
      if (originEmpireId && destEmpireId && originEmpireId !== destEmpireId) {
        return makeTradeAlliance(
          state.turn,
          origin,
          dest,
          originEmpireId,
          destEmpireId,
          rng,
        );
      }
      // Fall through to emergency supply if same empire
      return makeEmergencySupply(state.turn, origin, dest, rng);
    case CT.ResearchCourier:
      return makeResearchCourier(state.turn, origin, dest, rng);
    default:
      return null;
  }
}

function makePassengerFerry(
  turn: number,
  origin: Planet,
  dest: Planet,
  rng: SeededRNG,
): Contract {
  const duration = rng.nextInt(3, 4);
  const rewardCash = rng.nextInt(15, 30) * 1000;
  return {
    id: makeContractId(turn, "passengerFerry"),
    type: CT.PassengerFerry,
    targetEmpireId: null,
    originPlanetId: origin.id,
    destinationPlanetId: dest.id,
    cargoType: "passengers",
    durationTurns: duration,
    turnsRemaining: duration,
    rewardCash,
    rewardReputation: 0,
    rewardResearchPoints: 2,
    rewardTariffReduction: null,
    // Standing passenger lanes expand the empire-tier network capacity.
    rewardSlotBonus: { scope: "empire", amount: 1 },
    depositPaid: Math.round(rewardCash * 0.15),
    status: ContractStatus.Available,
    linkedRouteId: null,
    turnsWithoutShip: 0,
  };
}

function makeEmergencySupply(
  turn: number,
  origin: Planet,
  dest: Planet,
  rng: SeededRNG,
): Contract {
  const cargoOptions = Object.values(CargoTypeEnum).filter(
    (c) => c !== "passengers",
  ) as CargoType[];
  const cargoType = cargoOptions[rng.nextInt(0, cargoOptions.length - 1)];
  const duration = rng.nextInt(2, 3);
  const rewardCash = rng.nextInt(20, 50) * 1000;
  return {
    id: makeContractId(turn, "emergencySupply"),
    type: CT.EmergencySupply,
    targetEmpireId: null,
    originPlanetId: origin.id,
    destinationPlanetId: dest.id,
    cargoType,
    durationTurns: duration,
    turnsRemaining: duration,
    rewardCash,
    rewardReputation: 3,
    rewardResearchPoints: 1,
    rewardTariffReduction: null,
    depositPaid: Math.round(rewardCash * 0.1),
    status: ContractStatus.Available,
    linkedRouteId: null,
    turnsWithoutShip: 0,
  };
}

function makeTradeAlliance(
  turn: number,
  origin: Planet,
  dest: Planet,
  originEmpireId: string,
  destEmpireId: string,
  rng: SeededRNG,
): Contract {
  const cargoOptions = Object.values(CargoTypeEnum).filter(
    (c) => c !== "passengers",
  ) as CargoType[];
  const cargoType = cargoOptions[rng.nextInt(0, cargoOptions.length - 1)];
  const duration = rng.nextInt(4, 5);
  return {
    id: makeContractId(turn, "tradeAlliance"),
    type: CT.TradeAlliance,
    targetEmpireId: null,
    originPlanetId: origin.id,
    destinationPlanetId: dest.id,
    cargoType,
    durationTurns: duration,
    turnsRemaining: duration,
    rewardCash: 0,
    rewardReputation: 0,
    rewardResearchPoints: 2,
    rewardTariffReduction: {
      empireA: originEmpireId,
      empireB: destEmpireId,
      reduction: 0.5,
    },
    // Trade-alliance contracts formalize a cross-empire lane; reward a
    // permanent galactic slot on top of the tariff reduction.
    rewardSlotBonus: { scope: "galactic", amount: 1 },
    depositPaid: 5000,
    status: ContractStatus.Available,
    linkedRouteId: null,
    turnsWithoutShip: 0,
  };
}

function makeResearchCourier(
  turn: number,
  origin: Planet,
  dest: Planet,
  rng: SeededRNG,
): Contract {
  const cargoOptions: CargoType[] = ["technology", "medical"];
  const cargoType = cargoOptions[rng.nextInt(0, cargoOptions.length - 1)];
  const duration = rng.nextInt(3, 4);
  return {
    id: makeContractId(turn, "researchCourier"),
    type: CT.ResearchCourier,
    targetEmpireId: null,
    originPlanetId: origin.id,
    destinationPlanetId: dest.id,
    cargoType,
    durationTurns: duration,
    turnsRemaining: duration,
    rewardCash: 0,
    rewardReputation: 0,
    rewardResearchPoints: 5,
    rewardTariffReduction: null,
    depositPaid: 3000,
    status: ContractStatus.Available,
    linkedRouteId: null,
    turnsWithoutShip: 0,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContractId(turn: number, typePrefix: string): string {
  return `contract-${typePrefix}-t${turn}-${Math.random().toString(36).slice(2, 8)}`;
}

function getContractCreationTurn(contractId: string): number {
  // Parse turn from id format: contract-{type}-t{turn}-{rand}
  const match = contractId.match(/t(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}
